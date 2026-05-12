// ─── 인증 ────────────────────────────────────────────────────
function getAuthToken() { return localStorage.getItem('auth_token'); }
function getAuthUser()  { try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; } }
function getAuthPerms() { try { return JSON.parse(localStorage.getItem('auth_permissions') || 'null'); } catch { return null; } }

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function doLogout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_permissions');
  localStorage.removeItem('demo_mode');
  window.location.href = '/login';
}

function checkAuth() {
  if (!getAuthToken()) { window.location.href = '/login'; return false; }
  return true;
}

// ─── 상태 ───────────────────────────────────────────────────
const state = {
  companies: [],
  categories: [],
  selectedCategory: null,
  selectedItem: null,
  selectedCompany: null,
  allItemsMap: {},
  currentSection: 'analyze',
};

// ─── 국가 데이터 ────────────────────────────────────────────
const COUNTRIES = [
  { code: 'CN', name: '중국 (CN)', risk: 'very-high', note: 'BIS 수출통제 최고 위험 — AI·반도체 분야 강화' },
  { code: 'RU', name: '러시아 (RU)', risk: 'very-high', note: '미국·EU 포괄 제재 대상' },
  { code: 'IR', name: '이란 (IR)', risk: 'critical', note: 'OFAC 제재 — 거래 원칙적 금지' },
  { code: 'KP', name: '북한 (KP)', risk: 'critical', note: 'UN·OFAC 제재 — 거래 전면 금지' },
  { code: 'SY', name: '시리아 (SY)', risk: 'critical', note: 'OFAC 제재 대상' },
  { code: 'TW', name: '대만 (TW)', risk: 'medium', note: '고성능 AI칩 재수출 경로 우려 — 확인 필요' },
  { code: 'SG', name: '싱가포르 (SG)', risk: 'medium', note: '제3국 경유 우려 — 최종 사용자 확인 필수' },
  { code: 'MY', name: '말레이시아 (MY)', risk: 'medium', note: '반도체 우회 수출 경로 주의' },
  { code: 'AE', name: 'UAE (AE)', risk: 'medium', note: '제3국 경유 재수출 가능성 검토' },
  { code: 'IN', name: '인도 (IN)', risk: 'low-medium', note: '일부 이중용도 품목 확인 필요' },
  { code: 'VN', name: '베트남 (VN)', risk: 'low-medium', note: '최종 사용 목적 확인 필요' },
  { code: 'JP', name: '일본 (JP)', risk: 'low', note: 'Tier 1 허가 국가 — 일반적으로 허가 불필요' },
  { code: 'DE', name: '독일 (DE)', risk: 'low', note: 'EU Tier 1 — 일반적으로 허가 불필요' },
  { code: 'US', name: '미국 (US)', risk: 'low', note: '내수 거래 또는 동맹국 수출' },
  { code: 'KR', name: '한국 (KR)', risk: 'low', note: '자국 내 거래' },
  { code: 'GB', name: '영국 (GB)', risk: 'low', note: 'Tier 1 허가 국가' },
  { code: 'FR', name: '프랑스 (FR)', risk: 'low', note: 'EU Tier 1 국가' },
  { code: 'NL', name: '네덜란드 (NL)', risk: 'low', note: 'EU Tier 1 — ASML 본국' },
  { code: 'IL', name: '이스라엘 (IL)', risk: 'low', note: 'Tier 1 허가 국가' },
  { code: 'AU', name: '호주 (AU)', risk: 'low', note: 'Tier 1 허가 국가' },
  { code: 'CA', name: '캐나다 (CA)', risk: 'low', note: 'Tier 1 허가 국가' },
  { code: 'BR', name: '브라질 (BR)', risk: 'medium', note: '비Tier 1 — 품목별 확인 필요' },
];

const COUNTRY_RISK_STYLE = {
  'critical':   { dot: 'bg-red-600', text: 'text-red-700', bg: 'bg-red-50',   label: '거래 금지' },
  'very-high':  { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50',   label: '매우 높음' },
  'medium':     { dot: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', label: '중간' },
  'low-medium': { dot: 'bg-yellow-400', text: 'text-yellow-600', bg: 'bg-yellow-50', label: '주의' },
  'low':        { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50',   label: '낮음' },
};

const RISK_STYLE = {
  critical: { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200',    label: '긴급' },
  high:     { dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700 border-orange-200', label: '높음' },
  medium:   { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: '중간' },
  low:      { dot: 'bg-green-400',  badge: 'bg-green-100 text-green-700 border-green-200',   label: '낮음' },
};

const CATEGORY_COLOR = {
  red:    'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  green:  'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  cyan:   'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
};

const CATEGORY_COLOR_ACTIVE = {
  red:    'bg-red-600 text-white border-red-600',
  purple: 'bg-purple-600 text-white border-purple-600',
  blue:   'bg-blue-600 text-white border-blue-600',
  green:  'bg-green-600 text-white border-green-600',
  cyan:   'bg-cyan-600 text-white border-cyan-600',
  yellow: 'bg-yellow-500 text-white border-yellow-500',
  orange: 'bg-orange-500 text-white border-orange-500',
  indigo: 'bg-indigo-600 text-white border-indigo-600',
};

const TAB_COLOR_MAP = {
  red:    { active: 'bg-red-600 text-white border-red-600',       inactive: 'bg-white text-red-700 border-red-200 hover:bg-red-50' },
  yellow: { active: 'bg-amber-500 text-white border-amber-500',   inactive: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50' },
  green:  { active: 'bg-green-600 text-white border-green-600',   inactive: 'bg-white text-green-700 border-green-200 hover:bg-green-50' },
  blue:   { active: 'bg-blue-600 text-white border-blue-600',     inactive: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' },
  indigo: { active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' },
};
let _reportTabIds = [];
let _reportTabColors = null;

// ─── 초기화 ──────────────────────────────────────────────────
window.addEventListener('load', async () => {
  if (!checkAuth()) return;
  applyPermissions();
  populateCountries();
  await loadMockData();
  setupEventListeners();
});

// 드롭다운 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('userDropdownWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('userDropdownMenu')?.classList.add('hidden');
  }
});

function toggleUserDropdown() {
  document.getElementById('userDropdownMenu').classList.toggle('hidden');
}

// ─── Demo 모드: 부서 전환 ──────────────────────────────────────
const DEMO_CREDS = {
  '영업부':    { username: 'sales_user',     password: 'sales123',     department: '영업부' },
  '로지스틱부': { username: 'logistics_user', password: 'logistics123', department: '로지스틱부' },
  '법률지원부': { username: 'legal_user',     password: 'legal123',     department: '법률지원부' },
  '경영관리부': { username: 'mgmt_user',      password: 'mgmt123',      department: '경영관리부' },
  'admin':     { username: 'admin',          password: 'admin123',     department: 'admin' },
};

async function switchDemoDept(dept) {
  const creds = DEMO_CREDS[dept];
  if (!creds) return;

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'demo-company',
        department: creds.department,
        username: creds.username,
        password: creds.password,
      }),
    });
    if (!res.ok) throw new Error('로그인 실패');
    const data = await res.json();

    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    localStorage.setItem('auth_permissions', JSON.stringify(data.permissions));
    localStorage.setItem('demo_mode', 'true');

    document.getElementById('userDropdownMenu')?.classList.add('hidden');
    applyPermissions();
  } catch (e) {
    alert('부서 전환 실패: ' + e.message);
  }
}

// 부서별 네비게이션 정의 (대시보드 첫 번째)
const DEPT_NAV = {
  '영업부':    [{ id: 'dashboard', label: '대시보드' }, { id: 'analyze', label: '규제 분석' }, { id: 'shipment', label: '출하 관리' }],
  '로지스틱부': [{ id: 'dashboard', label: '대시보드' }, { id: 'shipment', label: '출하 관리' }],
  '법률지원부': [{ id: 'dashboard', label: '대시보드' }, { id: 'analyze', label: '규제 분석' }, { id: 'legal', label: '컴플라이언스' }],
  '경영관리부': [{ id: 'dashboard', label: '현황 대시보드' }],
  'admin':     [{ id: 'dashboard', label: '대시보드' }, { id: 'analyze', label: '규제 분석' }, { id: 'shipment', label: '출하 관리' }, { id: 'legal', label: '컴플라이언스' }],
};

