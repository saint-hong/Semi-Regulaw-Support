# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## L1: Project Foundation & Guidelines

### Project Name
**AI-Native 반도체 규제 대응 에이전트** (Semi-Regulaw Support)
- 공식명: 글로벌 반도체 수출 통제 대응 에이전트
- 사업근거: NIPA 2026 SaaS 개발·사업화 지원 사업

---

### 핵심 프로젝트 특성

#### 1. AI-Native 설계 원칙
**설계 단계부터 AI가 비즈니스 핵심 엔진**
- 단순 조력(Copilot) 단계를 넘어 **자율적 목표 수립-실행**하는 에이전틱 워크플로우
- 사용자 명령 없이도 24/7 전 세계 관보를 모니터링하고 즉시 인지
- 복잡한 규제 변화를 도메인 특화 AI가 자동으로 분석·추론·행동

#### 2. 비즈니스 시나리오: 실시간 규제 대응
**월요일 아침의 가상 시나리오** - 반도체 팹리스 기업의 수출 위험 회피
1. **자율 모니터링 (새벽 3:00)**: 미국 상무부(BIS) 수출 통제 긴급 개정 감지
2. **사내 데이터 매칭 (아침 8:05)**: ERP/BOM 데이터와 자동 연계 분석
   - 오후 2시 대만 출하 예정 칩셋의 규제 영향도 98% 판정
3. **자율 행동 (8:05-9:00)**:
   - 물류 시스템에 자동 중단(Hold) 적용
   - 법무팀에 수출 허가(License) 신청 필요 알림
   - 규정 준수 기술 문서 초안 자동 생성
   - 파트너사 안내 이메일 초안 작성
4. **의사결정 지원 (9:30 회의)**: 매출 영향 분석 및 시나리오별 리스크 평가
   - 허가 신청 지연: 예상 4주
   - 무단 강행 리스크: 과징금 3,000억 원 + 거래 제한

**가치 창출**:
- 기존 수동: 뉴스 후 인지 → 며칠 걸린 분석 → 주관적 판단 → 수동 행동
- AI-Native: 24/7 자동 포착 → 즉시 정밀 분석 → 자동 시스템 통제 → 인적 오류 제거

#### 3. 기업 고객 페르소나
- **주요 고객**: 한국 팹리스(Fabless), 반도체 설계/제조 기업(파운더리)
- **핵심 pain point**: 미국(BIS), EU, 중국 규제 변화의 실시간 감시 및 대응
- **기대효과**: 리스크 회피 → 글로벌 매출 안정화 → 규정 준수 비용 절감

---

## L1: SaaS 개발 요건 (NIPA 기준)

### 클라우드 서비스 핵심 특성 (ISO/IEC 17788)
모든 AI-Native SaaS는 다음 5가지 특성을 만족해야 함:

#### 1. 사용자 중심의 요청기반 셀프서비스 (On-demand Self Service)
- 서비스 이용자가 제공자의 개입 없이 서비스 포털에서 필요한 기능 선택/변경·이용
- 관리자가 이용자 역할 및 권한 설정

#### 2. 범용네트워크 접속 (Broad Network Access)
- 단말기(스마트폰, 노트북, 태블릿)에 관계없이 네트워크를 통해 접속

#### 3. 신속한 탄력성 (Rapid Elastic and Scaling)
- 시스템 구성을 물리적으로 변경하지 않고 클라우드 환경을 빠르게 확장/축소
- 상용 IaaS 이용 시, 오토스케일 및 로드밸런싱 설정 필수

#### 4. 서비스 측정 (Measured Service)
- 미터링 기능을 이용하여 자원/테넌트 별 사용량 측정 및 과금(빌링) 모니터링

#### 5. IT자원의 공동이용 (Resource Pooling)
- IT자원(DB 등)을 다양한 사용자가 독립적으로 이용(개인화)할 수 있는 멀티테넌트 구조
- 이용자 요청에 따라 동적으로 할당/회수

### 아키텍처 요구사항
- **MSA(Microservices Architecture)**: 마이크로서비스 기반 설계
- **구독 기반 과금 정책**: SaaS 형태의 과금 체계
- **멀티테넌시 (Multi-tenancy)**: 복수의 테넌트와 데이터를 완전히 분리·격리
- **제3자 인증/시험**: 과제 종료 시까지 제3자 인증기관(예: KACI, TTA 등)을 통한 검증 필수

---

## L1: Semi-Regulaw Support의 5계층 기술 아키텍처

