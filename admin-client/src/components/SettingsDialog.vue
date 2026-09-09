<script setup>
/**
 * SettingsDialog — 우측 상단 사용자 메뉴 → [설정] 으로 여는 대화상자. (v1.7.5)
 *
 *  탭 3개
 *    내 정보   : 아이디/이름/이메일/역할 (읽기 전용) + 비밀번호 변경
 *    화면      : 사이드바 접힘 기억 등 브라우저에 저장되는 표시 설정
 *    서버 정보 : /health 가 주는 버전 정보 (읽기 전용)
 *
 *  ⚠ 비밀번호 변경이 여기 있는 이유:
 *    예전에는 [사용자 관리] 화면에만 있었는데 그 메뉴는 role=admin 에게만 보인다.
 *    admin 이 아닌 콘솔 계정은 자기 비밀번호를 바꿀 방법이 아예 없었다.
 *    PUT /api/admin/users/me/password 는 @Auth() 라 모든 로그인 사용자가 쓸 수 있다.
 */
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
// ★ v1.10.0 — 다국어
import { useI18n } from '../composables/useI18n';
import { useFormat } from '../composables/useFormat';
import http from '../api/http';
import { useAuthStore } from '../stores/auth';
import { useUiFlagsStore } from '../stores/uiFlags';   // ★ v1.14.6 — 빠져 있던 import (EAI 스위치가 쓰는 스토어)
import { PREF_KEYS, readPref, writePref } from '../utils/prefs';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['close', 'prefs-changed']);

const auth = useAuthStore();
const { t, locale, locales, setLocale, resetLocale } = useI18n();

const fmt = useFormat();
const tab = ref('account');

/* ★ v1.12.0 — 설정 대화상자를 요즘 데스크톱 앱(VS Code · Linear · Raycast) 방식으로 다시 만들었다.
     · 위쪽 탭 → **왼쪽 섹션 목록(rail)**: 항목이 늘어도 줄바꿈되지 않고, 어디에 무엇이 있는지 한눈에
     · 검색 한 칸으로 설정 찾기 (설정이 늘수록 탭보다 검색이 빠르다)
     · 스위치·세그먼트 행: 제목 + 한 줄 설명 + 오른쪽 컨트롤 (한 행에 하나의 결정)
     · 바꾸면 바로 저장하고 "저장됨" 을 잠깐 보여 준다 (확인 버튼 없음)
     · 접근성: role=dialog · aria-modal · aria-labelledby · 포커스 가두기 · Esc 닫기 · 닫으면 원래 자리로
     · 배경은 옅은 유리(블ur) — 뒤 화면이 사라지지 않아 "잠깐 떠 있는 층" 으로 읽힌다
     · prefers-reduced-motion 을 존중해 애니메이션을 끈다 */
const SECTIONS = [
  { key: 'account',   icon: 'bi-person-circle',    titleKey: 'set2.myAccount',   words: '계정 내 정보 비밀번호 password account 이메일 역할' },
  { key: 'display',   icon: 'bi-palette',          titleKey: 'set2.appearance',  words: '화면 테마 다크 라이트 밀도 언어 사이드바 theme dark density language' },
  { key: 'workspace', icon: 'bi-folder2-open',     titleKey: 'set2.workspace',   words: '작업 폴더 저장 위치 컨트롤러 서비스 SQL 시나리오 workspace folder 스키마 테이블 DB schema table' },
  { key: 'server',    icon: 'bi-hdd-network',      titleKey: 'set2.serverInfo',  words: '서버 버전 빌드 정보 version build' },
];
const query = ref('');
const visibleSections = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return SECTIONS;
  return SECTIONS.filter((sc) => `${t(sc.titleKey)} ${sc.words}`.toLowerCase().includes(q));
});
watch(visibleSections, (list) => { if (list.length && !list.some((sc) => sc.key === tab.value)) tab.value = list[0].key; });

/* 저장됨 표시 — 바꾸면 잠깐 떴다 사라진다 */
const savedAt = ref(0);
let savedTimer = null;
function flashSaved() {
  savedAt.value = Date.now();
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { savedAt.value = 0; }, 1600);
}

/* 포커스 가두기 + Esc — W3C Dialog 패턴 */
const dialogEl = ref(null);
let lastFocused = null;
/* Esc 는 창 전체에서 받는다 — 대화상자 안에 포커스가 없을 때도 닫히도록 (W3C Dialog 패턴) */
function onWindowKey(e) { if (e.key === 'Escape' && props.open) { e.stopPropagation(); close(); } }
watch(() => props.open, (v) => {
  if (v) { window.addEventListener('keydown', onWindowKey, true); loadFeatures(); }
  else window.removeEventListener('keydown', onWindowKey, true);
});

