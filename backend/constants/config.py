"""
Application-level constants and configuration.

Note: The Gemini LLM is NO LONGER a singleton here.
Each registered endpoint carries its own API key; the AI service builds
a per-request LLM instance from that key.
"""
import os
from dotenv import load_dotenv

load_dotenv()

DYNAMIC_ENDPOINT_PROMPT_TEMPLATE = """
You are an AI assistant. Use the following user-defined prompt as your instruction:

{user_prompt}

Here are the inputs provided:
{inputs}

Respond ONLY with a valid JSON object that strictly conforms to the JSON Schema below.
Do not include any explanation, markdown code fences, or extra text — raw JSON only.

Output JSON Schema:
{output_schema}
"""