### 계층 1: 데이터 관리 레이어 (Data Management)
**기능**: 에이전트의 지능을 결정하는 '데이터 독점성'과 '정제 체계'
- **글로벌 규제 크롤러**: 미국(BIS), 한국(산업부), EU 등 전 세계 관보 실시간 수집
- **벡터 데이터베이스 (Vector DB)**: 수집된 법령 문서를 임베딩하여 저장 (RAG 기반)
- **테넌트 격리 DB (Tenant-Isolated DB)**: 기업 고객별 ERP/BOM 데이터 물리적·논리적 완전 분리
- **데이터 정제 엔진**: 비정형 법률 데이터 → AI 학습용 정형 데이터 자동 라벨링·검증

### 계층 2: 모델링 및 AI 워크플로우 레이어 (Modeling & Agentic Workflow)
**기능**: 자율적으로 목표를 수립하고 실행하는 핵심 엔진
- **도메인 특화 SLM (Small Language Model)**: 반도체 기술 용어·수출통제법 파인튜닝 모델
- **에이전틱 오케스트레이터 (Agentic Orchestrator)**: 다중 에이전트 시스템 (가트너 2026 트렌드)
  - 규제 모니터링 에이전트 ↔ 기업 리스크 분석 에이전트 협업
- **RAG & 추론 엔진**: 최신 법령 지식 기반 "거래 규제 위반 여부?" 판단

### 계층 3: 서비스 아키텍처 레이어 (Architecture)
**기능**: 클라우드 네이티브 MSA 기반의 SaaS 구조
- **API 게이트웨이**: 사용자 요청 인증 및 마이크로서비스 라우팅
- **오토스케일링 & 로드밸런싱**: 클라우드 '신속한 탄력성' 요건 충족
- **구독 기반 과금(Billing) 엔진**: 사용자별/자원별 사용량 측정 및 과금 관리

### 계층 4: 보안 및 신뢰성 레이어 (Security & Trust)
**기능**: 고위험군 AI로서의 법적 책임과 데이터 보안
- **멀티테넌트 데이터 격리**: 학습·추론 과정에서도 고객사별 데이터 완전 분리
- **AI 신뢰성 체크리스트**: TTA 전문인증기관 신뢰성 검인증 기준 상시 모니터링
- **개인정보보호 자율점검**: 가명처리 및 익명처리 기술 적용

### 계층 5: 배포 및 MLOps 레이어 (Deployment)
**기능**: 지속적 성능 개선과 글로벌 배포
- **CI/CD/CD 파이프라인**: 소프트웨어·모델·데이터 지속적 배포
- **MLOps 자동화**: 모델 성능 저하 감지 → 데이터 수집 → 재학습 → 배포 피드백 루프
- **글로벌 CSP 배포**: 국내외 CSP 인프라 활용한 저지연 접속

---

## Development Commands

### Setup
```bash
# 의존성 설치
pip install -r requirements.txt
```

### Run
```bash
# 서비스 시작 (개발 모드)
uvicorn src.main:app --reload --port 8000
# 또는 스크립트 사용
bash run.sh
```

### Testing
```bash
# UI 자동화 테스트 (Playwright)
pytest tests/test_ui.py -v
# 특정 테스트 실행
pytest tests/ -k "test_name"
```

---

## Key Directories & File Structure (현재 구현)

```
.claude/
├── skills/                          # 지능형 워크플로우 정의
│   ├── gazette-crawler.md           # 글로벌 관보 크롤링 워크플로우
│   ├── erp-data-mapper.md           # ERP 데이터 매핑 워크플로우
│   ├── regulatory-intelligence.md   # 규제정보 분석 엔진
│   └── compliance-reporter.md       # 규제 대응 보고서 생성
└── agents/                          # AI 페르소나
    ├── legal-expert.md              # 법률 전문가 에이전트
    └── security-auditor.md          # 보안 감사관 에이전트

rules/                               # 거버넌스 및 규칙
├── multi-tenancy-isolation.rules    # 테넌트 데이터 격리 규칙
├── tta-ai-reliability.rules         # TTA AI 신뢰성 기준
├── data-security.rules              # 데이터 보안 정책
└── audit-compliance.rules           # 감시 및 규정 준수

src/
├── agents/
│   ├── regulatory_intelligence.py   # Claude API 기반 규제 분석 엔진
│   └── gazette_crawler.py           # 규제 데이터 조회 (mock → 실시간 크롤러로 고도화 예정)
├── api/v1/
│   ├── auth.py                      # 로그인/회원가입/사용자 정보
│   ├── analyze.py                   # 규제 분석 엔드포인트
│   ├── shipments.py                 # 출하 워크플로우 (영업→물류→최종)
│   └── health.py                    # 헬스체크
├── auth/
│   ├── jwt.py                       # JWT 토큰 생성·검증
│   ├── rbac.py                      # 부서별 역할·권한 관리 (5개 부서)
│   └── seed.py                      # DB 초기화 및 데모 계정 생성
├── middleware/
│   └── tenant.py                    # 멀티테넌시 미들웨어 (tenant_id 주입)
├── models/
│   ├── user.py                      # 사용자 모델
│   ├── shipment.py                  # 출하 모델 (상태 워크플로우)
│   ├── request.py                   # API 요청 스키마
│   └── response.py                  # API 응답 스키마
├── main.py                          # FastAPI 앱 진입점
├── config.py                        # 환경변수 설정
└── database.py                      # SQLAlchemy DB 설정

frontend/
├── index.html                       # 메인 대시보드
├── login.html                       # 로그인/회원가입
├── app.js                           # 프론트엔드 로직
├── styles.css                       # 스타일시트
└── data/
    ├── mock_companies.json          # 테넌트 기업 목록 (20개)
    └── mock_bom_items.json          # BOM 품목 데이터 (100개, 8개 카테고리)

data/
└── mock_regulations.json            # 규제 데이터 (BIS/EU/산업부, 고도화 시 실시간 크롤링으로 대체)
```

