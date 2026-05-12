"""
API v1 라우터
"""
from fastapi import APIRouter

from .analyze import router as analyze_router
from .health import router as health_router
from .auth import router as auth_router
from .shipments import router as shipments_router
from .dashboard import router as dashboard_router

router = APIRouter()

router.include_router(health_router)
router.include_router(analyze_router)
router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(shipments_router, tags=["shipments"])
router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])

__all__ = ["router"]