function applyPermissions() {
  const user = getAuthUser();
  const perms = getAuthPerms();
  if (!user || !perms) { doLogout(); return; }

  // 사용자 드롭다운 표시
  const deptLabel = user.department === 'admin' ? '관리자' : user.department;
  document.getElementById('userDropdownWrap').classList.remove('hidden');
  document.getElementById('userDeptBadge').textContent = deptLabel;
  document.getElementById('userNameText').textContent = user.username;
  document.getElementById('dropdownUsername').textContent = user.username;
  document.getElementById('dropdownDept').textContent = deptLabel;

  const dept = user.department;
  const navDefs = DEPT_NAV[dept] || [{ id: 'dashboard', label: '대시보드' }];

  // 헤더 네비게이션 버튼 동적 생성
  const headerNav = document.getElementById('headerNav');
  headerNav.classList.remove('hidden');
  headerNav.classList.add('flex');
  headerNav.innerHTML = navDefs.map(n =>
    `<button class="header-nav-btn px-4 py-2 rounded-xl border-2 border-white/30 text-white/75 text-sm font-semibold transition hover:bg-white/15 hover:text-white"
      data-section="${n.id}" onclick="switchSection('${n.id}')">${n.label}</button>`
  ).join('');

  // 출하 요청 생성 버튼: 초기화 후 영업부/admin만 표시
  const createBtn = document.getElementById('createShipmentBtn');
  if (createBtn) {
    createBtn.classList.toggle('hidden', !['영업부', 'admin'].includes(dept));
  }

  // 규제 분석 버튼: 초기화 후 권한 없으면 비활성화
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.disabled = !perms.can_analyze;
    analyzeBtn.title = perms.can_analyze ? '' : '규제 분석 권한이 없습니다.';
  }

  // Demo 모드: 부서 전환 버튼 표시 + 현재 부서 하이라이트
  const isDemoMode = localStorage.getItem('demo_mode') === 'true';
  const demoSwitcher = document.getElementById('demoDeptSwitcher');
  if (demoSwitcher) {
    demoSwitcher.classList.toggle('hidden', !isDemoMode);
    if (isDemoMode) {
      document.querySelectorAll('.demo-dept-btn').forEach(btn => {
        const isActive = btn.dataset.demoDept === dept;
        btn.className = `demo-dept-btn text-xs px-2 py-1 rounded-lg border transition ${
          isActive
            ? 'border-blue-500 bg-blue-500 text-white font-semibold'
            : 'border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300'
        }`;
      });
    }
  }

  // 첫 번째 섹션(대시보드)으로 이동
  switchSection(navDefs[0].id);
}

function switchSection(section) {
  state.currentSection = section;

  // 모든 섹션 숨김 후 해당 섹션만 표시
  ['analyze', 'shipment', 'legal', 'dashboard'].forEach(s => {
    const el = document.getElementById('section' + s.charAt(0).toUpperCase() + s.slice(1));
    if (el) el.classList.toggle('hidden', s !== section);
  });

  // 헤더 네비게이션 버튼 스타일 업데이트
  document.querySelectorAll('.header-nav-btn').forEach(b => {
    const isActive = b.dataset.section === section;
    b.className = `header-nav-btn px-4 py-2 rounded-xl border-2 text-sm font-semibold transition ${
      isActive ? 'border-white bg-white/20 text-white' : 'border-white/30 text-white/75 hover:bg-white/15 hover:text-white'
    }`;
  });

  if (section === 'shipment') loadShipments('shipment');
  if (section === 'legal') loadShipments('legal');
  if (section === 'dashboard') loadDashboard();
}

