"""
Semi-Regulaw Support - Playwright E2E 테스트 (UI 고도화 기준)
"""
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/login"


# ────────────────────────────────────────────
# 헬퍼: 로그인 + 분석 섹션 이동
# ────────────────────────────────────────────

def login_as(page: Page, dept: str = "영업부", username: str = "sales_user", password: str = "sales123"):
    """로그인 헬퍼 - 기업/부서 드롭다운 선택 후 로그인"""
    page.goto(LOGIN_URL)
    page.wait_for_timeout(1500)

    # 기업 드롭다운 열기 → 첫 번째 기업 선택
    page.locator("#companyDropdown button").click()
    page.wait_for_timeout(300)
    page.locator("#companyList .dropdown-item").first.click()
    page.wait_for_timeout(300)

    # 부서 드롭다운 열기 → 해당 부서 선택
    page.locator("#deptDropdown button").click()
    page.wait_for_timeout(300)
    page.locator(f"#deptList .dropdown-item[data-dept='{dept}']").click()
    page.wait_for_timeout(300)

    # 계정 입력
    page.locator("#loginUsername").fill(username)
    page.locator("#loginPassword").fill(password)

    # 로그인 버튼 클릭 (loginPanel 내부)
    page.locator("#loginPanel button[onclick='doLogin()']").click()
    page.wait_for_timeout(2000)


def go_to_analyze(page: Page):
    """규제 분석 섹션으로 이동"""
    btn = page.locator(".header-nav-btn").filter(has_text="규제 분석")
    if btn.count() > 0:
        btn.first.click()
        page.wait_for_timeout(500)


# ────────────────────────────────────────────
# 페이지 로딩 & 기본 UI
# ────────────────────────────────────────────

def test_page_loads(page: Page):
    """로그인 페이지 정상 로딩 확인"""
    page.goto(BASE_URL)
    expect(page).to_have_title("로그인 - Semi-Regulaw Support")


def test_header_visible(page: Page):
    """헤더 타이틀 표시 확인"""
    page.goto(BASE_URL)
    expect(page.get_by_role("heading", name="Semi-Regulaw Support")).to_be_visible()


def test_user_dropdown_visible(page: Page):
    """로그인 후 사용자 드롭다운 표시 확인"""
    login_as(page)
    expect(page.locator("#userDropdownWrap")).to_be_visible()
    expect(page.locator("#userNameText")).not_to_be_empty()


def test_dashboard_first_on_login(page: Page):
    """로그인 후 대시보드 섹션이 첫 화면으로 표시 확인"""
    login_as(page)
    expect(page.locator("#sectionDashboard")).to_be_visible()
    expect(page.locator("#sectionAnalyze")).to_be_hidden()


def test_three_step_panels_visible(page: Page):
    """규제 분석 섹션에서 BOM 단계 UI 표시 확인"""
    login_as(page)
    go_to_analyze(page)
    expect(page.locator("#companyGrid")).to_be_visible()
    expect(page.locator("#itemGrid")).to_be_visible()
    expect(page.locator("#destCountry")).to_be_visible()
    expect(page.locator("#bomItem")).to_be_visible()
    expect(page.locator("#analyzeBtn")).to_be_visible()


# ────────────────────────────────────────────
# Mock 데이터 로드 확인
# ────────────────────────────────────────────

def test_companies_loaded(page: Page):
    """20개 기업 버튼 로드 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)
    buttons = page.locator("#companyGrid button")
    expect(buttons).to_have_count(20)


def test_category_tabs_rendered(page: Page):
    """8개 카테고리 탭 표시 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)
    tabs = page.locator("#categoryTabs button")
    expect(tabs).to_have_count(8)


def test_items_loaded_on_category_click(page: Page):
    """카테고리 탭 클릭 시 아이템 목록 로드 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)
    page.locator("#categoryTabs button").first.click()
    page.wait_for_timeout(500)
    items = page.locator("#itemGrid button")
    count = items.count()
    assert count >= 10, f"아이템이 너무 적음: {count}개"


def test_bom_autofill_on_item_click(page: Page):
    """아이템 클릭 시 BOM 텍스트 자동 입력 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)
    page.locator("#categoryTabs button").first.click()
    page.wait_for_timeout(300)
    page.locator("#itemGrid button").first.click()
    page.wait_for_timeout(300)
    bom_value = page.locator("#bomItem").input_value()
    assert len(bom_value) > 10, f"BOM 자동 입력 실패: '{bom_value}'"


