"""
멀티테넌시 미들웨어 - X-Tenant-ID 헤더 또는 JWT에서 tenant_id 추출
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from src.auth.jwt import decode_token


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        exempt_paths = [
            "/health",
            "/api/v1/health",
            "/api/v1/auth/login",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico",
            "/",
            "/login",
        ]
        if request.url.path in exempt_paths or request.url.path.startswith("/frontend"):
            return await call_next(request)

        # JWT에서 tenant_id 추출 (우선순위 높음)
        tenant_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            if payload:
                tenant_id = payload.get("tenant_id")

        # JWT가 없으면 X-Tenant-ID 헤더 fallback
        if not tenant_id:
            tenant_id = request.headers.get("X-Tenant-ID")

        if not tenant_id:
            return JSONResponse(
                status_code=401,
                content={"detail": "인증이 필요합니다. Authorization 헤더에 Bearer 토큰을 포함해주세요."},
            )

        request.state.tenant_id = tenant_id
        response = await call_next(request)
        response.headers["X-Tenant-ID"] = tenant_id
        return response