function populateCountries() {
  const sel = document.getElementById('destCountry');
  COUNTRIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

async function loadMockData() {
  try {
    const [compRes, bomRes] = await Promise.all([
      fetch('/frontend/data/mock_companies.json'),
      fetch('/frontend/data/mock_bom_items.json'),
    ]);
    state.companies = await compRes.json();
    const bomData = await bomRes.json();
    state.categories = bomData.categories;

    // 전체 아이템 인덱스 구축
    state.categories.forEach(cat => {
      cat.items.forEach(item => { state.allItemsMap[item.id] = { item, cat }; });
    });

    renderCompanies();
    renderCategoryTabs();
    if (state.categories.length > 0) selectCategory(state.categories[0].id);
  } catch (e) {
    console.error('Mock 데이터 로드 실패:', e);
  }
}

// ─── 렌더링 ──────────────────────────────────────────────────
function renderCompanies() {
  const grid = document.getElementById('companyGrid');
  state.companies.forEach(c => {
    const btn = document.createElement('button');
    btn.id = `company-btn-${c.tenant_id}`;
    btn.className = 'text-left px-2 py-1.5 border border-slate-200 rounded-lg text-xs hover:border-blue-400 hover:bg-blue-50 transition w-full cursor-pointer';
    btn.innerHTML = `<div class="font-semibold text-slate-800 truncate">${escapeHtml(c.name_ko)}</div><div class="text-slate-400">${escapeHtml(c.type)}</div>`;
    btn.addEventListener('click', () => selectCompany(c));
    grid.appendChild(btn);
  });
}

function selectCompany(company) {
  state.selectedCompany = company;
  state.companies.forEach(c => {
    const btn = document.getElementById(`company-btn-${c.tenant_id}`);
    if (!btn) return;
    btn.className = 'text-left px-2 py-1.5 border border-slate-200 rounded-lg text-xs hover:border-blue-400 hover:bg-blue-50 transition w-full cursor-pointer';
  });
  const selected = document.getElementById(`company-btn-${company.tenant_id}`);
  if (selected) selected.className = 'text-left px-2 py-1.5 border-2 border-blue-500 bg-blue-50 rounded-lg text-xs transition w-full cursor-pointer';
  document.getElementById('companySelect').value = company.tenant_id;
  const descEl = document.getElementById('companyDesc');
  descEl.textContent = `${company.name_en} · ${company.type} · ${company.description}`;
  descEl.classList.remove('hidden');
  renderCompanyBomTab(company);
  updateFinalBom();
}

function renderCompanyBomTab(company) {
  const existing = document.getElementById('cat-tab-company_samples');
  if (existing) existing.remove();

  const sampleIds = company.sample_bom_ids || [];
  if (sampleIds.length === 0) return;

  const container = document.getElementById('categoryTabs');
  const btn = document.createElement('button');
  btn.id = 'cat-tab-company_samples';
  btn.className = 'text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer bg-blue-600 text-white border-blue-600';
  btn.textContent = `⭐ ${company.name_ko} 추천`;
  btn.title = `${company.name_ko}의 대표 BOM 항목`;
  btn.addEventListener('click', () => selectCompanySamples(company));
  container.prepend(btn);

  state.categories.forEach(cat => {
    const t = document.getElementById(`cat-tab-${cat.id}`);
    if (t) t.className = `text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${CATEGORY_COLOR[cat.color] || CATEGORY_COLOR.blue}`;
  });

  selectCompanySamples(company);
}

function selectCompanySamples(company) {
  state.selectedCategory = 'company_samples';

  const sampleTab = document.getElementById('cat-tab-company_samples');
  if (sampleTab) sampleTab.className = 'text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer bg-blue-600 text-white border-blue-600';
  state.categories.forEach(cat => {
    const t = document.getElementById(`cat-tab-${cat.id}`);
    if (t) t.className = `text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${CATEGORY_COLOR[cat.color] || CATEGORY_COLOR.blue}`;
  });

  const sampleIds = company.sample_bom_ids || [];
  const sampleItems = sampleIds.map(id => state.allItemsMap[id]).filter(Boolean);

  const grid = document.getElementById('itemGrid');
  grid.innerHTML = '';

  const noteEl = document.createElement('div');
  noteEl.className = 'text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-1 leading-snug';
  noteEl.textContent = `⭐ ${company.name_ko}의 주요 BOM 항목 ${sampleItems.length}개`;
  grid.appendChild(noteEl);

  sampleItems.forEach(({ item, cat }) => {
    const rs = RISK_STYLE[item.risk] || RISK_STYLE.medium;
    const btn = document.createElement('button');
    btn.className = 'w-full text-left px-3 py-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition group flex items-start gap-3 cursor-pointer';
    btn.id = `item-${item.id}`;
    btn.innerHTML = `
      <span class="mt-1 w-2 h-2 rounded-full flex-shrink-0 ${rs.dot}"></span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-semibold text-slate-800 group-hover:text-blue-700">${escapeHtml(item.product)}</span>
          <span class="text-xs border px-1.5 py-0 rounded ${rs.badge}">${rs.label}</span>
          <span class="text-xs text-slate-400">${cat.icon}</span>
        </div>
        <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(item.designer)} · ${escapeHtml(item.process_node)} · ${escapeHtml(item.key_spec)}</div>
      </div>`;
    btn.addEventListener('click', () => selectItem(item, cat));
    grid.appendChild(btn);
  });
}

function updateFinalBom() {
  const company = state.selectedCompany;
  const item = state.selectedItem;
  const destCode = document.getElementById('destCountry').value;
  const quantity = document.getElementById('quantity').value || '1';
  const useCase = document.getElementById('useCase').value.trim();

  const country = COUNTRIES.find(c => c.code === destCode);
  const lines = [];
  if (company) lines.push(`[기업] ${company.name_ko} (${company.type})`);
  if (item)    lines.push(`[BOM] ${item.bom_text}`);
  if (country) lines.push(`[수출국] ${country.name}`);
  lines.push(`[수량] ${quantity}개`);
  if (useCase) lines.push(`[용도] ${useCase}`);

  if (lines.length > 0) {
    document.getElementById('bomItem').value = lines.join('\n');
  }
}

function renderCategoryTabs() {
  const container = document.getElementById('categoryTabs');
  container.innerHTML = '';
  state.categories.forEach(cat => {
    const btn = document.createElement('button');
    const baseClass = `text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer`;
    const colorClass = CATEGORY_COLOR[cat.color] || CATEGORY_COLOR.blue;
    btn.className = `${baseClass} ${colorClass}`;
    btn.id = `cat-tab-${cat.id}`;
    btn.textContent = `${cat.icon} ${cat.name}`;
    btn.title = cat.description;
    btn.addEventListener('click', () => selectCategory(cat.id));
    container.appendChild(btn);
  });
}

function selectCategory(categoryId) {
  state.selectedCategory = categoryId;

  // 추천 탭 비활성화
  const sampleTab = document.getElementById('cat-tab-company_samples');
  if (sampleTab) sampleTab.className = 'text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200';

  // 탭 활성화 스타일
  state.categories.forEach(cat => {
    const btn = document.getElementById(`cat-tab-${cat.id}`);
    if (!btn) return;
    const baseClass = `text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer`;
    if (cat.id === categoryId) {
      btn.className = `${baseClass} ${CATEGORY_COLOR_ACTIVE[cat.color] || CATEGORY_COLOR_ACTIVE.blue}`;
    } else {
      btn.className = `${baseClass} ${CATEGORY_COLOR[cat.color] || CATEGORY_COLOR.blue}`;
    }
  });

  const cat = state.categories.find(c => c.id === categoryId);
  if (!cat) return;
  renderItems(cat);
}

function renderItems(cat) {
  const grid = document.getElementById('itemGrid');
  grid.innerHTML = '';

  // 카테고리 설명
  const noteEl = document.createElement('div');
  noteEl.className = 'text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-1 leading-snug';
  noteEl.textContent = `⚠️ ${cat.risk_note}`;
  grid.appendChild(noteEl);

  cat.items.forEach(item => {
    const rs = RISK_STYLE[item.risk] || RISK_STYLE.medium;
    const btn = document.createElement('button');
    btn.className = `w-full text-left px-3 py-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition group flex items-start gap-3 cursor-pointer`;
    btn.id = `item-${item.id}`;
    btn.innerHTML = `
      <span class="mt-1 w-2 h-2 rounded-full flex-shrink-0 ${rs.dot}"></span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-semibold text-slate-800 group-hover:text-blue-700">${escapeHtml(item.product)}</span>
          <span class="text-xs border px-1.5 py-0 rounded ${rs.badge}">${rs.label}</span>
        </div>
        <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(item.designer)} · ${escapeHtml(item.process_node)} · ${escapeHtml(item.key_spec)}</div>
      </div>
    `;
    btn.addEventListener('click', () => selectItem(item, cat));
    grid.appendChild(btn);
  });
}

function selectItem(item, cat) {
  state.selectedItem = item;

  // 아이템 버튼 하이라이트
  cat.items.forEach(i => {
    const el = document.getElementById(`item-${i.id}`);
    if (!el) return;
    if (i.id === item.id) {
      el.classList.add('bg-blue-50', 'border-blue-400');
    } else {
      el.classList.remove('bg-blue-50', 'border-blue-400');
    }
  });

  updateFinalBom();

  // 우측 상세 카드
  renderItemDetail(item, cat);
}

function renderItemDetail(item, cat) {
  const rs = RISK_STYLE[item.risk] || RISK_STYLE.medium;

  document.getElementById('detailRiskBadge').className = `text-xs font-bold px-2 py-0.5 rounded-full border ${rs.badge}`;
  document.getElementById('detailRiskBadge').textContent = `위험도: ${rs.label}`;
  document.getElementById('detailEccn').textContent = `ECCN: ${item.eccn}`;
  document.getElementById('detailProduct').textContent = item.product;
  document.getElementById('detailDesigner').textContent = `설계사: ${item.designer} · 파운드리: ${item.foundry}`;
  document.getElementById('detailCategoryBadge').textContent = cat.icon;
  document.getElementById('detailProcess').textContent = item.process_node;
  document.getElementById('detailSpec').textContent = item.key_spec;
  document.getElementById('detailMemory').textContent = item.memory;
  document.getElementById('detailBomText').textContent = item.bom_text;
  document.getElementById('detailDesc').textContent = item.description;

  showPanel('itemDetail');
}

// ─── 이벤트 ──────────────────────────────────────────────────
function setupEventListeners() {
  document.getElementById('analyzeBtn').addEventListener('click', submitAnalysis);

  document.getElementById('destCountry').addEventListener('change', (e) => {
    const c = COUNTRIES.find(c => c.code === e.target.value);
    const noteEl = document.getElementById('countryRiskNote');
    if (c) {
      const rs = COUNTRY_RISK_STYLE[c.risk] || COUNTRY_RISK_STYLE.low;
      noteEl.className = `text-xs mt-1 px-2 py-1 rounded ${rs.bg} ${rs.text}`;
      noteEl.textContent = `${rs.label}: ${c.note}`;
      noteEl.classList.remove('hidden');
    } else {
      noteEl.classList.add('hidden');
    }
    updateFinalBom();
  });

  document.getElementById('quantity').addEventListener('input', updateFinalBom);
  document.getElementById('useCase').addEventListener('input', updateFinalBom);
}

// ─── 분석 요청 ───────────────────────────────────────────────
async function submitAnalysis() {
  const tenantId = document.getElementById('companySelect').value;
  const bomItem = document.getElementById('bomItem').value.trim();
  const destCountry = document.getElementById('destCountry').value;
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const useCase = document.getElementById('useCase').value.trim();

  if (!tenantId) { showError('기업(Tenant ID)을 선택하세요.'); return; }
  if (!bomItem)  { showError('BOM 항목을 입력하거나 위 목록에서 선택하세요.'); return; }
  if (!destCountry) { showError('수출 목적국을 선택하세요.'); return; }

  showPanel('loading');
  document.getElementById('analyzeBtn').disabled = true;

  try {
    const res = await fetch('/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ bom_item: bomItem, destination_country: destCountry, quantity, use_case: useCase || undefined }),
    });

    if (res.status === 401) { doLogout(); return; }
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();
    const country = COUNTRIES.find(c => c.code === destCountry);
    const company = state.companies.find(c => c.tenant_id === tenantId);

    renderReport(data, { bomItem, destCountry, quantity, useCase, tenantId, country, company });
    showPanel('report');

    // 영업부: 분석 완료 후 출하 요청 생성 버튼 안내 (분석 ID 자동 세팅)
    const perms = getAuthPerms();
    if (perms?.can_shipment) {
      const shipInput = document.getElementById('shipAnalysisId');
      if (shipInput) shipInput.value = data.analysis_id || '';
      const shipItemInput = document.getElementById('shipItemName');
      if (shipItemInput && !shipItemInput.value) shipItemInput.value = bomItem.split('\n')[0] || bomItem;
    }
  } catch (e) {
    showError(`분석 요청 중 오류가 발생했습니다: ${e.message}`);
  } finally {
    document.getElementById('analyzeBtn').disabled = false;
  }
}

