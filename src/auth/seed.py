"""
DB 테이블 생성 + 초기 사용자 시드
"""
import os
import sqlite3
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from src.database import engine, Base, SessionLocal
from src.models.user import User
from src.models.shipment import Shipment


def _migrate_db_if_needed():
    """스키마 변경 시 DB 재생성 (개발 환경 전용)"""
    db_path = "semi_regulaw.db"
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(shipments)")
    columns = [row[1] for row in cursor.fetchall()]
    conn.close()
    if columns and ("legal_approved_by" not in columns or "created_by" not in columns):
        os.remove(db_path)
        print("[DB] 스키마 변경 감지: 데이터베이스를 재생성합니다.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {"username": "admin",           "password": "admin123",      "department": "admin",     "tenant_id": "demo-company"},
    {"username": "sales_user",      "password": "sales123",      "department": "영업부",    "tenant_id": "demo-company"},
    {"username": "logistics_user",  "password": "logistics123",  "department": "로지스틱부", "tenant_id": "demo-company"},
    {"username": "legal_user",      "password": "legal123",      "department": "법률지원부", "tenant_id": "demo-company"},
    {"username": "mgmt_user",       "password": "mgmt123",       "department": "경영관리부", "tenant_id": "demo-company"},
]


def init_db():
    _migrate_db_if_needed()
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        for u in DEMO_USERS:
            if not db.query(User).filter_by(username=u["username"]).first():
                db.add(User(
                    username=u["username"],
                    password_hash=pwd_context.hash(u["password"]),
                    department=u["department"],
                    tenant_id=u["tenant_id"],
                ))
        db.commit()
    finally:
        db.close()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
