# Semi-Regulaw Support

**AI-Native 반도체 규제 대응 에이전트**

반도체 수출 기업의 글로벌 규제 준수를 자동으로 지원하는 AI 서비스입니다. BOM(부품명세서)을 입력하면, Claude AI가 미국(BIS), EU, 한국의 규제 정책을 실시간 분석하고 규제 위험도를 판정합니다.

---

## 🚀 빠른 시작

### 1. 가상환경 생성 및 의존성 설치

```bash
# 프로젝트 디렉토리로 이동
cd /home/shhong/project/semi

# 가상환경 생성
python -m venv .venv

# 가상환경 활성화 (macOS/Linux)
source .venv/bin/activate

# 가상환경 활성화 (Windows)
.venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. API 키 설정

`.env` 파일에 Anthropic API 키를 입력하세요:

```bash
# .env 파일 편집
nano .env

# 다음 라인에서 YOUR_API_KEY를 실제 API 키로 변경:
ANTHROPIC_API_KEY=sk-ant-YOUR_API_KEY
```

Anthropic API 키는 여기서 발급받을 수 있습니다: https://console.anthropic.com/

### 3. 서버 시작

```bash
python src/main.py
```

출력:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## 📊 사용 예시

### Swagger UI에서 테스트 (권장)

1. 브라우저에서 http://localhost:8000/docs 열기
2. "Analyze" 엔드포인트 클릭
3. "Try it out" 클릭
4. 요청 본문 입력:

```json
{
  "bom_item": "TSMC 5nm AI 가속기 칩, 60TFLOPS",
  "destination_country": "TW",
  "quantity": 1000,
  "use_case": "Data Center AI Inference"
}
```

5. "Execute" 클릭

### curl로 테스트

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: demo-company" \
  -d '{
    "bom_item": "TSMC 5nm GPU 칩, 60TFLOPS",
    "destination_country": "TW"
  }'
```

### 응답 예시

```json
{
  "analysis_id": "ana_20260323_123456_a1b2c3d4",
  "verdict": "CONTROLLED",
  "confidence": 0.98,
  "severity": "CRITICAL",
  "basis": "BIS EAR Category 3A001",
  "actions": [
    "BIS 수출허가(License) 신청 필수",
    "법무팀 규제 준수 검토",
    "물류팀에 선적 일시 중단 알림"
  ],
  "summary": "이 칩은 BIS 수출통제 대상입니다. 5nm 공정의 60TFLOPS 성능이 통제 기준을 초과합니다."
}
```

---

## 🔄 API 엔드포인트

### Health Check
```
GET /health
```
서버 상태 확인

### 규제 분석
```
POST /api/v1/analyze
```
BOM 항목의 규제 준수 여부 분석

**요청 본문:**
```json
{
  "bom_item": "string (필수)",
  "destination_country": "string (필수, 2자리 ISO 코드)",
  "quantity": "integer (기본값: 1)",
  "use_case": "string (선택사항)"
}
```

**응답:**
```json
{
  "analysis_id": "string",
  "verdict": "CONTROLLED | REVIEW_NEEDED | APPROVED",
  "confidence": "number (0.0 ~ 1.0)",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "basis": "string (규제 조항)",
  "actions": ["string"],
  "summary": "string"
}
```

---

## 🔐 멀티테넌시 (Multi-Tenancy)

모든 API 요청에는 `X-Tenant-ID` 헤더가 필수입니다:

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "X-Tenant-ID: your-company-name" \
  ...
```

이를 통해 각 고객사의 데이터가 완전히 격리됩니다.

---

## 📁 프로젝트 구조

```
semi/
├── CLAUDE.md                    # Claude Code 가이드
├── .env                         # 환경변수 (ANTHROPIC_API_KEY 입력)
├── .env.example                 # 환경변수 템플릿
├── requirements.txt             # 파이썬 의존성
├── src/
│   ├── main.py                 # FastAPI 앱 메인
│   ├── config.py               # 설정
│   ├── api/
│   │   └── v1/
│   │       ├── analyze.py      # 규제 분석 엔드포인트
│   │       └── health.py       # 헬스체크
│   ├── agents/
│   │   ├── regulatory_intelligence.py  # Claude API 호출
│   │   └── gazette_crawler.py          # 규제 데이터 검색
│   ├── middleware/
│   │   └── tenant.py           # 멀티테넌시 검증
│   └── models/
│       ├── request.py          # 요청 스키마
│       └── response.py         # 응답 스키마
└── data/
    └── mock_regulations.json    # Mock 규제 데이터
```

---

## 🧪 개발 및 테스트

### 로그 확인

```bash
# DEBUG=true 상태에서 서버 실행하면 상세 로그 출력
python src/main.py
```

### Mock 데이터 수정

`data/mock_regulations.json`에서 샘플 규제 데이터를 수정할 수 있습니다.

### Claude API 없이 테스트

`.env`에 `ANTHROPIC_API_KEY`가 설정되지 않거나 API 호출이 실패하면, 기본값 응답으로 동작합니다.

---

## 📚 더 알아보기

- [CLAUDE.md](./CLAUDE.md): 프로젝트 전체 아키텍처 및 가이드
- [NIPA 2026 SaaS 개발 사업 안내서](./nippa_guide_final.pdf)
- [개발 기획안](./semi_docs_v1.txt)

---

## 🤝 기여

이 프로젝트는 NIPA 2026 SaaS 개발·사업화 지원 사업에 참여합니다.

---

## ⚠️ 주의사항

- **개발용 MVP**: 이 버전은 데모 목적입니다
- **Mock 데이터**: 실제 규제정보는 mock_regulations.json에서만 나옵니다
- **테넌트 ID**: 모든 요청에 X-Tenant-ID 헤더가 필수입니다
- **데이터 격리**: 각 테넌트의 데이터는 완전히 격리됩니다

---

**문의**: 이 프로젝트에 대한 질문이 있으시면 CLAUDE.md를 참고하세요.
