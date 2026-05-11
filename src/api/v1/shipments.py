"""
출하 워크플로우 엔드포인트 (영업부 ↔ 로지스틱부)
"""
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.shipment import Shipment
from src.auth.rbac import require_permission

router = APIRouter()


class ShipmentCreate(BaseModel):
    item_name: str
    quantity: int
    destination: str
    analysis_id: Optional[str] = None


class LogisticsDoneRequest(BaseModel):
    result: str


def _shipment_to_dict(s: Shipment) -> dict:
    return {
        "id": s.id,
        "tenant_id": s.tenant_id,
        "item_name": s.item_name,
        "quantity": s.quantity,
        "destination": s.destination,
        "analysis_id": s.analysis_id,
        "status": s.status,
        "sales_approved_by": s.sales_approved_by,
        "sales_approved_at": s.sales_approved_at.isoformat() if s.sales_approved_at else None,
        "logistics_result": s.logistics_result,
        "logistics_done_by": s.logistics_done_by,
        "logistics_done_at": s.logistics_done_at.isoformat() if s.logistics_done_at else None,
        "final_approved_by": s.final_approved_by,
        "final_approved_at": s.final_approved_at.isoformat() if s.final_approved_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.post("/shipments", response_model=dict)
def create_shipment(
    body: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("can_shipment")),
):
    """영업부: 출하 요청 생성 (PENDING 상태)"""
    if current_user.get("department") not in ("영업부", "admin"):
        raise HTTPException(status_code=403, detail="출하 요청은 영업부만 생성할 수 있습니다.")

    shipment = Shipment(
        id=str(uuid.uuid4()),
        tenant_id=current_user["tenant_id"],
        item_name=body.item_name,
        quantity=body.quantity,
        destination=body.destination,
        analysis_id=body.analysis_id,
        status="PENDING",
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return _shipment_to_dict(shipment)


@router.get("/shipments", response_model=List[dict])
def list_shipments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("can_shipment")),
):
    """영업부 + 로지스틱부: 출하 목록 조회"""
    shipments = db.query(Shipment).filter_by(tenant_id=current_user["tenant_id"]).order_by(Shipment.created_at.desc()).all()
    return [_shipment_to_dict(s) for s in shipments]


@router.patch("/shipments/{shipment_id}/approve", response_model=dict)
def approve_shipment(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("can_shipment")),
):
    """영업부: 출하 승인 (PENDING → SALES_APPROVED)"""
    if current_user.get("department") not in ("영업부", "admin"):
        raise HTTPException(status_code=403, detail="출하 승인은 영업부만 실행할 수 있습니다.")

    s = db.query(Shipment).filter_by(id=shipment_id, tenant_id=current_user["tenant_id"]).first()
    if not s:
        raise HTTPException(status_code=404, detail="출하 정보를 찾을 수 없습니다.")
    if s.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"현재 상태({s.status})에서는 출하 승인이 불가합니다.")

    s.status = "SALES_APPROVED"
    s.sales_approved_by = current_user["sub"]
    s.sales_approved_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return _shipment_to_dict(s)


@router.patch("/shipments/{shipment_id}/logistics-done", response_model=dict)
def logistics_done(
    shipment_id: str,
    body: LogisticsDoneRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("can_shipment")),
):
    """로지스틱부: 선적 완료 보고 (SALES_APPROVED → LOGISTICS_DONE)"""
    if current_user.get("department") not in ("로지스틱부", "admin"):
        raise HTTPException(status_code=403, detail="선적 완료 보고는 로지스틱부만 실행할 수 있습니다.")

    s = db.query(Shipment).filter_by(id=shipment_id, tenant_id=current_user["tenant_id"]).first()
    if not s:
        raise HTTPException(status_code=404, detail="출하 정보를 찾을 수 없습니다.")
    if s.status != "SALES_APPROVED":
        raise HTTPException(status_code=400, detail=f"영업부 승인 후 선적 완료 보고가 가능합니다. (현재: {s.status})")

    s.status = "LOGISTICS_DONE"
    s.logistics_result = body.result
    s.logistics_done_by = current_user["sub"]
    s.logistics_done_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return _shipment_to_dict(s)


@router.patch("/shipments/{shipment_id}/final-approve", response_model=dict)
def final_approve(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("can_shipment")),
):
    """영업부: 최종 확인 승인 (LOGISTICS_DONE → FINAL_APPROVED)"""
    if current_user.get("department") not in ("영업부", "admin"):
        raise HTTPException(status_code=403, detail="최종 확인은 영업부만 실행할 수 있습니다.")

    s = db.query(Shipment).filter_by(id=shipment_id, tenant_id=current_user["tenant_id"]).first()
    if not s:
        raise HTTPException(status_code=404, detail="출하 정보를 찾을 수 없습니다.")
    if s.status != "LOGISTICS_DONE":
        raise HTTPException(status_code=400, detail=f"로지스틱부 완료 보고 후 최종 확인이 가능합니다. (현재: {s.status})")

    s.status = "FINAL_APPROVED"
    s.final_approved_by = current_user["sub"]
    s.final_approved_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return _shipment_to_dict(s)
