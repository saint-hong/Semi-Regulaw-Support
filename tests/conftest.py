"""
Playwright 설정 - 시스템 Chromium 사용
"""
import pytest
from playwright.sync_api import Playwright


@pytest.fixture(scope="session")
def browser_type_launch_args():
    return {
        "executable_path": "/usr/bin/chromium-browser",
        "args": ["--no-sandbox", "--disable-dev-shm-usage"],
    }
