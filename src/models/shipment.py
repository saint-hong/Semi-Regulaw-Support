"""
Shipment SQLAlchemy 모델 (출하 워크플로우)
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

    # 상태: PENDING → SALES_APPROVED → LOGISTICS_DONE → FINAL_APPROVED
    status = Column(String, default="PENDING", nullable=False)

    sales_approved_by = Column(String, nullable=True)
    sales_approved_at = Column(DateTime, nullable=True)

    logistics_result = Column(String, nullable=True)
    logistics_done_by = Column(String, nullable=True)
    logistics_done_at = Column(DateTime, nullable=True)

    final_approved_by = Column(String, nullable=True)
    final_approved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
