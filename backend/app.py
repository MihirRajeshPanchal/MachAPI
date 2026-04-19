import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.endpoints.management import router as management_router
from backend.endpoints.dynamic import router as dynamic_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(
    title="BlazeAPI — Dynamic AI Endpoint Builder",
    description=(
        "Register custom AI-powered endpoints at runtime. "
        "Each endpoint is namespaced by username: `/{username}/{endpoint_name}`. "
        "Endpoints and user API keys are persisted in SQLite so they survive restarts."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(management_router)
app.include_router(dynamic_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "running",
        "docs": "/docs",
        "usage": {
            "store_api_key":     "POST /users/api-key",
            "register_endpoint": "POST /register",
            "call_endpoint":     "POST /{username}/{endpoint_name}",
            "list_endpoints":    "GET  /list",
            "delete_endpoint":   "DELETE /{username}/{endpoint_name}",
        },
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}