// ─── 분석 리포트 렌더링 ──────────────────────────────────────
function renderReport(data, req) {
  const country = req.country;
  const countryRs = COUNTRY_RISK_STYLE[country?.risk] || COUNTRY_RISK_STYLE.low;

  const VERDICT = {
    CONTROLLED:   { color: 'red',    icon: '🛑', label: 'CONTROLLED (수출 통제)',    subLabel: '수출 허가 없이 반출 불가' },
    REVIEW_NEEDED:{ color: 'yellow', icon: '⚠️', label: 'REVIEW NEEDED (검토 필요)', subLabel: '전문가 검토 후 진행 여부 결정' },
    APPROVED:     { color: 'green',  icon: '✅', label: 'APPROVED (수출 승인)',       subLabel: '현재 기준상 수출 가능 (모니터링 권장)' },
  };
  const SEVERITY = {
    CRITICAL: { cls: 'bg-red-100 text-red-800 border-red-300',    label: '긴급 (CRITICAL)' },
    HIGH:     { cls: 'bg-orange-100 text-orange-800 border-orange-300', label: '높음 (HIGH)' },
    MEDIUM:   { cls: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: '중간 (MEDIUM)' },
    LOW:      { cls: 'bg-blue-100 text-blue-800 border-blue-300',  label: '낮음 (LOW)' },
  };

  const v = VERDICT[data.verdict] || VERDICT.REVIEW_NEEDED;
  const sv = SEVERITY[data.severity] || SEVERITY.MEDIUM;
  const confidencePct = Math.round(data.confidence * 100);

  const VERDICT_BG   = { red: 'bg-red-50 border-red-300',   yellow: 'bg-yellow-50 border-yellow-300', green: 'bg-green-50 border-green-300' };
  const VERDICT_TEXT = { red: 'text-red-800',                yellow: 'text-yellow-800',                green: 'text-green-700' };
  const VERDICT_BAR  = { red: 'bg-red-500',                  yellow: 'bg-yellow-400',                  green: 'bg-green-500' };

  const businessGuide = buildBusinessGuide(data.verdict, req);
  const actionsHtml   = buildActionsHtml(data);
  const basisHtml     = buildBasisHtml(data, req);
  const isControlled  = data.verdict === 'CONTROLLED';

  // 탭 정의
  const tabs = [
    { id: 1, icon: v.icon, label: '판정 결과 / 분석 요약',    colorKey: v.color },
    { id: 2, icon: '📜',   label: '규제 분석 근거',            colorKey: 'blue' },
    { id: 3, icon: '✅',   label: '필수 조치 / 담당자 가이드', colorKey: 'indigo' },
    ...(isControlled ? [{ id: 4, icon: '⚡', label: '제재 및 처벌 안내', colorKey: 'red' }] : []),
  ];

  _reportTabIds = tabs.map(t => t.id);
  _reportTabColors = {};
  tabs.forEach(t => { _reportTabColors[t.id] = TAB_COLOR_MAP[t.colorKey] || TAB_COLOR_MAP.blue; });

  const TAB_BTN_BASE = 'flex-1 flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 font-semibold text-xs transition cursor-pointer';
  const tabButtonsHtml = tabs.map(t => {
    const c = TAB_COLOR_MAP[t.colorKey] || TAB_COLOR_MAP.blue;
    return `<button id="report-tab-btn-${t.id}" onclick="switchReportTab(${t.id})"
      class="${TAB_BTN_BASE} ${c.inactive}">
      <span class="text-xl">${t.icon}</span>
      <span class="leading-snug text-center">${t.label}</span>
    </button>`;
  }).join('');

  // 탭 1: 판정 결과 + 분석 요청 요약
  const tab1Html = `
    <div class="rounded-xl shadow-sm border p-5 ${VERDICT_BG[v.color]}">
      <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">⚖️ 판정 결과</h3>
      <div class="flex items-center gap-4 mb-4">
        <span class="text-4xl">${v.icon}</span>
        <div>
          <div class="text-xl font-black ${VERDICT_TEXT[v.color]}">${v.label}</div>
          <div class="text-sm ${VERDICT_TEXT[v.color]} opacity-80">${v.subLabel}</div>
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-600 mb-1">
          <span>AI 분석 신뢰도</span>
          <span class="font-bold text-base ${VERDICT_TEXT[v.color]}">${confidencePct}%</span>
        </div>
        <div class="w-full bg-white/60 rounded-full h-2.5">
          <div class="h-full rounded-full ${VERDICT_BAR[v.color]} transition-all" style="width:${confidencePct}%"></div>
        </div>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-xs text-slate-600">심각도</span>
          <span class="text-xs px-2.5 py-0.5 rounded-full border font-bold ${sv.cls}">${sv.label}</span>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">📋 분석 요청 요약</h3>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span class="text-slate-500 text-xs">분석 기업</span>
          <div class="font-semibold text-slate-800">${escapeHtml(req.company?.name_ko || req.tenantId)}</div>
          <div class="text-xs text-slate-500">${escapeHtml(req.company?.name_en || '')} · ${escapeHtml(req.company?.type || '')}</div>
        </div>
        <div>
          <span class="text-slate-500 text-xs">수출 목적국</span>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="font-semibold text-slate-800">${escapeHtml(country?.name || req.destCountry)}</span>
            <span class="text-xs px-2 py-0.5 rounded-full border ${countryRs.bg} ${countryRs.text} font-semibold">${countryRs.label}</span>
          </div>
          <div class="text-xs text-slate-500">${escapeHtml(country?.note || '')}</div>
        </div>
        <div>
          <span class="text-slate-500 text-xs">수량</span>
          <div class="font-semibold text-slate-800">${req.quantity.toLocaleString()}개</div>
        </div>
        <div>
          <span class="text-slate-500 text-xs">최종 용도</span>
          <div class="font-semibold text-slate-800">${escapeHtml(req.useCase || '미명시')}</div>
        </div>
      </div>
      <div class="mt-3 p-3 bg-slate-50 rounded-lg">
        <span class="text-xs text-slate-500">분석 BOM 항목</span>
        <p class="text-xs text-slate-700 font-mono mt-0.5 leading-relaxed">${escapeHtml(req.bomItem)}</p>
      </div>
      <div class="mt-2 text-xs text-slate-400">분석 ID: <span class="font-mono">${escapeHtml(data.analysis_id)}</span></div>
    </div>`;

  // 탭 2: 규제 분석 근거
  const tab2Html = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">📜 규제 분석 근거</h3>
      <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg mb-3">
        <div class="w-2 h-2 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></div>
        <div>
          <div class="text-xs text-slate-500 mb-0.5">적용 규제 조항</div>
          <div class="text-sm font-bold text-slate-800 font-mono">${escapeHtml(data.basis)}</div>
        </div>
      </div>
      ${basisHtml}
    </div>
    ${buildReportSection(data)}`;

  // 탭 3: 필수 조치 + 업무 담당자 가이드
  const tab3Html = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">✅ 필수 조치 항목</h3>
      <div class="space-y-2">${actionsHtml}</div>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">🗂️ 업무 담당자 가이드</h3>
      ${businessGuide}
    </div>`;

  // 탭 4: 제재 및 처벌 (CONTROLLED 판정 시만)
  const tab4Html = buildPenaltySection();

  document.getElementById('reportCard').innerHTML = `
    <div class="flex gap-2 pb-1">
      ${tabButtonsHtml}
    </div>
    <div id="report-content-1" class="space-y-4 hidden">${tab1Html}</div>
    <div id="report-content-2" class="space-y-4 hidden">${tab2Html}</div>
    <div id="report-content-3" class="space-y-4 hidden">${tab3Html}</div>
    ${isControlled ? `<div id="report-content-4" class="space-y-4 hidden">${tab4Html}</div>` : ''}
  `;

  switchReportTab(1);
}

function switchReportTab(tabNum) {
  const BASE = 'flex-1 flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 font-semibold text-xs transition cursor-pointer';
  _reportTabIds.forEach(n => {
    const content = document.getElementById(`report-content-${n}`);
    const btn = document.getElementById(`report-tab-btn-${n}`);
    if (content) content.classList.toggle('hidden', n !== tabNum);
    if (btn && _reportTabColors?.[n]) {
      const c = _reportTabColors[n];
      btn.className = `${BASE} ${n === tabNum ? c.active : c.inactive}`;
    }
  });
}

