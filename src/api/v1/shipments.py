"""
출하 워크플로우 엔드포인트
PENDING → LEGAL_APPROVED/LEGAL_REJECTED → LOGISTICS_DONE → AUDIT_COMPLETE
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


class RejectRequest(BaseModel):
    reason: str


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
        "legal_approved_by": s.legal_approved_by,
        "legal_approved_at": s.legal_approved_at.isoformat() if s.legal_approved_at else None,
        "legal_rejected_reason": s.legal_rejected_reason,
        "logistics_result": s.logistics_result,
        "logistics_done_by": s.logistics_done_by,
        "logistics_done_at": s.logistics_done_at.isoformat() if s.logistics_done_at else None,
        "audit_done_by": s.audit_done_by,
        "audit_done_at": s.audit_done_at.isoformat() if s.audit_done_at else None,
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
        created_by=current_user["sub"],
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
    """출하 목록 조회 (영업부, 로지스틱부, 법률지원부, admin)"""
    shipments = db.query(Shipment).filter_by(tenant_id=current_user["tenant_id"]).order_by(Shipment.created_at.desc()).all()
    return [_shipment_to_dict(s) for s in shipments]


@router.patch("/shipments/{shipment_id}/approve", response_model=dict)
def approve_shipment(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("can_approve")),
):
    """법률지원부: 컴플라이언스 승인 (PENDING → LEGAL_APPROVED)"""
    if current_user.get("department") not in ("법률지원부", "admin"):
        raise HTTPException(status_code=403, detail="컴플라이언스 승인은 법률지원부만 실행할 수 있습니다.")

    s = db.query(Shipment).filter_by(id=shipment_id, tenant_id=current_user["tenant_id"]).first()
    if not s:
        raise HTTPException(status_code=404, detail="출하 정보를 찾을 수 없습니다.")
    if s.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"대기 중 상태에서만 승인이 가능합니다. (현재: {s.status})")

    s.status = "LEGAL_APPROVED"
    s.legal_approved_by = current_user["sub"]
    s.legal_approved_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return _shipment_to_dict(s)


@router.patch("/shipments/{shipment_id}/reject", response_model=dict)
def reject_shipment(
    shipment_id: str,
    body: RejectRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("can_approve")),
):
    """법률지원부: 컴플라이언스 반려 (PENDING → LEGAL_REJECTED)"""
    if current_user.get("department") not in ("법률지원부", "admin"):
        raise HTTPException(status_code=403, detail="컴플라이언스 반려는 법률지원부만 실행할 수 있습니다.")

    s = db.query(Shipment).filter_by(id=shipment_id, tenant_id=current_user["tenant_id"]).first()
    if not s:
        raise HTTPException(status_code=404, detail="출하 정보를 찾을 수 없습니다.")
    if s.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"대기 중 상태에서만 반려가 가능합니다. (현재: {s.status})")

    s.status = "LEGAL_REJECTED"
    s.legal_approved_by = current_user["sub"]
    s.legal_approved_at = datetime.utcnow()
    s.legal_rejected_reason = body.reason
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
    """로지스틱부: 선적 완료 보고 (LEGAL_APPROVED → LOGISTICS_DONE)"""
    if current_user.get("department") not in ("로지스틱부", "admin"):
        raise HTTPException(status_code=403, detail="선적 완료 보고는 로지스틱부만 실행할 수 있습니다.")

    s = db.query(Shipment).filter_by(id=shipment_id, tenant_id=current_user["tenant_id"]).first()
    if not s:
        raise HTTPException(status_code=404, detail="출하 정보를 찾을 수 없습니다.")
    if s.status != "LEGAL_APPROVED":
        raise HTTPException(status_code=400, detail=f"법률지원부 승인 후 선적 완료 보고가 가능합니다. (현재: {s.status})")

    s.status = "LOGISTICS_DONE"
    s.logistics_result = body.result
    s.logistics_done_by = current_user["sub"]
    s.logistics_done_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return _shipment_to_dict(s)


@router.patch("/shipments/{shipment_id}/audit-complete", response_model=dict)
def audit_complete(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("can_approve")),
):
    """법률지원부: 사후 감사 완료 (LOGISTICS_DONE → AUDIT_COMPLETE)"""
    if current_user.get("department") not in ("법률지원부", "admin"):
        raise HTTPException(status_code=403, detail="사후 감사 완료는 법률지원부만 실행할 수 있습니다.")

    s = db.query(Shipment).filter_by(id=shipment_id, tenant_id=current_user["tenant_id"]).first()
    if not s:
        raise HTTPException(status_code=404, detail="출하 정보를 찾을 수 없습니다.")
    if s.status != "LOGISTICS_DONE":
        raise HTTPException(status_code=400, detail=f"선적 완료 보고 후 감사 처리가 가능합니다. (현재: {s.status})")

    s.status = "AUDIT_COMPLETE"
    s.audit_done_by = current_user["sub"]
    s.audit_done_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return _shipment_to_dict(s)
