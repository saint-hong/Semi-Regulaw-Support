"""
API 응답 모델
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from enum import Enum


class VerdictEnum(str, Enum):
    """규제 판정 결과"""

    CONTROLLED = "CONTROLLED"  # 통제 대상
    REVIEW_NEEDED = "REVIEW_NEEDED"  # 검토 필요
    APPROVED = "APPROVED"  # 승인됨


class SeverityEnum(str, Enum):
    """심각도 레벨"""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AnalyzeResponse(BaseModel):
    """규제 분석 응답"""

    analysis_id: str = Field(..., description="분석 추적 ID")
    verdict: VerdictEnum = Field(..., description="규제 판정 결과")
    confidence: float = Field(
        ..., description="신뢰도 (0.0 ~ 1.0)", ge=0.0, le=1.0
    )
    severity: SeverityEnum = Field(..., description="심각도 레벨")
    basis: str = Field(
        ..., description="판정 기준 (예: BIS EAR 3A001)"
    )
    actions: List[str] = Field(..., description="권장 조치 목록")
    summary: str = Field(..., description="분석 요약")
    basis_details: List[Dict[str, Any]] = Field(default=[], description="판정 기준 상세 목록")
    actions_detailed: List[Dict[str, Any]] = Field(default=[], description="조치 상세 목록")
    bom_comparison: List[Dict[str, Any]] = Field(default=[], description="BOM 사양 vs 규제 임계값 대조표")
    report: str = Field(default="", description="종합 분석 레포트")
    regulations_used: List[Dict[str, Any]] = Field(default=[], description="분석에 참고한 규제 목록 (원본 데이터)")

    class Config:
        json_schema_extra = {
            "example": {
                "analysis_id": "ana_20260323_001",
                "verdict": "CONTROLLED",
                "confidence": 0.98,
                "severity": "CRITICAL",
                "basis": "BIS EAR Category 3A001",
                "actions": [
                    "BIS 수출허가(License) 신청 필수",
                    "법무팀 검토 필요",
                    "물류팀 선적 일시 중단",
                ],
                "summary": "이 칩은 BIS 수출통제 대상입니다.",
            }
        }