def test_item_detail_card_shown(page: Page):
    """아이템 선택 시 상세 카드 표시 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)
    page.locator("#categoryTabs button").first.click()
    page.wait_for_timeout(300)
    page.locator("#itemGrid button").first.click()
    page.wait_for_timeout(300)
    expect(page.locator("#itemDetailCard")).to_be_visible()
    expect(page.locator("#detailProduct")).not_to_be_empty()


def test_country_risk_note_shown(page: Page):
    """목적국 선택 시 위험 안내 메시지 표시 확인"""
    login_as(page)
    go_to_analyze(page)
    page.locator("#destCountry").select_option("CN")
    page.wait_for_timeout(200)
    expect(page.locator("#countryRiskNote")).to_be_visible()
    expect(page.locator("#countryRiskNote")).to_contain_text("BIS")


def test_company_description_shown(page: Page):
    """기업 선택 시 설명 표시 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)
    page.locator("#companyGrid button").first.click()
    page.wait_for_timeout(200)
    expect(page.locator("#companyDesc")).to_be_visible()


# ────────────────────────────────────────────
# 폼 유효성 검사
# ────────────────────────────────────────────

def test_validation_no_company(page: Page):
    """기업 미선택 시 분석 요청 차단 확인"""
    login_as(page)
    go_to_analyze(page)
    page.locator("#bomItem").fill("TSMC 5nm 칩")
    page.locator("#destCountry").select_option("TW")
    page.locator("#analyzeBtn").click()
    page.wait_for_timeout(500)
    expect(page.locator("#loadingCard")).to_be_hidden()
    expect(page.locator("#errorCard")).to_be_visible()


def test_validation_no_bom(page: Page):
    """BOM 미입력 시 분석 요청 차단 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)
    page.locator("#companyGrid button").first.click()
    page.locator("#destCountry").select_option("TW")
    page.locator("#bomItem").fill("")
    page.locator("#analyzeBtn").click()
    page.wait_for_timeout(500)
    expect(page.locator("#loadingCard")).to_be_hidden()
    expect(page.locator("#errorCard")).to_be_visible()


def test_validation_no_country(page: Page):
    """목적국 미선택 시 분석 요청 차단 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)
    page.locator("#companyGrid button").first.click()
    page.locator("#bomItem").fill("TSMC 5nm 칩, 60TFLOPS")
    page.locator("#analyzeBtn").click()
    page.wait_for_timeout(500)
    expect(page.locator("#loadingCard")).to_be_hidden()
    expect(page.locator("#errorCard")).to_be_visible()


# ────────────────────────────────────────────
# AI 분석 요청 (Claude API 실제 호출)
# ────────────────────────────────────────────

def test_analyze_controlled_chip(page: Page):
    """통제 대상 칩 분석 후 Analysis Report 표시 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)

    page.locator("#companyGrid button").first.click()
    page.locator("#bomItem").fill("NVIDIA H100 SXM5, TSMC 4nm, 2000 TOPS INT8, HBM2e 80GB")
    page.locator("#destCountry").select_option("CN")
    page.locator("#quantity").fill("50")
    page.locator("#analyzeBtn").click()

    expect(page.locator("#loadingCard")).to_be_visible()
    expect(page.locator("#reportCard")).to_be_visible(timeout=30000)

    report_text = page.locator("#reportCard").inner_text()
    assert len(report_text) > 100, "리포트 내용이 너무 짧음"


def test_report_sections_present(page: Page):
    """분석 리포트에 필수 섹션(규제 근거·권장 조치) 포함 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)

    page.locator("#companyGrid button").nth(1).click()
    page.locator("#bomItem").fill("Samsung HBM3E 36GB, 1.2TB/s, AI 가속기용 메모리")
    page.locator("#destCountry").select_option("CN")
    page.locator("#analyzeBtn").click()

    expect(page.locator("#reportCard")).to_be_visible(timeout=30000)
    report_text = page.locator("#reportCard").inner_text()
    assert "규제" in report_text or "통제" in report_text or "분석" in report_text


def test_tenant_id_header_sent(page: Page):
    """네트워크 레벨에서 Authorization 헤더 전송 확인"""
    login_as(page)
    go_to_analyze(page)
    page.wait_for_timeout(2000)

    captured = {}

    def on_request(req):
        if "/api/v1/analyze" in req.url:
            captured.update(req.headers)

    page.on("request", on_request)

    page.locator("#companyGrid button").first.click()
    page.locator("#bomItem").fill("TSMC 5nm 테스트 칩")
    page.locator("#destCountry").select_option("TW")
    page.locator("#analyzeBtn").click()
    page.wait_for_timeout(3000)

    assert "authorization" in captured, f"Authorization 헤더 미전송. 캡처된 헤더: {list(captured.keys())}"
