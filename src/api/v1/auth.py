"""
인증 엔드포인트 (로그인 / 사용자 정보)
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.user import User
from src.auth.seed import verify_password
from src.auth.jwt import create_access_token
from src.auth.rbac import get_permissions, get_current_user

router = APIRouter()


class LoginRequest(BaseModel):
    tenant_id: str
    department: str
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    permissions: dict


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(
        username=body.username,
        tenant_id=body.tenant_id,
        department=body.department,
    ).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="아이디, 비밀번호 또는 부서 정보가 올바르지 않습니다.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 계정입니다.")

    perms = get_permissions(user.department)
    token = create_access_token({
        "sub": user.username,
        "tenant_id": user.tenant_id,
        "department": user.department,
        "permissions": perms,
    })

    return LoginResponse(
        access_token=token,
        user={"username": user.username, "department": user.department, "tenant_id": user.tenant_id},
        permissions=perms,
    )


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user.get("sub"),
        "department": current_user.get("department"),
        "tenant_id": current_user.get("tenant_id"),
        "permissions": get_permissions(current_user.get("department", "")),
    }
