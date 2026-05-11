"""
API 요청 모델
"""
from pydantic import BaseModel, Field
from typing import Optional


class AnalyzeRequest(BaseModel):
    """규제 분석 요청"""

    bom_item: str = Field(
        ...,
        description="분석할 BOM 항목 (예: TSMC 5nm GPU, 60TFLOPS)",
        min_length=1,
    )
    destination_country: str = Field(
        ...,
        description="수출 목적국 (2자리 ISO 코드, 예: TW, US, CN)",
        min_length=2,
        max_length=2,
    )
    quantity: int = Field(1, description="수량", ge=1)
    use_case: Optional[str] = Field(
        None, description="최종 사용 목적 (선택사항)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "bom_item": "TSMC 5nm AI 가속기 칩, 60TFLOPS",
                "destination_country": "TW",
                "quantity": 1000,
                "use_case": "Data Center AI Inference",
            }
        }
