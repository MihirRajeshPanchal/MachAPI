"""
AI service — builds a Gemini LLM on-the-fly using the endpoint's stored API key,
and drives structured output via a Pydantic model generated from the output JSON Schema.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from enum import Enum

from pydantic import BaseModel, Field, create_model
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain.output_parsers import OutputFixingParser

from backend.constants.config import DYNAMIC_ENDPOINT_PROMPT_TEMPLATE
from backend.models.endpoint_model import EndpointConfig

logger = logging.getLogger(__name__)


# ── JSON Schema → Pydantic model ───────────────────────────────────────────────
# Source - https://stackoverflow.com/a/79431514
# Posted by Corey McCrea, modified by community. See post 'Timeline' for change history
# Retrieved 2026-04-19, License - CC BY-SA 4.0

def json_schema_to_base_model(schema: dict[str, Any]) -> type[BaseModel]:
    type_mapping: dict[str, type] = {
        "string": str,
        "integer": int,
        "number": float,
        "boolean": bool,
        "array": list,
        "object": dict,
    }
    properties = schema.get("properties", {})
    required_fields = schema.get("required", [])
    model_fields: dict[str, Any] = {}

    def process_field(field_name: str, field_props: dict[str, Any]) -> tuple:
        json_type = field_props.get("type", "string")
        enum_values = field_props.get("enum")

        if enum_values:
            enum_name = f"{field_name.capitalize()}Enum"
            field_type = Enum(enum_name, {v: v for v in enum_values})
        elif json_type == "object" and "properties" in field_props:
            field_type = json_schema_to_base_model(field_props)
        elif json_type == "array" and "items" in field_props:
            item_props = field_props["items"]
            if item_props.get("type") == "object":
                item_type: type = json_schema_to_base_model(item_props)
            else:
                item_type = type_mapping.get(item_props.get("type"), Any)
            field_type = list[item_type]
        else:
            field_type = type_mapping.get(json_type, Any)

        default_value = field_props.get("default", ...)
        nullable = field_props.get("nullable", False)
        description = field_props.get("title", "")

        if nullable:
            field_type = Optional[field_type]
        if field_name not in required_fields:
            default_value = field_props.get("default", None)

        return field_type, Field(default_value, description=description)

    for field_name, field_props in properties.items():
        model_fields[field_name] = process_field(field_name, field_props)

    return create_model(schema.get("title", "DynamicModel"), **model_fields)


# ── LLM factory ───────────────────────────────────────────────────────────────

def _build_llm(api_key: str) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model="gemma-3-27b-it",
        google_api_key=api_key,
        temperature=0.3,
    )


# ── Input block helper ─────────────────────────────────────────────────────────

def _build_inputs_block(inputs: Dict[str, Any]) -> str:
    return "\n".join(f"  {k}: {v}" for k, v in inputs.items())


# ── Main service function ──────────────────────────────────────────────────────

def run_dynamic_endpoint(config: EndpointConfig, inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes the AI chain for a registered dynamic endpoint.

    Steps:
      1. Build a Pydantic model from the endpoint's JSON Schema.
      2. Render the prompt template.
      3. Invoke Gemini (using the per-user API key) with JSON output fixing.
      4. Return the parsed dict.
    """
    # Build output model and embed its schema in the prompt so the LLM knows the shape
    output_model = json_schema_to_base_model(config.output_schema)
    output_schema_for_prompt = config.output_schema  # raw JSON Schema shown to model

    inputs_block = _build_inputs_block(inputs)

    import json
    filled_prompt = DYNAMIC_ENDPOINT_PROMPT_TEMPLATE.format(
        user_prompt=config.ai_prompt,
        inputs=inputs_block,
        output_schema=json.dumps(output_schema_for_prompt, indent=2),
    )

    logger.debug("Running AI chain for endpoint: %s/%s", config.username, config.endpoint_name)

    llm = _build_llm(config.gemini_api_key)

    prompt = PromptTemplate.from_template("{filled_prompt}")
    parser = JsonOutputParser(pydantic_object=output_model)
    fixing_parser = OutputFixingParser.from_llm(parser=parser, llm=llm)
    chain = prompt | llm | fixing_parser

    result: Dict[str, Any] = chain.invoke({"filled_prompt": filled_prompt})

    # If result came back as a Pydantic model instance, convert to dict
    if isinstance(result, BaseModel):
        result = result.model_dump()

    logger.info("AI chain completed for endpoint: %s/%s", config.username, config.endpoint_name)
    return result