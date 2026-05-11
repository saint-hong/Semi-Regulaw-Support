"""
규제 분석 엔드포인트
"""
from fastapi import APIRouter, Request, Depends
from src.models.request import AnalyzeRequest
from src.models.response import AnalyzeResponse
from src.agents.regulatory_intelligence import analyze_regulation
from src.auth.rbac import require_permission

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_bom(
    request: AnalyzeRequest,
    http_request: Request,
    current_user: dict = Depends(require_permission("can_analyze")),
):
    """
    BOM 항목의 규제 준수 여부 분석

    요청 예시:
    ```bash
    curl -X POST http://localhost:8000/api/v1/analyze \
      -H "Content-Type: application/json" \
      -H "X-Tenant-ID: demo-company" \
      -d '{
        "bom_item": "TSMC 5nm AI 가속기, 60TFLOPS",
        "destination_country": "TW"
      }'
    ```

    응답:
    - verdict: CONTROLLED (통제), REVIEW_NEEDED (검토), APPROVED (승인)
    - confidence: 0.0 ~ 1.0 (신뢰도)
    - severity: 심각도 레벨
    - basis: 규제 조항
    - actions: 권장 조치
    - summary: 분석 요약
    """

    # 멀티테넌시: 요청 상태에서 tenant_id 가져오기
    tenant_id = http_request.state.tenant_id

    # 규제 분석 수행
    result = analyze_regulation(
        bom_item=request.bom_item,
        destination_country=request.destination_country,
        quantity=request.quantity,
        use_case=request.use_case or "",
    )

    return result
