from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Input field descriptor (unchanged) ────────────────────────────────────────

class InputField(BaseModel):
    name: str = Field(..., description="Field name used as key in request body")
    label: str = Field(..., description="Human-readable label")
    type: str = Field(default="string", description="Data type: string, number, array, boolean")
    required: bool = Field(default=True)
    description: Optional[str] = None


# ── Endpoint config (stored & returned) ───────────────────────────────────────

class EndpointConfig(BaseModel):
    endpoint_name: str
    username: str
    input_fields: List[InputField]
    # ↓ NEW: full JSON Schema object, e.g.
    # {
    #   "title": "SentimentResult",
    #   "type": "object",
    #   "required": ["sentiment", "confidence"],
    #   "properties": {
    #     "sentiment": {"type": "string", "enum": ["positive","negative","neutral"]},
    #     "confidence": {"type": "number"}
    #   }
    # }
    output_schema: Dict[str, Any] = Field(
        ...,
        description="A JSON Schema object describing the expected AI output structure.",
    )
    ai_prompt: str
    description: Optional[str] = None
    gemini_api_key: str = Field(..., description="Gemini API key for this user")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EndpointConfigCreate(BaseModel):
    endpoint_name: str
    username: str
    input_fields: List[InputField]
    output_schema: Dict[str, Any] = Field(
        ...,
        description="JSON Schema object for the desired AI output.",
    )
    ai_prompt: str
    description: Optional[str] = None
    # Optional here — can also be stored at the user level via POST /users/api-key
    gemini_api_key: Optional[str] = Field(
        default=None,
        description=(
            "Gemini API key. If omitted, the key previously stored for this username is used."
        ),
    )


# ── Request / Response ─────────────────────────────────────────────────────────

class DynamicRequest(BaseModel):
    inputs: Dict[str, Any] = Field(
        ..., description="Key-value pairs matching the endpoint's input_fields"
    )


class DynamicResponse(BaseModel):
    endpoint: str
    username: str
    result: Dict[str, Any]
    success: bool = True


# ── List item (no secrets exposed) ────────────────────────────────────────────

class EndpointListItem(BaseModel):
    endpoint_name: str
    username: str
    description: Optional[str]
    input_fields: List[str]
    output_schema: Dict[str, Any]
    created_at: datetime


# ── User API-key management ────────────────────────────────────────────────────

class UserApiKeyPayload(BaseModel):
    username: str
    gemini_api_key: str