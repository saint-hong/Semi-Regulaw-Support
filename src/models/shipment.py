"""
Shipment SQLAlchemy 모델 (출하 워크플로우)
워크플로우: PENDING → LEGAL_APPROVED/LEGAL_REJECTED → LOGISTICS_DONE → AUDIT_COMPLETE
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from src.database import Base


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False, index=True)
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    destination = Column(String, nullable=False)
    analysis_id = Column(String, nullable=True)
    created_by = Column(String, nullable=True)

    status = Column(String, default="PENDING", nullable=False)

    # 법률지원부: 컴플라이언스 1차 검토
    legal_approved_by = Column(String, nullable=True)
    legal_approved_at = Column(DateTime, nullable=True)
    legal_rejected_reason = Column(String, nullable=True)

    # 로지스틱부: 선적 실행
    logistics_result = Column(String, nullable=True)
    logistics_done_by = Column(String, nullable=True)
    logistics_done_at = Column(DateTime, nullable=True)

    # 법률지원부: 사후 감사
    audit_done_by = Column(String, nullable=True)
    audit_done_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
