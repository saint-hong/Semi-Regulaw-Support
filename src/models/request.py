"""
API 요청 모델
"""
from pydantic import BaseModel, Field
from typing import Optional


class DetailedBOM(BaseModel):
    """구조화된 BOM 상세 명세"""
    product: Optional[str] = Field(None, description="품목명 (정식 명칭)")
    designer: Optional[str] = Field(None, description="설계사 (원천 기술 보유사)")
    foundry: Optional[str] = Field(None, description="파운드리 (제조 공장 및 국가)")
    process_node: Optional[str] = Field(None, description="공정 노드 (예: 4nm, 7nm)")
    key_spec: Optional[str] = Field(None, description="주요 성능 (TOPS/TFLOPS, 대역폭 등)")
    memory: Optional[str] = Field(None, description="메모리 사양")
    eccn: Optional[str] = Field(None, description="ECCN 코드 (예: 3A001.a.7)")
    hs_code: Optional[str] = Field(None, description="HS 코드 (예: 8542.31.00)")


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
    use_case: Optional[str] = Field(None, description="최종 사용 목적 (선택사항)")
    detailed_bom: Optional[DetailedBOM] = Field(None, description="구조화된 BOM 상세 명세 (상세 입력 모드)")

    class Config:
        json_schema_extra = {
            "example": {
                "bom_item": "TSMC 5nm AI 가속기 칩, 60TFLOPS",
                "destination_country": "TW",
                "quantity": 1000,
                "use_case": "Data Center AI Inference",
                "detailed_bom": {
                    "product": "NVIDIA H100 SXM5",
                    "designer": "NVIDIA",
                    "foundry": "TSMC",
                    "process_node": "4nm",
                    "key_spec": "2000 TOPS (INT8)",
                    "memory": "HBM2e 80GB",
                    "eccn": "3A001.a.7",
                    "hs_code": "8542.31.00"
                }
            }
        }
