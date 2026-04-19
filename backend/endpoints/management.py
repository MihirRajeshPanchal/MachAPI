import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from backend.models.endpoint_model import (
    EndpointConfigCreate,
    EndpointConfig,
    EndpointListItem,
    UserApiKeyPayload,
)
from backend.services.registry_service import (
    register_endpoint,
    list_endpoints,
    delete_endpoint,
    upsert_user_api_key,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Endpoint Management"])


# ── User API key management ────────────────────────────────────────────────────

@router.post("/users/api-key", status_code=204)
def set_user_api_key(payload: UserApiKeyPayload):
    """
    Store or update a Gemini API key for a username.
    Once set, subsequent endpoint registrations for that user do not need to
    include `gemini_api_key` in the request body.
    """
    upsert_user_api_key(payload.username, payload.gemini_api_key)


# ── Endpoint registration & management ────────────────────────────────────────

@router.post("/register", response_model=EndpointConfig, status_code=201)
def register(payload: EndpointConfigCreate):
    """
    Register a new dynamic AI endpoint.

    `output_schema` must be a valid JSON Schema object, e.g.:

    ```json
    {
      "title": "SentimentResult",
      "type": "object",
      "required": ["sentiment", "confidence"],
      "properties": {
        "sentiment": {
          "type": "string",
          "enum": ["positive", "negative", "neutral"]
        },
        "confidence": {"type": "number", "title": "Confidence score 0-1"}
      }
    }
    ```

    Once registered the endpoint is available at:  POST /{username}/{endpoint_name}
    """
    if not payload.endpoint_name.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(
            status_code=422,
            detail="endpoint_name must be alphanumeric (underscores and hyphens allowed).",
        )
    try:
        return register_endpoint(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/list", response_model=List[EndpointListItem])
def list_all(username: Optional[str] = Query(default=None, description="Filter by username")):
    """List all registered endpoints, optionally filtered by username."""
    configs = list_endpoints(username=username)
    return [
        EndpointListItem(
            endpoint_name=c.endpoint_name,
            username=c.username,
            description=c.description,
            input_fields=[f.name for f in c.input_fields],
            output_schema=c.output_schema,
            created_at=c.created_at,
        )
        for c in configs
    ]


@router.delete("/{username}/{endpoint_name}", status_code=204)
def delete(username: str, endpoint_name: str):
    """Delete a registered dynamic endpoint."""
    if not delete_endpoint(username, endpoint_name):
        raise HTTPException(status_code=404, detail="Endpoint not found.")