function buildBasisHtml(data, req) {
  const regulations = data.regulations_used || [];
  const basisDetails = data.basis_details || [];
  let html = '';

  // ① BOM 대조 분석 표 (basis_details가 있을 때)
  if (basisDetails.length > 0) {
    const rows = basisDetails.map(b => {
      const triggered = !!b.triggered;
      const riskPct = b.risk_pct != null ? b.risk_pct : (triggered ? 80 : 15);
      const barColor = triggered ? 'bg-red-500' : 'bg-green-400';
      const rowBg = triggered ? 'bg-red-50' : 'bg-green-50';
      const icon = triggered ? '🔴' : '🟢';
      const actualCls = triggered ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100';
      return `
        <tr class="${rowBg} border-b border-slate-100">
          <td class="px-3 py-2.5">
            <div class="flex items-center gap-2">
              <span>${icon}</span>
              <div>
                <div class="text-xs font-bold text-slate-800">${escapeHtml(b.criterion)}</div>
                <div class="text-xs text-slate-400 font-mono mt-0.5">${escapeHtml(b.regulation || '')}</div>
              </div>
            </div>
          </td>
          <td class="px-3 py-2.5">
            <span class="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">${escapeHtml(b.threshold)}</span>
          </td>
          <td class="px-3 py-2.5">
            <span class="text-xs font-mono font-bold px-2 py-1 rounded ${actualCls}">${escapeHtml(b.actual)}${triggered ? ' ⚠️' : ' ✅'}</span>
          </td>
          <td class="px-3 py-2.5 min-w-[110px]">
            <div class="flex items-center gap-1.5">
              <div class="flex-1 bg-slate-200 rounded-full h-2">
                <div class="${barColor} h-2 rounded-full" style="width:${riskPct}%"></div>
              </div>
              <span class="text-xs font-bold w-8 text-right ${triggered ? 'text-red-700' : 'text-green-700'}">${riskPct}%</span>
            </div>
          </td>
        </tr>
        <tr class="${rowBg}">
          <td colspan="4" class="px-3 pb-2.5 text-xs text-slate-600 italic leading-relaxed">${escapeHtml(b.explanation || '')}</td>
        </tr>`;
    }).join('');

    html += `
      <div class="mb-4">
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📊 BOM 대조 분석</h4>
        <div class="overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-100">
              <tr>
                <th class="px-3 py-2 text-xs font-bold text-slate-600">판정 기준 · 조항</th>
                <th class="px-3 py-2 text-xs font-bold text-slate-600">규제 임계값</th>
                <th class="px-3 py-2 text-xs font-bold text-slate-600">BOM 실제 값</th>
                <th class="px-3 py-2 text-xs font-bold text-slate-600">위험도</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ② 참고 규제 카드 목록
  if (regulations.length > 0) {
    const triggeredMap = {};
    basisDetails.forEach(b => {
      if (b.triggered && b.regulation_id) triggeredMap[b.regulation_id] = b;
    });

    const SEV = {
      CRITICAL: { border: 'border-red-300',    dot: 'bg-red-600',    head: 'bg-red-50',    badge: 'bg-red-100 text-red-700 border-red-200' },
      HIGH:     { border: 'border-orange-300',  dot: 'bg-orange-500', head: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
      MEDIUM:   { border: 'border-yellow-300',  dot: 'bg-yellow-500', head: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      LOW:      { border: 'border-blue-200',    dot: 'bg-blue-400',   head: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
    };

    const cards = regulations.map(reg => {
      const sv = SEV[reg.severity] || SEV.MEDIUM;
      const hit = triggeredMap[reg.id];
      const isHit = !!hit;
      const borderCls = isHit ? 'border-red-400 shadow-md' : sv.border;
      const headCls   = isHit ? 'bg-red-50' : sv.head;
      const countries = (reg.affected_countries || []).join(', ');
      const hsCodes   = (reg.hs_code || []).join(', ');

      const hitBadge = isHit
        ? `<span class="text-xs px-2 py-0.5 bg-red-500 text-white rounded-full font-bold">⚡ BOM 해당</span>`
        : `<span class="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full">미해당</span>`;

      let paramSection = `
        <div class="${isHit ? 'bg-red-50 border-2 border-red-300' : 'bg-amber-50 border border-amber-200'} rounded-lg p-3">
          <div class="text-xs font-bold ${isHit ? 'text-red-700' : 'text-amber-700'} mb-1.5">
            ${isHit ? '🔴' : '⚠️'} 통제 기준 (Controlled Parameter)
          </div>
          <div class="text-xs font-mono font-bold text-slate-800 leading-relaxed">${escapeHtml(reg.controlled_parameter || '')}</div>`;

      if (isHit) {
        const rp = hit.risk_pct != null ? hit.risk_pct : 80;
        paramSection += `
          <div class="mt-2 pt-2 border-t border-red-200">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-red-700">BOM 위반 — 위험도</span>
              <span class="text-sm font-black text-red-800">${rp}%</span>
            </div>
            <div class="w-full bg-red-100 rounded-full h-2.5 mb-2">
              <div class="bg-red-500 h-2.5 rounded-full" style="width:${rp}%"></div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="bg-white border border-red-100 rounded p-2">
                <div class="text-slate-400 mb-0.5">규제 임계값</div>
                <div class="font-mono font-bold text-slate-800">${escapeHtml(hit.threshold)}</div>
              </div>
              <div class="bg-red-100 border border-red-200 rounded p-2">
                <div class="text-red-600 mb-0.5">BOM 실제 값 ⚠️</div>
                <div class="font-mono font-bold text-red-800">${escapeHtml(hit.actual)}</div>
              </div>
            </div>
            ${hit.explanation ? `<div class="mt-1.5 text-xs text-red-700 italic">${escapeHtml(hit.explanation)}</div>` : ''}
          </div>`;
      }
      paramSection += `</div>`;

      // 모든 key-value 필드 표시
      const fieldMap = [
        { key: '규제 ID',    val: reg.id },
        { key: '출처',       val: reg.source },
        { key: '고시일',     val: reg.publication_date },
        { key: '시행일',     val: reg.enforcement_date },
        { key: 'HS Code',   val: hsCodes },
        { key: '적용 국가',  val: countries },
        { key: '심각도',     val: reg.severity },
      ].filter(f => f.val);

      const fieldsHtml = fieldMap.map(f => `
        <div class="bg-slate-50 rounded p-2">
          <div class="text-xs text-slate-400 mb-0.5">${f.key}</div>
          <div class="text-xs font-semibold text-slate-700 font-mono leading-snug">${escapeHtml(f.val)}</div>
        </div>`).join('');

      return `
        <div class="border-2 ${borderCls} rounded-xl overflow-hidden">
          <div class="${headCls} px-4 py-3 flex items-start justify-between gap-3">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 ${sv.dot}"></span>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-mono font-bold text-slate-700">${escapeHtml(reg.id)}</span>
                  ${hitBadge}
                </div>
                <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(reg.source)}</div>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ${sv.badge}">${reg.severity || ''}</span>
          </div>
          <div class="bg-white p-4 space-y-3">
            <div>
              <div class="text-sm font-bold text-slate-800 mb-1">${escapeHtml(reg.title)}</div>
              <div class="text-xs text-slate-600 leading-relaxed">${escapeHtml(reg.description || '')}</div>
            </div>
            <div class="grid grid-cols-2 gap-2">${fieldsHtml}</div>
            ${paramSection}
            ${reg.excerpt ? `
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div class="text-xs font-semibold text-slate-500 mb-1">📄 규제 원문 발췌</div>
              <p class="text-xs text-slate-700 italic leading-relaxed">"${escapeHtml(reg.excerpt)}"</p>
            </div>` : ''}
          </div>
        </div>`;
    }).join('');

    html += `
      <div>
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">📋 참고 규제 목록 (${regulations.length}건)</h4>
        <div class="space-y-3">${cards}</div>
      </div>`;

  } else if (basisDetails.length === 0) {
    html += `
      <div class="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <div class="text-xs font-semibold text-blue-700 mb-1">💡 규제 근거 설명</div>
        <p class="text-sm text-blue-900 leading-relaxed">${escapeHtml(data.summary)}</p>
      </div>`;
  }

  return html;
}

function buildActionsHtml(data) {
  if (data.actions_detailed && data.actions_detailed.length > 0) {
    return data.actions_detailed.map(a => `
      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">${a.step}</span>
          <span class="text-sm font-bold text-slate-800 flex-1">${escapeHtml(a.action)}</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">${escapeHtml(a.department || '')}</span>
          ${a.timeline ? `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">${escapeHtml(a.timeline)}</span>` : ''}
        </div>
        <div class="px-4 py-2.5">
          ${a.form ? `<div class="text-xs text-slate-500 mb-1">📄 서류: <span class="font-mono font-semibold text-slate-700">${escapeHtml(a.form)}</span></div>` : ''}
          <p class="text-sm text-slate-700 leading-relaxed">${escapeHtml(a.detail || '')}</p>
        </div>
      </div>`).join('');
  }
  return data.actions.map((a, i) => `
    <div class="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
      <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">${i + 1}</span>
      <span class="text-sm text-slate-700 leading-relaxed">${escapeHtml(a)}</span>
    </div>`).join('');
}

function buildReportSection(data) {
  const text = data.report || '';
  if (!text) return '';
  const paras = text.split(/\n\n+/).filter(p => p.trim()).map(p =>
    `<p class="text-sm text-slate-700 leading-relaxed mb-3">${escapeHtml(p.trim())}</p>`
  ).join('');
  return `
    <div class="bg-white rounded-xl shadow-sm border border-indigo-200 p-5">
      <h3 class="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">📄 AI 종합 분석 레포트</h3>
      <div class="prose-sm">${paras}</div>
    </div>`;
}

function buildBusinessGuide(verdict, req) {
  if (verdict === 'CONTROLLED') {
    return `
      <div class="space-y-3 text-sm text-slate-700">
        <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="font-bold text-red-800 mb-1">🚫 즉시 조치 필요</p>
          <p>해당 제품은 <strong>미국 수출관리규정(EAR)</strong> 또는 동등 수출통제법의 적용을 받습니다. 수출허가(Export License) 없이 지정된 국가로 반출할 경우 심각한 법적 제재를 받을 수 있습니다.</p>
        </div>
        <div class="p-3 bg-white border border-slate-200 rounded-lg">
          <p class="font-semibold text-slate-800 mb-2">📞 연락해야 할 부서</p>
          <ul class="space-y-1 text-slate-600">
            <li>• <strong>수출팀(무역팀)</strong>: 출하 일시 중단 요청</li>
            <li>• <strong>법무팀(컴플라이언스)</strong>: 수출허가 신청 절차 착수</li>
            <li>• <strong>SCM/물류팀</strong>: 창고·물류사에 Hold 지시</li>
            <li>• <strong>파트너사 담당자</strong>: 지연 안내 공식 서한 발송</li>
          </ul>
        </div>
        <div class="p-3 bg-white border border-slate-200 rounded-lg">
          <p class="font-semibold text-slate-800 mb-2">⏱️ 예상 처리 일정</p>
          <div class="space-y-1 text-slate-600">
            <div class="flex justify-between"><span>BIS 수출허가 신청 접수</span><span class="font-semibold">즉시~1주</span></div>
            <div class="flex justify-between"><span>BIS 처리 기간 (일반)</span><span class="font-semibold">4~8주</span></div>
            <div class="flex justify-between"><span>복잡 사안 처리 기간</span><span class="font-semibold">3~6개월+</span></div>
          </div>
        </div>
        <p class="text-xs text-slate-500">※ 본 분석은 참고용이며 법적 효력이 없습니다. 최종 판단은 반드시 법무·컴플라이언스팀의 공식 검토를 받으시기 바랍니다.</p>
      </div>`;
  }
  if (verdict === 'REVIEW_NEEDED') {
    return `
      <div class="space-y-3 text-sm text-slate-700">
        <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="font-bold text-yellow-800 mb-1">⚠️ 전문가 검토 후 진행</p>
          <p>이 제품의 수출 가능 여부가 기술적 파라미터 또는 최종 사용자에 따라 달라질 수 있습니다. 수출 전 반드시 법무팀의 확인을 받으세요.</p>
        </div>
        <div class="p-3 bg-white border border-slate-200 rounded-lg">
          <p class="font-semibold text-slate-800 mb-2">📋 추가 확인이 필요한 사항</p>
          <ul class="space-y-1 text-slate-600">
            <li>• 정확한 기술 파라미터(공정 노드, 성능 수치) 재확인</li>
            <li>• 최종 사용자(End-User) 및 최종 사용 목적(End-Use) 확인</li>
            <li>• 목적국 내 Entity List 등재 기업 여부 확인</li>
            <li>• 재수출(Re-export) 가능성 검토</li>
          </ul>
        </div>
        <p class="text-xs text-slate-500">※ 검토 결과에 따라 수출허가 신청이 필요할 수 있습니다.</p>
      </div>`;
  }
  // APPROVED
  return `
    <div class="space-y-3 text-sm text-slate-700">
      <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p class="font-bold text-green-800 mb-1">✅ 현재 기준 수출 가능</p>
        <p>현재 적용 가능한 수출통제 기준에서 이 제품은 수출허가 없이 진행 가능합니다. 다만 규제는 수시로 변경될 수 있으므로 지속적인 모니터링이 필요합니다.</p>
      </div>
      <div class="p-3 bg-white border border-slate-200 rounded-lg">
        <p class="font-semibold text-slate-800 mb-2">📌 권장 사항</p>
        <ul class="space-y-1 text-slate-600">
          <li>• 수출 관련 서류(최종 사용자 확인서 등) 보관</li>
          <li>• EAR 규제 변경 사항 정기 모니터링</li>
          <li>• 최종 사용자의 Entity List 등재 여부 주기적 확인</li>
        </ul>
      </div>
      <p class="text-xs text-slate-500">※ 규제 현황은 수시로 변경됩니다. 분석일 기준 정보이며 최신 관보 확인을 권장합니다.</p>
    </div>`;
}

function buildPenaltySection() {
  return `
    <div class="bg-white rounded-xl shadow-sm border border-red-200 p-5">
      <h3 class="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">⚡ 미준수 시 제재 및 처벌</h3>
      <div class="grid grid-cols-3 gap-3 text-sm">
        <div class="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
          <div class="text-2xl mb-1">💸</div>
          <div class="font-bold text-red-800 text-xs mb-0.5">민사 과징금</div>
          <div class="text-xs text-red-700">건당 최대<br><strong>$1M USD</strong><br>또는 거래금액의 2배</div>
        </div>
        <div class="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
          <div class="text-2xl mb-1">🚫</div>
          <div class="font-bold text-red-800 text-xs mb-0.5">거래 제한</div>
          <div class="text-xs text-red-700">BIS Entity List 등재<br>미국 부품·기술<br><strong>조달 전면 차단</strong></div>
        </div>
        <div class="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
          <div class="text-2xl mb-1">⚖️</div>
          <div class="font-bold text-red-800 text-xs mb-0.5">형사 처벌</div>
          <div class="text-xs text-red-700">최대 징역<br><strong>20년</strong><br>(미국 수출통제법)</div>
        </div>
      </div>
      <p class="text-xs text-red-600 mt-3 bg-red-50 p-2 rounded">⚠️ BIS Entity List 등재 시 TSMC·ASML 등 핵심 공급사로부터 제품·장비 공급이 즉시 차단될 수 있어 기업 존속에 직접적인 위협이 됩니다.</p>
    </div>`;
}

// ─── UI 유틸 ─────────────────────────────────────────────────
function showPanel(panel) {
  document.getElementById('welcomeCard').classList.add('hidden');
  document.getElementById('itemDetailCard').classList.add('hidden');
  document.getElementById('loadingCard').classList.add('hidden');
  document.getElementById('errorCard').classList.add('hidden');
  document.getElementById('reportCard').classList.add('hidden');

  if (panel === 'welcome')    document.getElementById('welcomeCard').classList.remove('hidden');
  if (panel === 'itemDetail') document.getElementById('itemDetailCard').classList.remove('hidden');
  if (panel === 'loading')    document.getElementById('loadingCard').classList.remove('hidden');
  if (panel === 'error')      document.getElementById('errorCard').classList.remove('hidden');
  if (panel === 'report')     document.getElementById('reportCard').classList.remove('hidden');
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showPanel('error');
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));
}

// ─── 출하 워크플로우 ──────────────────────────────────────────
const STATUS_LABEL = {
  PENDING:        { label: '승인 대기',          cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  LEGAL_APPROVED: { label: '컴플라이언스 승인',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  LEGAL_REJECTED: { label: '반려',               cls: 'bg-red-100 text-red-700 border-red-200' },
  LOGISTICS_DONE: { label: '선적 완료',          cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  AUDIT_COMPLETE: { label: '감사 완료',          cls: 'bg-green-100 text-green-700 border-green-200' },
};

async function loadShipments(section = 'shipment') {
  const listId = section === 'legal' ? 'legalShipmentList' : 'shipmentList';
  const listEl = document.getElementById(listId);
  if (!listEl) return;
  listEl.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">불러오는 중...</p>';
  try {
    const res = await fetch('/api/v1/shipments', { headers: getAuthHeaders() });
    if (res.status === 401) { doLogout(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const shipments = await res.json();
    if (section === 'legal') renderLegalList(shipments, listEl);
    else renderShipmentList(shipments, listEl);
  } catch (e) {
    listEl.innerHTML = `<p class="text-sm text-red-500 text-center py-4">목록 로드 오류: ${e.message}</p>`;
  }
}

function _buildShipmentCard(s, actionBtnsHtml, extraHtml = '') {
  const st = STATUS_LABEL[s.status] || STATUS_LABEL.PENDING;
  const isRejected = s.status === 'LEGAL_REJECTED';

  const steps = [
    { label: '출하 요청 생성',       done: true,                                                                              by: '' },
    { label: isRejected ? '법률지원부 반려' : '법률지원부 승인', done: ['LEGAL_APPROVED','LEGAL_REJECTED','LOGISTICS_DONE','AUDIT_COMPLETE'].includes(s.status), by: s.legal_approved_by || '', rejected: isRejected },
    { label: '선적 완료',             done: ['LOGISTICS_DONE','AUDIT_COMPLETE'].includes(s.status),                          by: s.logistics_done_by || '' },
    { label: '사후 감사 완료',        done: s.status === 'AUDIT_COMPLETE',                                                   by: s.audit_done_by || '' },
  ];

  const stepsHtml = steps.map(step => `
    <div class="flex items-center gap-2 text-xs">
      <span class="${step.rejected ? 'text-red-500' : step.done ? 'text-green-500' : 'text-slate-300'}">${step.rejected ? '❌' : step.done ? '✅' : '⬜'}</span>
      <span class="${step.rejected ? 'text-red-600 font-semibold' : step.done ? 'text-slate-700 font-semibold' : 'text-slate-400'}">${step.label}</span>
      ${step.by ? `<span class="text-slate-400">(${escapeHtml(step.by)})</span>` : ''}
    </div>`).join('');

  const rejectedNote = isRejected && s.legal_rejected_reason
    ? `<div class="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-800"><strong>반려 사유:</strong> ${escapeHtml(s.legal_rejected_reason)}</div>`
    : '';
  const logisticsNote = s.logistics_result
    ? `<div class="mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800"><strong>선적 결과:</strong> ${escapeHtml(s.logistics_result)}</div>`
    : '';

  return `
    <div class="border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-slate-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800 text-sm">${escapeHtml(s.item_name)}</span>
            <span class="text-xs border px-2 py-0.5 rounded-full ${st.cls}">${st.label}</span>
          </div>
          <div class="text-xs text-slate-500 mt-0.5">${s.quantity.toLocaleString()}개 · ${escapeHtml(s.destination)} · ${s.created_at?.slice(0,10) || ''}</div>
        </div>
        <div class="flex gap-2">${actionBtnsHtml}</div>
      </div>
      <div class="px-4 py-3 space-y-1.5">
        ${stepsHtml}
        ${rejectedNote}
        ${logisticsNote}
        ${extraHtml}
      </div>
    </div>`;
}

// 영업부 / 로지스틱부용 출하 목록
function renderShipmentList(shipments, listEl) {
  const user = getAuthUser();
  const dept = user?.department || '';

  if (!shipments.length) {
    listEl.innerHTML = '<p class="text-sm text-slate-400 text-center py-8">출하 요청 내역이 없습니다.</p>';
    return;
  }

  listEl.innerHTML = shipments.map(s => {
    const canLogDone = (dept === '로지스틱부' || dept === 'admin') && s.status === 'LEGAL_APPROVED';
    const actionBtns = [
      canLogDone ? `<button onclick="openLogisticsForm('${s.id}')" class="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition">선적 완료 보고</button>` : '',
    ].filter(Boolean).join('');
    return _buildShipmentCard(s, actionBtns);
  }).join('');
}

// 법률지원부용 컴플라이언스 목록
function renderLegalList(shipments, listEl) {
  const user = getAuthUser();
  const dept = user?.department || '';

  if (!shipments.length) {
    listEl.innerHTML = '<p class="text-sm text-slate-400 text-center py-8">출하 요청 내역이 없습니다.</p>';
    return;
  }

  listEl.innerHTML = shipments.map(s => {
    const canApprove = (dept === '법률지원부' || dept === 'admin') && s.status === 'PENDING';
    const canReject  = canApprove;
    const canAudit   = (dept === '법률지원부' || dept === 'admin') && s.status === 'LOGISTICS_DONE';

    const actionBtns = [
      canApprove ? `<button onclick="legalApprove('${s.id}')" class="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition">승인</button>` : '',
      canReject  ? `<button onclick="openRejectForm('${s.id}')" class="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition">반려</button>` : '',
      canAudit   ? `<button onclick="auditComplete('${s.id}')" class="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition">감사 완료</button>` : '',
    ].filter(Boolean).join('');
    return _buildShipmentCard(s, actionBtns);
  }).join('');
}

function openCreateShipment() {
  document.getElementById('createShipmentForm').classList.remove('hidden');
  document.getElementById('createShipmentBtn').classList.add('hidden');
}
function closeCreateShipment() {
  document.getElementById('createShipmentForm').classList.add('hidden');
  document.getElementById('createShipmentBtn').classList.remove('hidden');
}

async function submitCreateShipment() {
  const itemName   = document.getElementById('shipItemName').value.trim();
  const quantity   = parseInt(document.getElementById('shipQuantity').value) || 0;
  const destination = document.getElementById('shipDestination').value.trim().toUpperCase();
  const analysisId = document.getElementById('shipAnalysisId').value.trim();

  if (!itemName || !quantity || !destination) {
    alert('품목명, 수량, 목적국을 모두 입력하세요.'); return;
  }

  try {
    const res = await fetch('/api/v1/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ item_name: itemName, quantity, destination, analysis_id: analysisId || undefined }),
    });
    if (res.status === 401) { doLogout(); return; }
    if (!res.ok) { const e = await res.json(); alert(e.detail || '요청 실패'); return; }
    closeCreateShipment();
    document.getElementById('shipItemName').value = '';
    document.getElementById('shipQuantity').value = '1';
    document.getElementById('shipDestination').value = '';
    document.getElementById('shipAnalysisId').value = '';
    loadShipments();
  } catch (e) { alert('요청 오류: ' + e.message); }
}

async function legalApprove(id) {
  if (!confirm('컴플라이언스 승인을 진행하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/v1/shipments/${id}/approve`, { method: 'PATCH', headers: getAuthHeaders() });
    if (res.status === 401) { doLogout(); return; }
    if (!res.ok) { const e = await res.json(); alert(e.detail || '승인 실패'); return; }
    loadShipments('legal');
  } catch (e) { alert('오류: ' + e.message); }
}

