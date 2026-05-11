"""
멀티테넌시 미들웨어 - X-Tenant-ID 헤더 검증
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class TenantMiddleware(BaseHTTPMiddleware):
    """
    모든 요청에서 X-Tenant-ID 헤더를 검증하는 미들웨어
    """

    async def dispatch(self, request: Request, call_next):
        """
        요청 처리 전에 X-Tenant-ID 헤더 검증
        """

        # 헬스체크, 정적 파일, 프론트엔드는 테넌트 검증 제외
        exempt_paths = [
            "/health",
            "/api/v1/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico",
            "/"  # 프론트엔드 메인 페이지
        ]
        if request.url.path in exempt_paths or request.url.path.startswith("/frontend"):
            return await call_next(request)

        # X-Tenant-ID 헤더 확인
        tenant_id = request.headers.get("X-Tenant-ID")

        if not tenant_id:
            raise HTTPException(
                status_code=400,
                detail="X-Tenant-ID 헤더가 필요합니다. (예: X-Tenant-ID: demo-company)",
            )

        # 요청 상태에 tenant_id 추가 (나중에 접근 가능)
        request.state.tenant_id = tenant_id

        # 응답 헤더에도 tenant_id 추가 (추적용)
        response = await call_next(request)
        response.headers["X-Tenant-ID"] = tenant_id

        return response
