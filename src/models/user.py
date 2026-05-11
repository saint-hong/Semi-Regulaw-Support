"""
User SQLAlchemy 모델
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from src.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    tenant_id = Column(String, nullable=False, index=True)
    department = Column(String, nullable=False)
    # department 허용값: 영업부 | 로지스틱부 | 법률지원부 | 경영관리부 | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