function openRejectForm(id) {
  document.getElementById('rejectShipmentId').value = id;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectShipmentForm').classList.remove('hidden');
  document.getElementById('rejectShipmentForm').scrollIntoView({ behavior: 'smooth' });
}
function closeRejectForm() {
  document.getElementById('rejectShipmentForm').classList.add('hidden');
}

async function submitRejectShipment() {
  const id = document.getElementById('rejectShipmentId').value;
  const reason = document.getElementById('rejectReason').value.trim();
  if (!reason) { alert('반려 사유를 입력해주세요.'); return; }
  try {
    const res = await fetch(`/api/v1/shipments/${id}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason }),
    });
    if (res.status === 401) { doLogout(); return; }
    if (!res.ok) { const e = await res.json(); alert(e.detail || '반려 실패'); return; }
    closeRejectForm();
    loadShipments('legal');
  } catch (e) { alert('오류: ' + e.message); }
}

function openLogisticsForm(id) {
  document.getElementById('logisticsShipmentId').value = id;
  document.getElementById('logisticsResult').value = '';
  document.getElementById('logisticsDoneForm').classList.remove('hidden');
  document.getElementById('logisticsDoneForm').scrollIntoView({ behavior: 'smooth' });
}
function closeLogisticsForm() {
  document.getElementById('logisticsDoneForm').classList.add('hidden');
}

async function submitLogisticsDone() {
  const id     = document.getElementById('logisticsShipmentId').value;
  const result = document.getElementById('logisticsResult').value.trim();
  if (!result) { alert('선적 결과를 입력해주세요.'); return; }

  try {
    const res = await fetch(`/api/v1/shipments/${id}/logistics-done`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ result }),
    });
    if (res.status === 401) { doLogout(); return; }
    if (!res.ok) { const e = await res.json(); alert(e.detail || '제출 실패'); return; }
    closeLogisticsForm();
    loadShipments();
  } catch (e) { alert('오류: ' + e.message); }
}

async function auditComplete(id) {
  if (!confirm('사후 감사를 완료 처리하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/v1/shipments/${id}/audit-complete`, { method: 'PATCH', headers: getAuthHeaders() });
    if (res.status === 401) { doLogout(); return; }
    if (!res.ok) { const e = await res.json(); alert(e.detail || '처리 실패'); return; }
    loadShipments('legal');
  } catch (e) { alert('오류: ' + e.message); }
}

