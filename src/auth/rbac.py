"""
역할 기반 접근 제어 (RBAC)
"""
from fastapi import HTTPException, Header
from typing import Optional
from src.auth.jwt import decode_token

PERMISSIONS = {
    "영업부": {
        "can_analyze": True,
        "can_view": True,
        "can_shipment": True,   # 출하 요청 생성 + 조회
        "can_approve": False,   # 승인은 법률지원부 담당
        "can_dashboard": True,
        "is_admin": False,
    },
    "로지스틱부": {
        "can_analyze": False,
        "can_view": True,
        "can_shipment": True,   # 출하 목록 조회 + 선적 완료 보고
        "can_approve": False,
        "can_dashboard": True,
        "is_admin": False,
    },
    "법률지원부": {
        "can_analyze": True,
        "can_view": True,
        "can_shipment": True,   # 출하 목록 조회 + 컴플라이언스 처리
        "can_approve": True,    # 컴플라이언스 승인/반려 + 사후 감사
        "can_dashboard": True,
        "is_admin": False,
    },
    "경영관리부": {
        "can_analyze": False,
        "can_view": True,
        "can_shipment": False,
        "can_approve": False,
        "can_dashboard": True,  # 전체 현황 대시보드
        "is_admin": False,
    },
    "admin": {
        "can_analyze": True,
        "can_view": True,
        "can_shipment": True,
        "can_approve": True,
        "can_dashboard": True,
        "is_admin": True,
    },
}


def get_permissions(department: str) -> dict:
    return PERMISSIONS.get(department, {"can_analyze": False, "can_view": False, "can_shipment": False, "can_approve": False, "can_dashboard": False, "is_admin": False})


def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """JWT에서 현재 사용자 정보 추출 (FastAPI Depends용)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return payload


def require_permission(permission: str):
    """특정 권한을 요구하는 FastAPI Depends 팩토리"""
    def checker(authorization: Optional[str] = Header(default=None)) -> dict:
        user = get_current_user(authorization)
        perms = get_permissions(user.get("department", ""))
        if not perms.get(permission):
            raise HTTPException(
                status_code=403,
                detail=f"{user.get('department', '')} 부서는 해당 기능에 접근 권한이 없습니다.",
            )
        user["permissions"] = perms
        return user
    return checker