function trapTab(e) {
  if (e.key !== 'Tab' || !dialogEl.value) return;
  const items = [...dialogEl.value.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ---------------- 내 정보 ---------------- */
const me = computed(() => auth.user || {});
const roleLabel = computed(() => (me.value.role === 'admin' ? `${t('designer.set_adminRole')} (admin)` : (me.value.role === 'user' ? `${t('designer.set_userRole')} (user)` : me.value.role)));

/* ---------------- 비밀번호 변경 ---------------- */
const pwd = reactive({
  open: false, current: '', next: '', confirm: '',
  saving: false, error: null, message: null, show: false,
});

function resetPwd() {
  pwd.open = false; pwd.current = ''; pwd.next = ''; pwd.confirm = '';
  pwd.saving = false; pwd.error = null; pwd.message = null; pwd.show = false;
}

/** 서버 정책과 같은 규칙을 화면에서 먼저 걸러 준다 (서버도 다시 검사한다) */
const pwdRule = computed(() => {
  const v = pwd.next;
  return {
    length: v.length >= 10,
    mix: /[A-Za-z]/.test(v) && /[0-9]/.test(v),
    match: v.length > 0 && v === pwd.confirm,
    notSame: v.length > 0 && v !== pwd.current,
  };
});
const pwdOk = computed(() => Object.values(pwdRule.value).every(Boolean) && pwd.current.length > 0);

async function savePwd() {
  pwd.error = null; pwd.message = null;
  if (pwd.next !== pwd.confirm) { pwd.error = '새 비밀번호가 서로 다릅니다.'; return; }
  pwd.saving = true;
  try {
    await http.put('/api/admin/users/me/password', {
      currentPassword: pwd.current,
      newPassword: pwd.next,
    });
    // 비밀번호 변경은 이전 토큰을 폐기하므로 새 비밀번호로 세션을 갱신한다.
    await auth.login({ username: auth.user.username, password: pwd.next });
    pwd.message= t('settingsLabel.k7');
    pwd.current = ''; pwd.next = ''; pwd.confirm = '';
    if (auth.user) auth.user.mustChangePassword = false;
    setTimeout(() => { pwd.open = false; pwd.message = null; }, 1200);
  } catch (e) {
    pwd.error = e?.response?.data?.message || e.message || '변경에 실패했습니다.';
  } finally {
    pwd.saving = false;
  }
}

/* ---------------- 화면 설정 ---------------- */
const prefs = reactive({
  rememberSidebar: readPref(PREF_KEYS.rememberSidebar, false),
  confirmLogout: readPref(PREF_KEYS.confirmLogout, true),
  theme: readPref(PREF_KEYS.theme, 'light'),          // v1.7.8
  density: readPref(PREF_KEYS.density, 'comfortable'), // v1.7.9
});
watch(prefs, () => {
  flashSaved();
  writePref(PREF_KEYS.rememberSidebar, prefs.rememberSidebar);
  writePref(PREF_KEYS.confirmLogout, prefs.confirmLogout);
  writePref(PREF_KEYS.theme, prefs.theme);
  writePref(PREF_KEYS.density, prefs.density);
  emit('prefs-changed', { ...prefs });
}, { deep: true });

/* ---------------- 서버 정보 ---------------- */
const server = ref({ version: '…', channel: '', builtAt: null });
onMounted(async () => {
  try {
    const r = await fetch('/health').then((x) => x.json());
    server.value = { version: r.version || '?', channel: r.channel || '', builtAt: r.builtAt || null };
  } catch { server.value = { version: '?', channel: '', builtAt: null }; }
});
const builtAtText = computed(() => (server.value.builtAt
  ? fmt.dateTime(server.value.builtAt)
  : '개발 중 실행'));

/* ---------------- 작업 폴더 (★ v1.12.0) ---------------- */
const uiFlags = useUiFlagsStore();
const ws = reactive({ loading: false, data: null, loadError: null, error: null, editing: false, dir: '', create: true, saving: false, savedNote: null });
const isAdmin = computed(() => (auth.user?.role || '') === 'admin');
async function loadWorkspace() {
  ws.loading = true; ws.loadError = null;
  try {
    ws.data = (await http.get('/api/admin/config/workspace')).data?.data || null;
    ws.dir = ws.data?.configured || '';
  } catch (e) { ws.loadError = e?.response?.data?.message || e.message; }
  finally { ws.loading = false; }
}
async function saveWorkspace() {
  ws.saving = true; ws.error = null; ws.savedNote = null;
  try {
    const r = await http.put('/api/admin/config/workspace', { dir: ws.dir.trim(), create: ws.create });
    ws.data = r.data?.data || ws.data;
    ws.editing = false;
    ws.savedNote = ws.data?.enabled
      ? t('set2.wsSavedOn', { dir: ws.data.configured })
      : t('set2.wsSavedOff');
    flashSaved();
  } catch (e) { ws.error = e?.response?.data?.message || e.message; }
  finally { ws.saving = false; }
}
/* ★ v1.12.2 — 업무 테이블 스키마 (내가 만드는 테이블이 있는 곳) */
const sc = reactive({ loading: false, data: null, loadError: null, error: null, editing: false, name: '', create: false, saving: false, savedNote: null });
async function loadSchema() {
  sc.loading = true; sc.loadError = null;
  try {
    sc.data = (await http.get('/api/admin/config/app-schema')).data?.data || null;
    sc.name = sc.data?.configured || '';
  } catch (e) { sc.loadError = e?.response?.data?.message || e.message; }
  finally { sc.loading = false; }
}
async function saveSchema() {
  sc.saving = true; sc.error = null; sc.savedNote = null;
  try {
    const r = await http.put('/api/admin/config/app-schema', { schema: sc.name.trim(), create: sc.create });
    sc.data = r.data?.data || sc.data;
    sc.editing = false;
    sc.savedNote = sc.data?.configured ? t('set2.scSavedOn', { name: sc.data.configured }) : t('set2.scSavedOff', { name: sc.data?.connectionSchema || '' });
    flashSaved();
  } catch (e) { sc.error = e?.response?.data?.message || e.message; }
  finally { sc.saving = false; }
}
/* ★ v1.13.3 — EAI(전문 연동) 메뉴 표시.
     처음 쓰는 사람에게 "MCI 컨트롤러 생성" 은 무엇인지 알 수 없는 메뉴였다. 기본은 꺼 두고 여기서 켠다. */
const eai = reactive({ loading: false, enabled: false, saving: false, note: '', savedNote: null, error: null });

/* ★ v1.26.0 — 엔터프라이즈 기능 켜기/끄기 */
const features = reactive({ data: { backup: false, secureColumns: false, ha: false }, saving: false, savedNote: '', error: '' });
const featureItems = computed(() => ([
  { key: 'backup',        label: t('menu.backup'),        note: t('set3.entBackup') },
  { key: 'secureColumns', label: t('menu.secureColumns'), note: t('set3.entSecure') },
  { key: 'ha',            label: t('menu.ha'),            note: t('set3.entHa') },
]));

async function loadFeatures() {
  try { features.data = (await http.get('/api/admin/system/features')).data?.data || features.data; }
  catch { /* 관리자가 아니면 못 읽는다 — 조용히 둔다 */ }
}

async function toggleFeature(key, on) {
  features.saving = true; features.error = ''; features.savedNote = '';
  try {
    const r = await http.put('/api/admin/system/features', { ...features.data, [key]: on });
    const d = r.data?.data || {};
    features.data = { backup: !!d.backup, secureColumns: !!d.secureColumns, ha: !!d.ha };
    /* .env 에 쓰므로 지금 화면에는 바로 반영되지 않는다 — 그 사실을 그대로 말해 준다 */
    features.savedNote = t('set3.entSaved');
  } catch (e) {
    features.error = e?.response?.data?.message || String(e.message || e);
  } finally { features.saving = false; }
}

async function loadEai() {
  eai.loading = true;
  try {
    const d = (await http.get('/api/admin/config/eai')).data?.data || {};
    eai.enabled = !!d.enabled; eai.note = d.noteKey ? t('designer.' + d.noteKey) : d.note || '';
  } catch (e) { eai.error = e?.response?.data?.message || e.message; }
  finally { eai.loading = false; }
}
async function toggleEai(next) {
  eai.saving = true; eai.error = null; eai.savedNote = null;
  try {
    const d = (await http.put('/api/admin/config/eai', { enabled: next })).data?.data || {};
    eai.enabled = !!d.enabled;
    eai.savedNote = t('set2.eaiSaved');
    await uiFlags.load();
    flashSaved();
  } catch (e) { eai.error = e?.response?.data?.message || e.message; eai.enabled = !next; }
  finally { eai.saving = false; }
}

const scWarnSample = computed(() => !!sc.name.trim() && sc.name.trim() === (sc.data?.sampleSchema || ''));

const wsTotal = computed(() => (ws.data?.folders || []).reduce((n, f) => n + (f.count || 0), 0));
/* 키를 문자열로 이어 붙이면(t('set2.wsKind_' + kind)) 사전 검사 도구가 못 찾는다 — 정적으로 적는다 */
function wsKindLabel(kind) {
  if (kind === 'controllers') return t('set2.wsKind_controllers');
  if (kind === 'services') return t('set2.wsKind_services');
  if (kind === 'sql') return t('set2.wsKind_sql');
  if (kind === 'scenarios') return t('set2.wsKind_scenarios');
  return kind;
}

/* 열릴 때마다 초기 상태로 */
watch(() => props.open, async (v) => {
  if (v) {
    tab.value = 'account'; query.value = ''; resetPwd();
    lastFocused = document.activeElement;
    await loadWorkspace();
    await loadSchema();
    await loadEai();
    await nextTick();
    dialogEl.value?.querySelector('input, button')?.focus();
  } else if (lastFocused?.focus) {
    lastFocused.focus();   // 닫으면 열었던 자리로 포커스를 돌려준다
  }
});

function close() { emit('close'); }
</script>
<template>
  <!-- ★ v1.12.0 — 설정: 왼쪽 섹션 목록 + 검색 + 즉시 저장. 유리 배경 · 포커스 가두기 · Esc 로 닫기 -->
  <Teleport to="body">
    <div v-if="open" class="settings-layer" @keydown="trapTab">
      <div class="settings-scrim" @mousedown="close"></div>

      <div ref="dialogEl" class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <!-- 헤더: 제목 + 검색 + 닫기 -->
        <header class="s-head">
          <div class="s-title" id="settingsTitle">
            <i class="bi bi-sliders2"></i>
            <span>{{ t('set2.title') }}</span>
          </div>
          <div class="s-search">
            <i class="bi bi-search"></i>
            <input v-model="query" type="search" :placeholder="t('set2.searchPlaceholder')" :aria-label="t('set2.searchPlaceholder')" />
          </div>
          <transition name="fade">
            <span v-if="savedAt" class="s-saved"><i class="bi bi-check2"></i> {{ t('set2.saved') }}</span>
          </transition>
          <button class="s-close" :aria-label="t('common.close')" @click="close"><i class="bi bi-x-lg"></i></button>
        </header>

        <div class="s-body">
          <!-- 왼쪽 섹션 목록 -->
          <nav class="s-rail" :aria-label="t('set2.title')">
            <button v-for="sc in visibleSections" :key="sc.key" class="s-rail-item" :class="{ on: tab === sc.key }"
                    :aria-current="tab === sc.key ? 'true' : undefined" @click="tab = sc.key">
              <i class="bi" :class="sc.icon"></i><span>{{ t(sc.titleKey) }}</span>
            </button>
            <p v-if="!visibleSections.length" class="s-rail-empty">{{ t('set2.noMatch') }}</p>
          </nav>

          <!-- 오른쪽 내용 -->
          <section class="s-pane">
            <!-- ── 내 정보 ── -->
            <div v-if="tab === 'account'">
              <h6 class="s-h">{{ t('set2.myAccount') }}</h6>
              <dl class="row mb-3 small">
                <dt class="col-4 col-sm-3 text-secondary fw-normal">{{ t('account.username') }}</dt>
                <dd class="col-8 col-sm-9 fw-semibold">{{ me.username || me.sub || '-' }}</dd>
                <dt class="col-4 col-sm-3 text-secondary fw-normal">{{ t('account.name') }}</dt>
                <dd class="col-8 col-sm-9">{{ me.name || '-' }}</dd>
                <dt class="col-4 col-sm-3 text-secondary fw-normal">{{ t('account.email') }}</dt>
                <dd class="col-8 col-sm-9">{{ me.email || '-' }}</dd>
                <dt class="col-4 col-sm-3 text-secondary fw-normal">{{ t('account.role') }}</dt>
                <dd class="col-8 col-sm-9">{{ roleLabel }}</dd>
              </dl>

              <div v-if="me.mustChangePassword" class="alert alert-warning py-2 px-3 small d-flex align-items-center">
                <i class="bi bi-shield-exclamation me-2"></i>
                <span>{{ t('account.initialPasswordNotice') }}</span>
              </div>

              <!-- 비밀번호 변경 -->
              <div v-if="!pwd.open">
                <button class="btn btn-outline-primary btn-sm" @click="pwd.open = true">
                  <i class="bi bi-key-fill me-1"></i>{{ t('account.changePassword') }}
                </button>
              </div>

              <div v-else class="border rounded p-3 bg-light-subtle">
                <div class="fw-semibold small mb-2"><i class="bi bi-key-fill me-1"></i>{{ t('set2.changePassword') }}</div>

                <div v-if="pwd.error" class="alert alert-danger py-2 px-3 small">{{ pwd.error }}</div>
                <div v-if="pwd.message" class="alert alert-success py-2 px-3 small">{{ pwd.message }}</div>

                <div class="mb-2">
                  <label class="form-label small mb-1">{{ t('account.currentPassword') }}</label>
                  <input v-model="pwd.current" :type="pwd.show ? 'text' : 'password'"
                         class="form-control form-control-sm" autocomplete="current-password" />
                </div>
                <div class="mb-2">
                  <label class="form-label small mb-1">{{ t('account.newPassword') }}</label>
                  <input v-model="pwd.next" :type="pwd.show ? 'text' : 'password'"
                         class="form-control form-control-sm" autocomplete="new-password" />
                </div>
                <div class="mb-2">
                  <label class="form-label small mb-1">{{ t('account.confirmPassword') }}</label>
                  <input v-model="pwd.confirm" :type="pwd.show ? 'text' : 'password'"
                         class="form-control form-control-sm" autocomplete="new-password"
                         @keyup.enter="pwdOk && savePwd()" />
                </div>

                <div class="form-check form-check-sm mb-2">
                  <input id="pwdShow" v-model="pwd.show" class="form-check-input" type="checkbox" />
                  <label class="form-check-label small" for="pwdShow">{{ t('account.showTyped') }}</label>
                </div>

                <ul class="list-unstyled small mb-3">
                  <li :class="pwdRule.length ? 'text-success' : 'text-secondary'">
                    <i class="bi" :class="pwdRule.length ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    {{ t('set2.ruleLength') }}
                  </li>
                  <li :class="pwdRule.mix ? 'text-success' : 'text-secondary'">
                    <i class="bi" :class="pwdRule.mix ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    {{ t('set2.ruleMix') }}
                  </li>
                  <li :class="pwdRule.match ? 'text-success' : 'text-secondary'">
                    <i class="bi" :class="pwdRule.match ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    {{ t('set2.ruleMatch') }}
                  </li>
                  <li :class="pwdRule.notSame ? 'text-success' : 'text-secondary'">
                    <i class="bi" :class="pwdRule.notSame ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    {{ t('set2.ruleDifferent') }}
                  </li>
                </ul>

                <div class="d-flex gap-2">
                  <button class="btn btn-primary btn-sm" :disabled="!pwdOk || pwd.saving" @click="savePwd">
                    <span v-if="pwd.saving" class="spinner-border spinner-border-sm me-1"></span>{{ t('set2.change') }}
                  </button>
                  <button class="btn btn-outline-secondary btn-sm" :disabled="pwd.saving" @click="resetPwd">
                    {{ t('set2.cancel') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- ── 화면 ── -->
            <div v-else-if="tab === 'display'">
              <h6 class="s-h">{{ t('set2.appearance') }}</h6>
              <!-- ★ v1.10.31 — 언어. 예전에는 이 블록이 **모달 밖**에 있어
                   설정 창을 열지 않아도 화면 오른쪽에 그대로 그려졌다.
                   (Vue 3 는 루트가 여러 개여도 오류를 내지 않아 조용히 새어 나왔다.)
                   화면 설정이므로 [화면] 탭 안이 제자리다. -->
              <div class="mb-3">
                <label class="form-label small fw-semibold mb-1">{{ t('language.label') }}</label>
                <div class="d-flex flex-wrap gap-2 align-items-center">
                  <button v-for="l in locales" :key="l.code" type="button"
                          class="btn btn-sm" :class="locale === l.code ? 'btn-primary' : 'btn-outline-secondary'"
                          @click="setLocale(l.code)">{{ l.native }}</button>
                  <button type="button" class="btn btn-sm btn-link ms-1" @click="resetLocale">
                    {{ t('language.useServerDefault') }}
                  </button>
                </div>
                <div class="form-text small">{{ t('language.hint') }}</div>
              </div>

              <p class="small text-secondary">
                {{ t('set2.browserOnly') }}
              </p>
              <div class="mb-3">
                <label class="form-label small fw-semibold mb-1">{{ t('settings.theme') }}</label>
                <div class="btn-group w-100" role="group" :aria-label="t('settingsLabel.k5')">
                  <input id="themeLight" v-model="prefs.theme" class="btn-check" type="radio" value="light" />
                  <label class="btn btn-outline-secondary btn-sm" for="themeLight">
                    <i class="bi bi-sun me-1"></i>{{ t('set2.light') }}
                  </label>
                  <input id="themeDark" v-model="prefs.theme" class="btn-check" type="radio" value="dark" />
                  <label class="btn btn-outline-secondary btn-sm" for="themeDark">
                    <i class="bi bi-moon-stars me-1"></i>{{ t('set2.dark') }}
                  </label>
                </div>
                <div class="form-text small">
                  {{ t('set2.darkNote') }}
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold mb-1">{{ t('set2.density') }}</label>
                <div class="btn-group w-100" role="group" :aria-label="t('settingsLabel.k6')">
                  <input id="dCompact" v-model="prefs.density" class="btn-check" type="radio" value="compact" />
                  <label class="btn btn-outline-secondary btn-sm" for="dCompact">{{ t('settings.densityCompact') }}</label>
                  <input id="dComfort" v-model="prefs.density" class="btn-check" type="radio" value="comfortable" />
                  <label class="btn btn-outline-secondary btn-sm" for="dComfort">{{ t('settings.densityComfortable') }}</label>
                  <input id="dSpacious" v-model="prefs.density" class="btn-check" type="radio" value="spacious" />
                  <label class="btn btn-outline-secondary btn-sm" for="dSpacious">{{ t('settings.densitySpacious') }}</label>
                </div>
                <div class="form-text small">
                  {{ t('set2.densityNote') }}
                </div>
              </div>

              <div class="form-check form-switch mb-3">
                <input id="prefSidebar" v-model="prefs.rememberSidebar" class="form-check-input" type="checkbox" />
                <label class="form-check-label" for="prefSidebar">
                  {{ t('settingsLabel.k1') }}
                  <span class="d-block small text-secondary">
                    {{ t('settingsLabel.k2') }}
                  </span>
                </label>
              </div>
              <div class="form-check form-switch">
                <input id="prefLogout" v-model="prefs.confirmLogout" class="form-check-input" type="checkbox" />
                <label class="form-check-label" for="prefLogout">
                  {{ t('settingsLabel.k3') }}
                  <span class="d-block small text-secondary">
                    {{ t('settingsLabel.k4') }}
                  </span>
                </label>
              </div>

              <!-- ★ v1.13.3 — EAI(전문 연동) 메뉴 표시. 처음 쓰는 사람에게는 무엇인지 알 수 없는 메뉴라 기본은 꺼짐 -->
              <hr class="my-3" />
              <div class="d-flex align-items-start gap-2">
                <div class="form-check form-switch mb-0">
                  <input id="eaiMenu" class="form-check-input" type="checkbox"
                         :checked="eai.enabled" :disabled="!isAdmin || eai.saving"
                         @change="toggleEai($event.target.checked)" />
                </div>
                <div class="flex-grow-1">
                  <label class="form-label mb-0 fw-semibold" for="eaiMenu">{{ t('set2.eaiTitle') }}</label>
                  <p class="small text-secondary mb-1">{{ eai.note || t('set2.eaiNote') }}</p>
                  <p v-if="!isAdmin" class="small text-secondary mb-0">{{ t('set2.wsAdminOnly') }}</p>
                  <p v-if="eai.savedNote" class="small text-success mb-0"><i class="bi bi-check2-circle me-1"></i>{{ eai.savedNote }}</p>
                  <p v-if="eai.error" class="small text-danger mb-0">{{ eai.error }}</p>
                </div>
              </div>

              <!-- ★ v1.26.0 — 엔터프라이즈 메뉴 (백업/복원 · DB 컬럼 암호화 · 이중화).
                   모든 설치에 필요한 것이 아니라 기본은 감춤이다. 여기서 켜면 메뉴에 나타난다.
                   EAI 와 같은 방식으로 .env 에 쓰므로 **서버를 다시 켜야** 적용된다. -->
              <hr class="my-3" />
              <div class="mb-2">
                <label class="form-label mb-0 fw-semibold">{{ t('set3.entTitle') }}</label>
                <p class="small text-secondary mb-2">{{ t('set3.entNote') }}</p>
              </div>
              <div v-for="f in featureItems" :key="f.key" class="d-flex align-items-start gap-2 mb-2">
                <div class="form-check form-switch mb-0">
                  <input :id="'feat-' + f.key" class="form-check-input" type="checkbox"
                         :checked="features.data[f.key]" :disabled="!isAdmin || features.saving"
                         @change="toggleFeature(f.key, $event.target.checked)" />
                </div>
                <div class="flex-grow-1">
                  <label class="form-label mb-0" :for="'feat-' + f.key">{{ f.label }}</label>
                  <p class="small text-secondary mb-0">{{ f.note }}</p>
                </div>
              </div>
              <p v-if="!isAdmin" class="small text-secondary mb-0">{{ t('set2.wsAdminOnly') }}</p>
              <p v-if="features.savedNote" class="small text-success mb-0">
                <i class="bi bi-check2-circle me-1"></i>{{ features.savedNote }}
              </p>
              <p v-if="features.error" class="small text-danger mb-0">{{ features.error }}</p>
            </div>

            <!-- ── 작업 폴더 (★ v1.12.0) ── -->
            <div v-else-if="tab === 'workspace'">
              <h6 class="s-h">{{ t('set2.workspace') }}</h6>
              <p class="s-sub">{{ t('set2.wsIntro') }}</p>

              <div v-if="ws.loading" class="text-secondary small py-3"><span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}</div>
              <div v-else-if="ws.loadError" class="alert alert-danger py-2 px-3 small">{{ ws.loadError }}</div>

              <template v-else-if="ws.data">
                <!-- 현재 위치 카드 -->
                <div class="s-card">
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="badge" :class="ws.data.enabled ? 'text-bg-primary' : 'text-bg-secondary'">
                      {{ ws.data.enabled ? t('set2.wsOn') : t('set2.wsOff') }}
                    </span>
                    <code class="s-path">{{ ws.data.enabled ? ws.data.configured + '/' : t('set2.wsDefaultDirs') }}</code>
                    <span v-if="ws.data.enabled && !ws.data.exists" class="badge text-bg-warning">{{ t('set2.wsMissing') }}</span>
                    <span class="ms-auto small text-secondary">{{ t('set2.wsTotal', { n: wsTotal }) }}</span>
                  </div>
                  <div class="s-grid">
                    <div v-for="f in ws.data.folders" :key="f.kind" class="s-chip">
                      <i class="bi" :class="f.kind === 'sql' ? 'bi-database' : (f.kind === 'services' ? 'bi-gear' : (f.kind === 'scenarios' ? 'bi-play-circle' : 'bi-diagram-3'))"></i>
                      <span class="k">{{ wsKindLabel(f.kind) }}</span>
                      <code>{{ f.path || ws.data.defaultDirs[f.kind] }}</code>
                      <span class="n" :class="{ zero: !f.count }">{{ f.count }}</span>
                    </div>
                  </div>
                </div>

                <!-- 바꾸기 -->
                <div v-if="!ws.editing" class="d-flex align-items-center gap-2 mt-3">
                  <button class="btn btn-sm btn-outline-primary" :disabled="!isAdmin" @click="ws.editing = true; ws.dir = ws.data.configured || 'workspace'">
                    <i class="bi bi-pencil me-1"></i>{{ t('set2.wsChange') }}
                  </button>
                  <span v-if="!isAdmin" class="small text-secondary">{{ t('set2.wsAdminOnly') }}</span>
                  <span v-if="ws.savedNote" class="small text-success"><i class="bi bi-check2-circle me-1"></i>{{ ws.savedNote }}</span>
                </div>

                <div v-else class="s-card mt-3">
                  <!-- ★ 저장 오류는 이 카드 안에서 — 예전 초안은 오류가 나면 섹션이 통째로 사라져 적던 값을 잃었다 -->
                  <div v-if="ws.error" class="alert alert-danger py-2 px-3 small">{{ ws.error }}</div>
                  <label class="form-label small fw-semibold mb-1" for="wsDir">{{ t('set2.wsFolderLabel') }}</label>
                  <div class="input-group input-group-sm mb-2">
                    <span class="input-group-text">{{ t('set2.wsProjectRoot') }}/</span>
                    <input id="wsDir" v-model="ws.dir" type="text" class="form-control" placeholder="workspace"
                           list="wsCandidates" @keyup.enter="saveWorkspace" />
                    <datalist id="wsCandidates">
                      <option v-for="c in ws.data.candidates" :key="c" :value="c" />
                    </datalist>
                  </div>
                  <div class="form-check form-switch small mb-2">
                    <input id="wsCreate" v-model="ws.create" class="form-check-input" type="checkbox" />
                    <label class="form-check-label" for="wsCreate">{{ t('set2.wsCreate') }}</label>
                  </div>
                  <p class="small text-secondary mb-2">{{ ws.dir.trim() ? t('set2.wsHint') : t('set2.wsHintEmpty') }}</p>
                  <div class="alert alert-warning py-2 px-3 small mb-2"><i class="bi bi-info-circle me-1"></i>{{ t('set2.wsRestartNote') }}</div>
                  <div class="d-flex gap-2">
                    <button class="btn btn-primary btn-sm" :disabled="ws.saving" @click="saveWorkspace">
                      <span v-if="ws.saving" class="spinner-border spinner-border-sm me-1"></span>{{ t('set2.wsApply') }}
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" @click="ws.editing = false">{{ t('common.cancel') }}</button>
                  </div>
                </div>
              </template>

              <!-- ★ v1.12.2 — DB 쪽 저장 위치: 내가 만드는 테이블이 있는 스키마 -->
              <h6 class="s-h mt-4">{{ t('set2.scTitle') }}</h6>
              <p class="s-sub">{{ t('set2.scIntro') }}</p>
              <div v-if="sc.loading" class="text-secondary small py-2"><span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}</div>
              <div v-else-if="sc.loadError" class="alert alert-danger py-2 px-3 small">{{ sc.loadError }}</div>
              <template v-else-if="sc.data">
                <div v-if="!sc.data.supported" class="alert alert-secondary py-2 px-3 small">{{ t('set2.scUnsupported') }}</div>
                <template v-else>
                  <div class="s-card">
                    <div class="s-grid">
                      <div class="s-chip">
                        <i class="bi bi-hdd-stack"></i><span class="k">{{ t('set2.scSystem') }}</span>
                        <code>{{ sc.data.connectionSchema }}</code>
                      </div>
                      <div class="s-chip">
                        <i class="bi bi-box"></i><span class="k">{{ t('set2.scSample') }}</span>
                        <code>{{ sc.data.sampleSchema || '-' }}</code>
                      </div>
                      <div class="s-chip" :class="{ 'chip-on': true }">
                        <i class="bi bi-table"></i><span class="k">{{ t('set2.scMine') }}</span>
                        <code>{{ sc.data.effective }}</code>
                        <span v-if="!sc.data.configured" class="badge text-bg-warning ms-auto">{{ t('set2.scMixed') }}</span>
                      </div>
                    </div>
                    <p v-if="!sc.data.configured" class="small text-secondary mt-2 mb-0">{{ t('set2.scMixedHint') }}</p>
                  </div>

                  <div v-if="!sc.editing" class="d-flex align-items-center gap-2 mt-3">
                    <button class="btn btn-sm btn-outline-primary" :disabled="!isAdmin" @click="sc.editing = true; sc.name = sc.data.configured || ''">
                      <i class="bi bi-pencil me-1"></i>{{ t('set2.scChange') }}
                    </button>
                    <span v-if="!isAdmin" class="small text-secondary">{{ t('set2.wsAdminOnly') }}</span>
                    <span v-if="sc.savedNote" class="small text-success"><i class="bi bi-check2-circle me-1"></i>{{ sc.savedNote }}</span>
                  </div>

                  <div v-else class="s-card mt-3">
                    <div v-if="sc.error" class="alert alert-danger py-2 px-3 small">{{ sc.error }}</div>
                    <label class="form-label small fw-semibold mb-1" for="scName">{{ t('set2.scLabel') }}</label>
                    <input id="scName" v-model="sc.name" type="text" class="form-control form-control-sm mb-2"
                           :placeholder="t('set2.scPlaceholder')" list="scList" @keyup.enter="saveSchema" />
                    <datalist id="scList">
                      <option v-for="x in sc.data.schemas" :key="x.name" :value="x.name">{{ x.tables }} tables</option>
                    </datalist>
                    <div class="form-check form-switch small mb-2">
                      <input id="scCreate" v-model="sc.create" class="form-check-input" type="checkbox" />
                      <label class="form-check-label" for="scCreate">{{ t('set2.scCreate') }}</label>
                    </div>
                    <div v-if="scWarnSample" class="alert alert-warning py-2 px-3 small mb-2">{{ t('set2.scSampleWarn') }}</div>
                    <p class="small text-secondary mb-2">{{ sc.name.trim() ? t('set2.scHint') : t('set2.scHintEmpty', { name: sc.data.connectionSchema }) }}</p>
                    <div class="alert alert-warning py-2 px-3 small mb-2"><i class="bi bi-info-circle me-1"></i>{{ t('set2.scMoveNote') }}</div>
                    <div class="d-flex gap-2">
                      <button class="btn btn-primary btn-sm" :disabled="sc.saving" @click="saveSchema">
                        <span v-if="sc.saving" class="spinner-border spinner-border-sm me-1"></span>{{ t('set2.scApply') }}
                      </button>
                      <button class="btn btn-outline-secondary btn-sm" @click="sc.editing = false">{{ t('common.cancel') }}</button>
                    </div>
                  </div>
                </template>
              </template>
            </div>

            <!-- ── 서버 정보 ── -->
            <div v-else>
              <h6 class="s-h">{{ t('set2.serverInfo') }}</h6>
              <dl class="row mb-0 small">
                <dt class="col-4 col-sm-3 text-secondary fw-normal">{{ t('account.version') }}</dt>
                <dd class="col-8 col-sm-9 fw-semibold">
                  v{{ server.version }}
                  <span v-if="server.channel && server.channel !== 'release'"
                        class="badge bg-secondary ms-1">{{ server.channel }}</span>
                </dd>
                <dt class="col-4 col-sm-3 text-secondary fw-normal">{{ t('account.build') }}</dt>
                <dd class="col-8 col-sm-9">{{ builtAtText }}</dd>
              </dl>
              <p class="small text-secondary mt-3 mb-0">
                {{ t('set2.envNote') }}
              </p>
            </div>
          </section>
        </div>

        <footer class="s-foot">
          <span class="small text-secondary"><i class="bi bi-lightning-charge me-1"></i>{{ t('set2.instantSave') }}</span>
          <button class="btn btn-sm btn-secondary" @click="close">{{ t('common.close') }}</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 유리 배경 — 뒤 화면이 남아 "잠깐 떠 있는 층" 으로 읽힌다 (2026 트렌드: 절제된 glassmorphism) */
.settings-layer { position: fixed; inset: 0; z-index: 1080; display: grid; place-items: center; padding: 24px; }
.settings-scrim { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(6px) saturate(120%); }
.settings-dialog {
  position: relative; width: min(880px, 100%); max-height: min(78vh, 720px);
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--bs-body-bg, #fff); color: var(--bs-body-color, #1f2437);
  border: 1px solid rgba(255,255,255,.35); border-radius: 16px;
  box-shadow: 0 24px 64px rgba(2, 6, 23, .28);
  animation: pop .16s ease-out;
}
@keyframes pop { from { transform: translateY(8px) scale(.99); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .settings-dialog { animation: none; } }

.s-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--bs-border-color, #e5e7eb); }
.s-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.02rem; }
.s-title .bi { color: #3b5bdb; }
.s-search { position: relative; margin-left: auto; }
.s-search .bi { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: .85rem; }
.s-search input { width: 220px; padding: .35rem .6rem .35rem 1.9rem; border: 1px solid var(--bs-border-color, #e5e7eb); border-radius: 999px; font-size: .85rem; background: var(--bs-tertiary-bg, #f8fafc); color: inherit; }
.s-search input:focus { outline: 2px solid #3b5bdb33; border-color: #3b5bdb; }
.s-saved { font-size: .78rem; color: #16794c; background: #e7f6ee; border: 1px solid #b9e4cb; border-radius: 999px; padding: .15rem .5rem; }
.s-close { border: 0; background: transparent; color: #64748b; font-size: 1rem; padding: .25rem .4rem; border-radius: 8px; }
.s-close:hover { background: var(--bs-tertiary-bg, #f1f5f9); color: inherit; }

.s-body { display: grid; grid-template-columns: 190px 1fr; min-height: 0; flex: 1; }
.s-rail { border-right: 1px solid var(--bs-border-color, #e5e7eb); padding: 10px; overflow-y: auto; background: var(--bs-tertiary-bg, #f8fafc); }
.s-rail-item { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; border: 0; background: transparent; color: inherit;
  padding: .5rem .6rem; border-radius: 10px; font-size: .88rem; }
.s-rail-item .bi { color: #64748b; width: 1.1rem; }
.s-rail-item:hover { background: rgba(59, 91, 219, .07); }
.s-rail-item.on { background: #3b5bdb; color: #fff; font-weight: 600; }
.s-rail-item.on .bi { color: #fff; }
.s-rail-empty { font-size: .8rem; color: #94a3b8; padding: .5rem; }
.s-pane { padding: 18px 20px; overflow-y: auto; min-height: 0; }
.s-h { font-weight: 700; margin-bottom: .35rem; }
.s-sub { font-size: .85rem; color: #64748b; margin-bottom: 1rem; }

.s-card { border: 1px solid var(--bs-border-color, #e5e7eb); border-radius: 12px; padding: 12px 14px; background: var(--bs-body-bg, #fff); }
.s-path { font-size: .9rem; }
.s-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px; }
.s-chip { display: flex; align-items: center; gap: 8px; border: 1px solid var(--bs-border-color, #e9edf5); border-radius: 10px; padding: .45rem .6rem; font-size: .8rem; background: var(--bs-tertiary-bg, #f8fafc); }
.s-chip .k { font-weight: 600; white-space: nowrap; }
.s-chip code { color: #64748b; font-size: .74rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.s-chip > .bi { flex: 0 0 auto; }
.s-chip .n { margin-left: auto; font-weight: 700; color: #3b5bdb; }
.s-chip .n.zero { color: #94a3b8; }
.s-chip.chip-on { border-color: #3b5bdb66; background: #eef2ff; }

.s-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--bs-border-color, #e5e7eb); background: var(--bs-tertiary-bg, #f8fafc); }
.fade-enter-active, .fade-leave-active { transition: opacity .18s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 640px) {
  .s-body { grid-template-columns: 1fr; }
  .s-rail { display: flex; gap: 6px; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--bs-border-color, #e5e7eb); }
  .s-rail-item { width: auto; white-space: nowrap; }
  .s-search input { width: 130px; }
}
dt { padding-top: 0.15rem; }
</style>
