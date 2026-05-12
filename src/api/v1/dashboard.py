"""
대시보드 엔드포인트 (권한별 활동 현황 + AI 요약)
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from anthropic import Anthropic

from src.database import get_db
from src.models.shipment import Shipment
from src.auth.rbac import require_permission, get_current_user

router = APIRouter()

STATUS_LABELS = {
    "PENDING": "승인 대기",
    "LEGAL_APPROVED": "컴플라이언스 승인",
    "LEGAL_REJECTED": "반려",
    "LOGISTICS_DONE": "선적 완료",
    "AUDIT_COMPLETE": "감사 완료",
}


def _shipment_summary(s: Shipment) -> dict:
    return {
        "id": s.id,
        "item_name": s.item_name,
        "quantity": s.quantity,
        "destination": s.destination,
        "status": s.status,
        "status_label": STATUS_LABELS.get(s.status, s.status),
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "legal_approved_by": s.legal_approved_by,
        "logistics_done_by": s.logistics_done_by,
        "audit_done_by": s.audit_done_by,
    }


@router.get("/summary", response_model=dict)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("can_dashboard")),
):
    """경영관리부 / admin: 전체 출하 현황 요약"""
    shipments = db.query(Shipment).filter_by(tenant_id=current_user["tenant_id"]).all()

    by_status = {}
    for s in shipments:
        by_status[s.status] = by_status.get(s.status, 0) + 1

    in_progress = (
        by_status.get("LEGAL_APPROVED", 0) +
        by_status.get("LOGISTICS_DONE", 0)
    )

    recent = sorted(shipments, key=lambda s: s.created_at or datetime.min, reverse=True)[:7]

    return {
        "total_shipments": len(shipments),
        "pending_approval": by_status.get("PENDING", 0),
        "in_progress": in_progress,
        "rejected": by_status.get("LEGAL_REJECTED", 0),
        "completed": by_status.get("AUDIT_COMPLETE", 0),
        "by_status": by_status,
        "recent_shipments": [_shipment_summary(s) for s in recent],
    }


@router.get("/my-activity", response_model=dict)
def get_my_activity(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """부서별 개인 활동 현황 조회"""
    dept = current_user.get("department", "")
    me = current_user["sub"]
    tenant_id = current_user["tenant_id"]

    all_shipments = db.query(Shipment).filter_by(tenant_id=tenant_id).all()

    if dept == "영업부":
        mine = [s for s in all_shipments if s.created_by == me]
        by_status: dict = {}
        for s in mine:
            by_status[s.status] = by_status.get(s.status, 0) + 1
        recent = sorted(mine, key=lambda s: s.created_at or datetime.min, reverse=True)[:5]
        return {
            "department": dept,
            "my_total": len(mine),
            "my_pending": by_status.get("PENDING", 0),
            "my_in_progress": by_status.get("LEGAL_APPROVED", 0) + by_status.get("LOGISTICS_DONE", 0),
            "my_rejected": by_status.get("LEGAL_REJECTED", 0),
            "my_completed": by_status.get("AUDIT_COMPLETE", 0),
            "recent": [_shipment_summary(s) for s in recent],
        }

    if dept == "로지스틱부":
        awaiting = [s for s in all_shipments if s.status == "LEGAL_APPROVED"]
        my_done = [s for s in all_shipments if s.logistics_done_by == me]
        recent = sorted(my_done, key=lambda s: s.logistics_done_at or datetime.min, reverse=True)[:5]
        return {
            "department": dept,
            "awaiting_logistics": len(awaiting),
            "my_completed": len(my_done),
            "recent": [_shipment_summary(s) for s in recent],
        }

    if dept == "법률지원부":
        pending_review = [s for s in all_shipments if s.status == "PENDING"]
        my_approved = [s for s in all_shipments if s.legal_approved_by == me and s.legal_rejected_reason is None]
        my_rejected = [s for s in all_shipments if s.legal_approved_by == me and s.legal_rejected_reason is not None]
        pending_audit = [s for s in all_shipments if s.status == "LOGISTICS_DONE"]
        my_audit = [s for s in all_shipments if s.audit_done_by == me]
        combined = sorted(my_approved + my_rejected, key=lambda s: s.legal_approved_at or datetime.min, reverse=True)[:5]
        return {
            "department": dept,
            "pending_review": len(pending_review),
            "my_approved": len(my_approved),
            "my_rejected": len(my_rejected),
            "pending_audit": len(pending_audit),
            "my_audit_done": len(my_audit),
            "recent": [_shipment_summary(s) for s in combined],
        }

    # 경영관리부 / admin: 전체 현황
    by_status = {}
    for s in all_shipments:
        by_status[s.status] = by_status.get(s.status, 0) + 1
    in_progress = by_status.get("LEGAL_APPROVED", 0) + by_status.get("LOGISTICS_DONE", 0)
    recent = sorted(all_shipments, key=lambda s: s.created_at or datetime.min, reverse=True)[:7]
    return {
        "department": dept,
        "total_shipments": len(all_shipments),
        "pending_approval": by_status.get("PENDING", 0),
        "in_progress": in_progress,
        "rejected": by_status.get("LEGAL_REJECTED", 0),
        "completed": by_status.get("AUDIT_COMPLETE", 0),
        "by_status": by_status,
        "recent_shipments": [_shipment_summary(s) for s in recent],
    }


class AISummaryRequest(BaseModel):
    department: str
    stats: dict


@router.post("/ai-summary", response_model=dict)
def get_ai_summary(
    body: AISummaryRequest,
    current_user: dict = Depends(get_current_user),
):
    """AI가 대시보드 통계를 분석하여 요약 리포트 생성"""
    dept_name = body.department
    if dept_name == "admin":
        dept_name = "관리자"

    stats_text = json.dumps(body.stats, ensure_ascii=False, indent=2)

    prompt = f"""{dept_name} 담당자의 현재 업무 현황 통계를 분석하여 200자 내외의 간결한 한국어 업무 현황 리포트를 작성하세요.
주요 수치를 언급하고, 주의가 필요한 사항이 있으면 강조하세요.
리포트는 친근하고 전문적인 어조로 작성하세요.

통계 데이터:
{stats_text}"""

    try:
        client = Anthropic()
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"summary": response.content[0].text}
    except Exception as e:
        return {"summary": f"AI 요약 생성 중 오류가 발생했습니다: {str(e)}"}