### API 엔드포인트 목록

```
GET  /api/v1/health                             # 헬스체크

POST /api/v1/auth/login                         # 로그인 (JWT 발급)
POST /api/v1/auth/register                      # 회원가입
GET  /api/v1/auth/me                            # 현재 사용자 정보

POST /api/v1/analyze                            # 규제 분석 (BOM 품목 + 수출 국가)

POST  /api/v1/shipments                         # 출하 요청 생성 (영업부)
GET   /api/v1/shipments                         # 출하 목록 조회 (영업부·로지스틱부·법률지원부)
PATCH /api/v1/shipments/{id}/approve            # 컴플라이언스 승인 (법률지원부)
PATCH /api/v1/shipments/{id}/reject             # 컴플라이언스 반려 (법률지원부)
PATCH /api/v1/shipments/{id}/logistics-done     # 선적 완료 보고 (로지스틱부)
PATCH /api/v1/shipments/{id}/audit-complete     # 사후 감사 완료 (법률지원부)

GET  /api/v1/dashboard/summary                  # 전체 현황 대시보드 (경영관리부)
```

### 출하 워크플로우 상태

```
PENDING → LEGAL_APPROVED / LEGAL_REJECTED → LOGISTICS_DONE → AUDIT_COMPLETE
(영업부)    (법률지원부 1차 검토)              (로지스틱부)      (법률지원부 사후 감사)
```

### 부서별 권한 (RBAC)

| 부서 | can_analyze | can_shipment | can_approve | can_dashboard | 메뉴 |
|------|:-----------:|:------------:|:-----------:|:-------------:|------|
| 영업부 | ✓ | ✓ | - | - | 규제 분석 · 출하 관리 |
| 로지스틱부 | - | ✓ | - | - | 출하 관리 |
| 법률지원부 | ✓ | ✓ | ✓ | - | 규제 분석 · 컴플라이언스 |
| 경영관리부 | - | - | - | ✓ | 현황 대시보드 |
| admin | ✓ | ✓ | ✓ | ✓ | 전체 메뉴 |

---

## Architecture Principles

### AI-Native Design
- **AI 우선**: 설계 단계부터 AI가 비즈니스 핵심 엔진
- **자율 에이전트**: 사용자 명령 없이 자율적으로 목표 수립·실행
- **실시간 반응**: 24/7 전 세계 규제 변화 모니터링 및 즉각 인지
- **지속 학습**: 도메인 데이터 기반 파인튜닝으로 정확도 향상

### Multi-tenancy
- **데이터 격리**: 각 테넌트의 데이터는 학습·추론 단계에서도 완전히 격리
- **리소스 풀링**: IT자원의 효율적 공동이용
- **성능 최적화**: 테넌트별 독립적 스케일링 및 과금

### Global Compliance
- **TTA AI 신뢰성**: 인공지능 신뢰도 평가 기준 준수
- **국가별 규제**: 미국(BIS), EU, 중국 등 다국적 규제 대응
- **감사 추적**: 모든 시스템 변경 및 데이터 접근 로깅

---

## Performance & Reliability Targets

### SaaS 성능 목표
- API 응답시간: 200ms 이하
- 시스템 가용성: 99.9%
- 데이터 처리량: 매일 10,000+ 규제정보 항목 크롤링

### AI 모델 성능
- 규제 정보 정확도: 95% 이상
- 영향도 판정 정확도: 99% 이상
- 평균 응답시간: 5초 이하

---

## 관련 문서
- 📄 [NIPA 2026 SaaS 개발 사업 안내서](./nippa_guide_final.pdf)
- 📄 [Semi-Regulaw Support 개발 기획안](./semi_docs_v1.txt)
