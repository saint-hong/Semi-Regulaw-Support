"""
Semi-Regulaw Support - FastAPI 애플리케이션
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from src.config import get_settings
from src.middleware.tenant import TenantMiddleware
from src.api.v1 import router as api_v1_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-Native 반도체 수출통제 대응 에이전트",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TenantMiddleware)

app.include_router(api_v1_router, prefix="/api/v1", tags=["v1"])


@app.on_event("startup")
async def startup():
    from src.auth.seed import init_db
    init_db()


@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse("frontend/index.html")


@app.get("/login", include_in_schema=False)
async def serve_login():
    return FileResponse("frontend/login.html")


app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