// ─── 대시보드 ────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await fetch('/api/v1/dashboard/my-activity', { headers: getAuthHeaders() });
    if (res.status === 401) { doLogout(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderDashboard(data);
    loadAiSummary(data);
  } catch (e) {
    document.getElementById('aiSummaryPanel').innerHTML =
      `<p class="text-sm text-red-500">대시보드 로드 오류: ${e.message}</p>`;
  }
}

function _statCard(value, label, bgCls, textCls) {
  return `
    <div class="${bgCls} rounded-xl p-4 text-center border">
      <div class="text-3xl font-black ${textCls}">${value ?? 0}</div>
      <div class="text-xs text-slate-500 mt-1 font-semibold">${label}</div>
    </div>`;
}

function renderDashboard(data) {
  const dept = data.department;
  const grid = document.getElementById('dashboardStatsGrid');
  const listEl = document.getElementById('dashboardShipmentList');
  const listTitle = document.getElementById('dashboardListTitle');
  const statusBarsEl = document.getElementById('dashboardStatusBars');

  let statsHtml = '';
  let recent = [];
  let titleText = '최근 활동 내역';
  let gridCols = 'grid grid-cols-2 gap-3 sm:grid-cols-4';

  if (dept === '영업부') {
    statsHtml =
      _statCard(data.my_total, '내 출하 요청', 'bg-slate-50 border-slate-200', 'text-slate-700') +
      _statCard(data.my_pending, '승인 대기', 'bg-yellow-50 border-yellow-200', 'text-yellow-600') +
      _statCard(data.my_in_progress, '진행 중', 'bg-blue-50 border-blue-200', 'text-blue-600') +
      _statCard(data.my_completed, '감사 완료', 'bg-green-50 border-green-200', 'text-green-600');
    recent = data.recent || [];
    titleText = '내 출하 요청 이력';

  } else if (dept === '로지스틱부') {
    gridCols = 'grid grid-cols-2 gap-3';
    statsHtml =
      _statCard(data.awaiting_logistics, '선적 대기', 'bg-yellow-50 border-yellow-200', 'text-yellow-600') +
      _statCard(data.my_completed, '내 선적 완료', 'bg-green-50 border-green-200', 'text-green-600');
    recent = data.recent || [];
    titleText = '내 선적 완료 이력';

  } else if (dept === '법률지원부') {
    gridCols = 'grid grid-cols-2 gap-3 sm:grid-cols-5';
    statsHtml =
      _statCard(data.pending_review, '승인 대기', 'bg-yellow-50 border-yellow-200', 'text-yellow-600') +
      _statCard(data.my_approved, '내 승인', 'bg-blue-50 border-blue-200', 'text-blue-600') +
      _statCard(data.my_rejected, '내 반려', 'bg-red-50 border-red-200', 'text-red-600') +
      _statCard(data.pending_audit, '감사 대기', 'bg-amber-50 border-amber-200', 'text-amber-600') +
      _statCard(data.my_audit_done, '내 감사 완료', 'bg-green-50 border-green-200', 'text-green-600');
    recent = data.recent || [];
    titleText = '내 컴플라이언스 처리 이력';

  } else {
    // 경영관리부 / admin
    statsHtml =
      _statCard(data.total_shipments, '전체 출하 요청', 'bg-slate-50 border-slate-200', 'text-slate-700') +
      _statCard(data.pending_approval, '승인 대기', 'bg-yellow-50 border-yellow-200', 'text-yellow-600') +
      _statCard(data.in_progress, '진행 중', 'bg-blue-50 border-blue-200', 'text-blue-600') +
      _statCard(data.completed, '감사 완료', 'bg-green-50 border-green-200', 'text-green-600');
    recent = data.recent_shipments || [];
    titleText = '최근 출하 현황';

    // 상태별 분포 바
    const byStatus = data.by_status || {};
    const total = data.total_shipments || 1;
    const STATUS_BAR = {
      PENDING:        { label: '승인 대기',         color: 'bg-slate-400' },
      LEGAL_APPROVED: { label: '컴플라이언스 승인', color: 'bg-blue-500' },
      LEGAL_REJECTED: { label: '반려',              color: 'bg-red-500' },
      LOGISTICS_DONE: { label: '선적 완료',         color: 'bg-amber-500' },
      AUDIT_COMPLETE: { label: '감사 완료',         color: 'bg-green-500' },
    };
    const barsHtml = Object.entries(byStatus).map(([status, count]) => {
      const cfg = STATUS_BAR[status] || { label: status, color: 'bg-slate-400' };
      const pct = Math.round((count / total) * 100);
      return `
        <div class="flex items-center gap-3 text-xs">
          <span class="w-28 text-slate-600 text-right">${cfg.label}</span>
          <div class="flex-1 bg-slate-100 rounded-full h-2">
            <div class="${cfg.color} h-2 rounded-full" style="width:${pct}%"></div>
          </div>
          <span class="w-8 text-slate-500 font-semibold">${count}</span>
        </div>`;
    }).join('');
    if (barsHtml) {
      statusBarsEl.classList.remove('hidden');
      document.getElementById('statusBarsContent').innerHTML = barsHtml;
    }
  }

  grid.className = gridCols;
  grid.innerHTML = statsHtml;
  if (listTitle) listTitle.textContent = titleText;

  if (!recent.length) {
    listEl.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">활동 내역이 없습니다.</p>';
    return;
  }
  listEl.innerHTML = recent.map(s => {
    const st = STATUS_LABEL[s.status] || STATUS_LABEL.PENDING;
    return `
      <div class="flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition">
        <div>
          <span class="font-semibold text-slate-800">${escapeHtml(s.item_name)}</span>
          <span class="text-slate-400 text-xs ml-2">${s.quantity?.toLocaleString()}개 · ${escapeHtml(s.destination)}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-400">${s.created_at?.slice(0,10) || ''}</span>
          <span class="text-xs border px-2 py-0.5 rounded-full ${st.cls}">${st.label}</span>
        </div>
      </div>`;
  }).join('');
}

async function loadAiSummary(stats) {
  const panel = document.getElementById('aiSummaryPanel');
  panel.innerHTML = `
    <div class="flex items-center gap-2 text-slate-400 text-sm py-2">
      <div class="spinner" style="width:16px;height:16px;border-width:2px"></div>
      AI가 현황을 분석 중입니다...
    </div>`;
  try {
    const user = getAuthUser();
    const res = await fetch('/api/v1/dashboard/ai-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ department: user?.department || '', stats }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    panel.innerHTML = `
      <div class="text-sm text-slate-700 leading-relaxed p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        ${escapeHtml(data.summary)}
      </div>`;
  } catch (e) {
    panel.innerHTML = `<p class="text-sm text-slate-400 py-2">AI 요약 생성에 실패했습니다.</p>`;
  }
}
