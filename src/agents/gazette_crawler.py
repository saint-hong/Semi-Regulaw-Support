"""
글로벌 관보 데이터 검색 및 규제정보 추출
"""
import json
from pathlib import Path
from typing import List


def load_mock_regulations() -> List[dict]:
    """Mock 규제 데이터 로드"""
    mock_file = Path(__file__).parent.parent.parent / "data" / "mock_regulations.json"

    if mock_file.exists():
        with open(mock_file, "r", encoding="utf-8") as f:
            return json.load(f)

    # 파일이 없으면 기본 데이터 반환
    return get_default_regulations()


def get_default_regulations() -> List[dict]:
    """기본 규제정보"""
    return [
        {
            "id": "BIS-2026-03-001",
            "source": "미국 상무부 (BIS)",
            "title": "고급 칩 설계 및 패키징 기술 수출통제",
            "description": "14nm 이상의 고급 공정 및 AI 가속 기능을 갖춘 칩",
            "controlled_parameter": "Process node < 14nm OR TFLOPS > 50",
            "hs_code": ["8542.31", "8542.32"],
            "severity": "CRITICAL",
        },
        {
            "id": "EU-DUAL-2025-001",
            "source": "EU Commission",
            "title": "이중용도 반도체 칩 수출통제",
            "description": "군사 및 민감 용도에 사용 가능한 반도체",
            "controlled_parameter": "Advanced computing capabilities",
            "hs_code": ["8542.31"],
            "severity": "HIGH",
        },
        {
            "id": "KOR-UCML-2026-001",
            "source": "한국 산업부",
            "title": "전략물자 수출통제",
            "description": "한국 수출통제 물품 리스트(UCML) 대상",
            "controlled_parameter": "고급 반도체",
            "hs_code": ["8542.31", "8542.32"],
            "severity": "HIGH",
        },
    ]


def get_related_regulations_raw(bom_item: str, destination: str) -> List[dict]:
    """관련 규제를 리스트(원본 객체)로 반환"""
    regulations = load_mock_regulations()
    keywords = bom_item.lower().split()
    related = []
    for reg in regulations:
        title = reg.get("title", "").lower()
        desc = reg.get("description", "").lower()
        if any(kw in title or kw in desc for kw in keywords):
            related.append(reg)
    if not related:
        related = regulations[:2]
    # 최대 5개로 제한 (Claude 컨텍스트 과부하 방지)
    return related[:5]


def get_related_regulations(bom_item: str, destination: str) -> str:
    """
    BOM 항목과 관련된 규제정보 조회 및 형식화

    Args:
        bom_item: BOM 항목 설명 (예: "TSMC 5nm GPU, 60TFLOPS")
        destination: 목적국 (예: "TW")

    Returns:
        형식화된 규제정보 문자열
    """
    regulations = load_mock_regulations()

    # 간단한 키워드 매칭 (실제는 벡터 임베딩 유사도 검색)
    related = []
    keywords = bom_item.lower().split()

    for reg in regulations:
        title = reg.get("title", "").lower()
        desc = reg.get("description", "").lower()

        # 키워드 매칭
        if any(kw in title or kw in desc for kw in keywords):
            related.append(reg)

    # 매칭되는 규제가 없으면 기본 반도체 관련 규제 반환
    if not related:
        related = regulations[:2]

    # 형식화
    result = "관련 규제정보:\n"
    for idx, reg in enumerate(related, 1):
        result += f"\n{idx}. {reg['source']}\n"
        result += f"   제목: {reg['title']}\n"
        result += f"   설명: {reg['description']}\n"
        result += f"   통제 기준: {reg['controlled_parameter']}\n"
        result += f"   심각도: {reg['severity']}\n"

    return result
