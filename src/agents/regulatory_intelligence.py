"""
규제정보 분석 엔진 (Claude API 기반)
"""
import json
import uuid
from datetime import datetime
from typing import Dict, Any

from anthropic import Anthropic

from src.config import get_settings
from src.models.response import AnalyzeResponse, VerdictEnum, SeverityEnum
from .gazette_crawler import get_related_regulations, get_related_regulations_raw


def analyze_regulation(
    bom_item: str, destination_country: str, quantity: int = 1, use_case: str = ""
) -> AnalyzeResponse:
    """
    Claude API를 사용하여 BOM 항목의 규제 준수 여부 분석
    """
    regulations_context = get_related_regulations(bom_item, destination_country)
    regulations_raw = get_related_regulations_raw(bom_item, destination_country)

    settings = get_settings()
    client = Anthropic()

    # 규제 ID 목록을 프롬프트에 포함 (basis_details의 regulation_id 참조용)
    reg_ids = [r.get("id", "") for r in regulations_raw]
    reg_id_list = ", ".join(reg_ids)

    system_prompt = f"""당신은 반도체 수출통제 전문 AI 에이전트입니다.
사용자가 제시한 BOM(부품명세서) 항목이 미국(BIS EAR), EU Dual-use, 한국 수출통제법에 해당하는지 정밀 판정하세요.

판정 기준 (4가지 모두 분석):
1. 공정 노드(Process Node): 14nm 이하 고급 공정 여부
2. AI 성능(Performance): TFLOPS/TOPS 50 이상 또는 메모리 대역폭 800GB/s 이상 여부
3. 최종 용도(End-Use): 군사·WMD·감시 등 민감 용도 여부
4. 목적국(Destination): 미국 수출통제 대상국(중국·러시아·이란·북한 등) 여부

제공된 규제 목록 ID: {reg_id_list}

응답은 반드시 순수 JSON만 출력하세요 (마크다운 코드블록 없이):
{{
  "verdict": "CONTROLLED" | "REVIEW_NEEDED" | "APPROVED",
  "confidence": 0.0~1.0,
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "basis": "주요 적용 규제 조항 한 줄 요약",
  "basis_details": [
    {{
      "criterion": "판정 기준명 (예: 공정 노드)",
      "threshold": "임계값 (예: 14nm 이하)",
      "actual": "BOM에서 파악한 실제 값 (불명확하면 '정보 부족')",
      "triggered": true,
      "regulation": "관련 규제 조항 (예: BIS EAR CCL 3A001.a.7)",
      "regulation_id": "위 규제 목록에서 가장 관련 있는 규제 ID (예: BIS-2026-03-001)",
      "risk_pct": 95,
      "explanation": "이 기준이 충족 또는 미충족된 이유 1-2문장"
    }}
  ],
  "actions": ["조치 요약 1줄"],
  "actions_detailed": [
    {{
      "step": 1,
      "action": "조치 제목",
      "department": "담당 부서",
      "form": "필요 서류명 또는 null",
      "timeline": "처리 기간",
      "detail": "구체적 실행 방법 2-3문장"
    }}
  ],
  "summary": "판정 결론 1-2문장",
  "report": "500자 이상 종합 분석 레포트 (공정 스펙 분석, 각 규제 기준 충족 여부, 목적국 리스크, 필수 조치, 미준수 영향)"
}}"""

    user_message = f"""분석 대상 BOM:
- 항목: {bom_item}
- 목적국: {destination_country}
- 수량: {quantity}
- 최종 사용: {use_case if use_case else '미명시'}

{regulations_context}

위 정보를 바탕으로 규제 준수 여부를 판정해주세요."""

    try:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        response_text = response.content[0].text

        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text

        result = json.loads(json_str)

        return AnalyzeResponse(
            analysis_id=f"ana_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}",
            verdict=VerdictEnum(result.get("verdict", "REVIEW_NEEDED")),
            confidence=float(result.get("confidence", 0.7)),
            severity=SeverityEnum(result.get("severity", "MEDIUM")),
            basis=result.get("basis", "Manual Review Required"),
            actions=result.get("actions", ["법무팀 검토 필요"]),
            summary=result.get("summary", "규제 판정 분석이 완료되었습니다."),
            basis_details=result.get("basis_details", []),
            actions_detailed=result.get("actions_detailed", []),
            report=result.get("report", ""),
            regulations_used=regulations_raw,
        )

    except json.JSONDecodeError:
        return _get_default_response(bom_item, destination_country, regulations_raw)

    except Exception as e:
        print(f"Error analyzing regulation: {str(e)}")
        return _get_default_response(bom_item, destination_country, regulations_raw)


def _get_default_response(bom_item: str, destination: str, regulations_raw: list = None) -> AnalyzeResponse:
    """기본 응답 (API 호출 실패 시)"""
    item_lower = bom_item.lower()
    if ("5nm" in item_lower or "7nm" in item_lower) and ("60" in item_lower or "100" in item_lower):
        verdict = VerdictEnum.CONTROLLED
        confidence = 0.85
        severity = SeverityEnum.CRITICAL
        basis = "BIS EAR Category 3A001 (Advanced Semiconductor Nodes)"
        actions = ["BIS 수출허가(License) 신청 필수", "법무팀 규제 준수 검토", "물류팀에 선적 일시 중단 알림"]
        summary = "고급 공정(5nm)의 높은 성능 칩으로 BIS 통제 대상으로 판정됩니다."
    else:
        verdict = VerdictEnum.REVIEW_NEEDED
        confidence = 0.65
        severity = SeverityEnum.MEDIUM
        basis = "Manual Review Required"
        actions = ["기술 파라미터 재확인", "법무팀 상담"]
        summary = "기술 파라미터를 더 정확히 확인한 후 판정이 필요합니다."

    return AnalyzeResponse(
        analysis_id=f"ana_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}",
        verdict=verdict,
        confidence=confidence,
        severity=severity,
        basis=basis,
        actions=actions,
        summary=summary,
        regulations_used=regulations_raw or [],
    )
