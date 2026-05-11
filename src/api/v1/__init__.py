"""
API v1 라우터
"""
from fastapi import APIRouter

from .analyze import router as analyze_router
from .health import router as health_router

router = APIRouter()

# 라우터 등록
router.include_router(health_router)
router.include_router(analyze_router)

__all__ = ["router"]
