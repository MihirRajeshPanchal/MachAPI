import logging

from fastapi import APIRouter, HTTPException

from backend.models.endpoint_model import DynamicRequest, DynamicResponse
from backend.services.registry_service import get_endpoint
from backend.services.ai_service import run_dynamic_endpoint

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Dynamic AI Endpoints"])


@router.post("/{username}/{endpoint_name}", response_model=DynamicResponse)
def call_dynamic_endpoint(username: str, endpoint_name: str, body: DynamicRequest):
    """
    Invoke a registered dynamic AI endpoint.

        POST /{username}/{endpoint_name}
        Body: { "inputs": { "field1": "value1", ... } }
    """
    config = get_endpoint(username, endpoint_name)
    if not config:
        raise HTTPException(
            status_code=404,
            detail=f"No endpoint registered at /{username}/{endpoint_name}. "
                   "Register it first via POST /register.",
        )

    required_fields = [f.name for f in config.input_fields if f.required]
    missing = [f for f in required_fields if f not in body.inputs]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing required input fields: {missing}")

    try:
        result = run_dynamic_endpoint(config=config, inputs=body.inputs)
    except Exception as exc:
        logger.exception("AI chain failed for /%s/%s", username, endpoint_name)
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(exc)}")

    return DynamicResponse(endpoint=endpoint_name, username=username, result=result, success=True)