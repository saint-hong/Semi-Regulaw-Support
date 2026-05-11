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

# 설정 로드
settings = get_settings()

# FastAPI 앱 생성
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-Native 반도체 수출통제 대응 에이전트",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS 미들웨어 (개발용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 멀티테넌시 미들웨어
app.add_middleware(TenantMiddleware)

# API 라우터 등록
app.include_router(api_v1_router, prefix="/api/v1", tags=["v1"])


@app.get("/", include_in_schema=False)
async def serve_index():
    """프론트엔드 UI 서빙"""
    return FileResponse("frontend/index.html")


# 정적 파일 마운트 (HTML, CSS, JS)
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
