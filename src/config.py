"""
애플리케이션 설정
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # 기본 설정
    app_name: str = "Semi-Regulaw Support"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True

    # API 설정
    api_prefix: str = "/api/v1"

    # 데이터베이스
    database_url: str = "sqlite:///./semi_regulaw.db"

    # Anthropic API
    anthropic_api_key: str

    # 서버
    port: int = 8000

    # 테넌트
    default_tenant_id: str = "demo-company"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤 반환"""
    return Settings()
