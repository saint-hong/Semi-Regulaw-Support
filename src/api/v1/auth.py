"""
인증 엔드포인트 (로그인 / 회원가입 / 사용자 정보)
"""
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from src.database import get_db
from src.models.user import User
from src.auth.seed import verify_password
from src.auth.jwt import create_access_token
from src.auth.rbac import get_permissions, get_current_user

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    # 프로토타입: username + password + department 로만 인증
    # 선택한 tenant_id는 JWT 컨텍스트에만 사용 (데모 계정이 모든 회사에서 동작)
    user = db.query(User).filter_by(
        username=body.username,
        department=body.department,
    ).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="아이디, 비밀번호 또는 부서 정보가 올바르지 않습니다.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 계정입니다.")

    perms = get_permissions(user.department)
    # 선택한 회사(tenant_id)를 JWT 컨텍스트로 사용
    active_tenant = body.tenant_id
    token = create_access_token({
        "sub": user.username,
        "tenant_id": active_tenant,
        "department": user.department,
        "permissions": perms,
    })

    return LoginResponse(
        access_token=token,
        user={"username": user.username, "department": user.department, "tenant_id": active_tenant},
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


VALID_DEPARTMENTS = {"영업부", "로지스틱부", "법률지원부", "경영관리부", "admin"}


class RegisterRequest(BaseModel):
    tenant_id: str
    department: str
    username: str
    password: str


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if body.department not in VALID_DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 부서입니다. ({', '.join(VALID_DEPARTMENTS)})")
    if len(body.username) < 3:
        raise HTTPException(status_code=400, detail="아이디는 3자 이상이어야 합니다.")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="비밀번호는 6자 이상이어야 합니다.")

    existing = db.query(User).filter_by(username=body.username, department=body.department).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.")

    new_user = User(
        id=str(uuid.uuid4()),
        username=body.username,
        password_hash=pwd_context.hash(body.password),
        tenant_id=body.tenant_id,
        department=body.department,
    )
    db.add(new_user)
    db.commit()
    return {"message": "회원가입이 완료되었습니다.", "username": body.username, "department": body.department}
