<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import http from '../api/http';

// ★ v1.10.0 — 다국어. 로그인 화면은 서버가 준 기본 언어로 그려진다.
import { useI18n, applyServerDefault } from '../composables/useI18n';
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = reactive({ username: '', password: '' });
const loading = ref(false);
const error = ref(null);
const showPw = ref(false);

/* 아이디 저장 — 브라우저에 **아이디만** 남긴다.
 *   · 비밀번호·토큰은 저장하지 않는다 (토큰은 메모리 + HttpOnly refresh 쿠키 방식 유지)
 *   · 공용 PC 에서 끄면 저장된 값도 함께 지운다 */
const REMEMBER_KEY = 'aidot.admin.rememberedId';
const rememberId = ref(false);

const { t, locale, locales, setLocale } = useI18n();

const dbHealth = ref({ ok: null });
const dbHealthLoading = ref(false);

async function checkHealth() {
  dbHealthLoading.value = true;
  try {
    const r = await http.get('/api/admin/system/health', { timeout: 3000 });
    const data = r.data?.data || r.data || {};
    data.fallbackActive = data.configuredType
      && data.adapter
      && data.configuredType.toLowerCase() !== data.adapter.toLowerCase();
    dbHealth.value = data;
    // 서버가 .env 로 정한 기본 언어 — 사용자가 이미 고른 값이 있으면 덮지 않는다
    if (data.locale) applyServerDefault(data.locale);
  } catch (e) {
    dbHealth.value = {
      ok: false,
      error: t('loginArt.errConnect', { detail: e.response?.status || e.message || e.code || t('loginArt.errUnknown') }),
    };
  } finally {
    dbHealthLoading.value = false;
  }
}

const dbCardTooltip = computed(() => {
  const h = dbHealth.value;
  const lines = [];
  if (h.configuredType) lines.push(`${t('loginArt.dbType')}: ${h.configuredType}`);
  if (h.adapter)        lines.push(`${t('loginArt.dbAdapter')}: ${h.adapter}`);
  if (h.host)           lines.push(`Host: ${h.host}${h.port ? ':' + h.port : ''}`);
  if (h.database || h.service) lines.push(`DB: ${h.database || h.service}`);
  if (h.fallbackActive) lines.push(t('loginArt.dbFallback'));
  if (h.error)          lines.push(`${t('loginArt.errLabel')}: ${h.error}`);
  return lines.join('\n');
});

onMounted(() => {
  checkHealth();
  try {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { form.username = saved; rememberId.value = true; }
  } catch { /* 사생활 보호 모드 등에서 localStorage 가 막힌 경우 무시 */ }
});

// 스위치를 끄는 순간 저장된 아이디도 지운다
watch(rememberId, (on) => {
  if (!on) { try { localStorage.removeItem(REMEMBER_KEY); } catch { /* noop */ } }
});

async function onSubmit() {
  loading.value = true;
  error.value = null;
  try {
    await auth.login(form);
    try {
      if (rememberId.value) localStorage.setItem(REMEMBER_KEY, form.username);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* noop */ }
    router.push(route.query.redirect || '/');
  } catch (e) {
    const resp = e.response?.data;
    if (resp?.code === 'DB_CONNECTION_ERROR' || resp?.message?.startsWith('DB connection error')) {
      error.value = `${t('loginArt.dbFail')}: ${resp.message}`;
      checkHealth();
    } else {
      error.value = resp?.message || e.message || t('loginArt.loginFail');
    }
  } finally {
    loading.value = false;
  }
}
</script>

<script>
// 브랜드 마크 (구조화 계층 + 번개) — 좌측 브랜드 / 우측 카드 로고에 재사용.
const brandSvg = `<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563EB"/><stop offset="1" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="lg-bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE066"/><stop offset="1" stop-color="#F5A623"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#lg-bg)"/>
  <g>
    <rect x="13" y="15" width="38" height="7.5" rx="3.75" fill="#fff" opacity="0.95"/>
    <rect x="13" y="28.25" width="38" height="7.5" rx="3.75" fill="#fff" opacity="0.72"/>
    <rect x="13" y="41.5" width="38" height="7.5" rx="3.75" fill="#fff" opacity="0.5"/>
  </g>
  <path d="M38 9 L24 34 H33 L26 55 L46 27 H36 Z" fill="url(#lg-bolt)" stroke="#1D4ED8" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;
export default { data() { return { brandSvg }; } };
</script>

<template>
  <div class="login-page">
    <!-- =================== 좌측 비주얼 =================== -->
    <div class="login-visual">
      <div class="bg-grid"></div>
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>

      <!-- aidot-express 컨셉 SVG — 구조화된 파이프라인(@Controller→@Service→@Sql→DB)을
           요청 패킷이 매우 빠르게 통과 (= Spring 처럼 구조적, 그보다 빠름) -->
      <svg class="pipe-svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="ax-glow">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="ax-bolt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#FDE047"/>
            <stop offset="1" stop-color="#F59E0B"/>
          </linearGradient>
          <linearGradient id="ax-packet" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#FDE047"/>
            <stop offset="1" stop-color="#60A5FA"/>
          </linearGradient>
        </defs>

        <!-- 회전 방어/속도 링 -->
        <g class="rings">
          <circle cx="300" cy="300" r="250" fill="none" stroke="rgba(147,197,253,0.30)"
                  stroke-width="1.4" stroke-dasharray="8 7">
            <animateTransform attributeName="transform" type="rotate"
                              from="0 300 300" to="360 300 300" dur="26s" repeatCount="indefinite"/>
          </circle>
          <circle cx="300" cy="300" r="274" fill="none" stroke="rgba(245,158,11,0.22)"
                  stroke-width="1" stroke-dasharray="3 13">
            <animateTransform attributeName="transform" type="rotate"
                              from="0 300 300" to="-360 300 300" dur="36s" repeatCount="indefinite"/>
          </circle>
        </g>

        <!-- 연결선 (요청 흐름) -->
        <g stroke="rgba(255,255,255,0.22)" stroke-width="2" stroke-dasharray="4 5">
          <line x1="300" y1="120" x2="300" y2="170"/>
          <line x1="300" y1="232" x2="300" y2="262"/>
          <line x1="300" y1="324" x2="300" y2="354"/>
          <line x1="300" y1="416" x2="300" y2="446"/>
        </g>

        <!-- 진입점: HTTP 요청 -->
        <g class="layer">
          <rect x="225" y="86" width="150" height="36" rx="18"
                fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.35)" stroke-width="1.4"/>
          <text x="300" y="109" class="pipe-label light" text-anchor="middle">{{ t('loginArt.httpReq') }}</text>
        </g>

        <!-- @Controller -->
        <g class="layer">
          <rect x="170" y="170" width="260" height="62" rx="13"
                fill="rgba(96,165,250,0.10)" stroke="rgba(96,165,250,0.55)" stroke-width="1.6"/>
          <text x="300" y="198" class="pipe-deco" text-anchor="middle">@Controller</text>
          <text x="300" y="218" class="pipe-sub" text-anchor="middle">{{ t('loginArt.routeMap') }}</text>
        </g>

        <!-- @Service -->
        <g class="layer">
          <rect x="170" y="262" width="260" height="62" rx="13"
                fill="rgba(96,165,250,0.10)" stroke="rgba(96,165,250,0.55)" stroke-width="1.6"/>
          <text x="300" y="290" class="pipe-deco blue" text-anchor="middle">@Service</text>
          <text x="300" y="310" class="pipe-sub" text-anchor="middle">{{ t('loginArt.bizLogic') }}</text>
        </g>

        <!-- @Sql -->
        <g class="layer">
          <rect x="170" y="354" width="260" height="62" rx="13"
                fill="rgba(251,191,36,0.10)" stroke="rgba(251,191,36,0.55)" stroke-width="1.6"/>
          <text x="300" y="382" class="pipe-deco amber" text-anchor="middle">@Sql</text>
          <text x="300" y="402" class="pipe-sub" text-anchor="middle">{{ t('loginArt.sqlInject') }}</text>
        </g>

        <!-- DB 실린더 -->
        <g class="layer" transform="translate(300 470)">
          <ellipse cx="0" cy="-22" rx="54" ry="13" fill="rgba(147,197,253,0.16)" stroke="rgba(147,197,253,0.6)" stroke-width="1.5"/>
          <path d="M -54 -22 V 18 a 54 13 0 0 0 108 0 V -22" fill="rgba(147,197,253,0.08)"
                stroke="rgba(147,197,253,0.6)" stroke-width="1.5"/>
          <text x="0" y="4" class="pipe-sub" text-anchor="middle">DB</text>
        </g>

        <!-- 빠른 요청 패킷 — 위에서 아래로 매우 빠르게 (속도감), 무한 반복 -->
        <circle r="7" fill="url(#ax-packet)" filter="url(#ax-glow)">
          <animate attributeName="cy" values="104;470" dur="1.1s" repeatCount="indefinite" keyTimes="0;1"/>
          <animate attributeName="cx" values="300;300" dur="1.1s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.08;0.5;0.9;1" dur="1.1s" repeatCount="indefinite"/>
        </circle>
        <!-- 두 번째 패킷 (시차) — 끊임없이 흐르는 느낌 -->
        <circle r="5" fill="url(#ax-packet)" filter="url(#ax-glow)" opacity="0.7">
          <animate attributeName="cy" values="104;470" dur="1.1s" begin="0.55s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0;0.8;0.8;0;0" keyTimes="0;0.1;0.7;0.95;1" dur="1.1s" begin="0.55s" repeatCount="indefinite"/>
        </circle>

        <!-- 우상단 번개 배지 (속도 상징) -->
        <g class="bolt-badge" filter="url(#ax-glow)" transform="translate(430 96)">
          <path d="M10 0 L-6 26 H3 L-4 52 L20 18 H9 Z" fill="url(#ax-bolt)"
                stroke="#1D4ED8" stroke-width="1.4" stroke-linejoin="round"/>
        </g>
      </svg>

      <!-- 콘텐츠 -->
      <div class="visual-content">
        <div class="visual-brand">
          <div class="brand-icon" v-html="brandSvg"></div>
          <div>
            <span class="brand-name">aidot-express</span>
            <span class="brand-sub">Spring-style Node.js Framework</span>
          </div>
        </div>
        <h1 v-html="t('loginArt.headline')"></h1>
        <ul class="visual-features">
          <li><i class="bi bi-check-circle-fill"></i> {{ t('loginArt.f1') }}</li>
          <li><i class="bi bi-check-circle-fill"></i> {{ t('loginArt.f2') }}</li>
          <li><i class="bi bi-check-circle-fill"></i> {{ t('loginArt.f3') }}</li>
          <li><i class="bi bi-check-circle-fill"></i> {{ t('loginArt.f4') }}</li>
        </ul>
      </div>

      <div class="visual-footer">
        <span class="footer-tag"><span class="live-dot"></span>Node.js · Express · Annotation based Routing</span>
      </div>
    </div>

    <!-- =================== 우측 폼 =================== -->
    <div class="login-form-area">
      <div class="login-card">
        <div class="card-mini-logo" v-html="brandSvg"></div>
        <!-- ★ v1.10.0 — 언어 선택. 로그인 전에도 바꿀 수 있어야 한다:
             영어로 뜬 화면에서 한국어 사용자가 로그인부터 헤매면 안 된다. -->
        <div class="lang-pick">
          <button v-for="l in locales" :key="l.code" type="button"
                  class="lang-btn" :class="{ on: locale === l.code }"
                  @click="setLocale(l.code)">{{ l.native }}</button>
        </div>
        <h2>{{ t('login.title') }}</h2>
        <p class="muted">{{ t('login.subtitle') }}</p>

        <div v-if="error" class="login-alert">
          <i class="bi bi-exclamation-triangle-fill"></i> {{ error }}
        </div>

        <form @submit.prevent="onSubmit">
          <div class="form-field">
            <label class="field-label">{{ t('login.username') }}</label>
            <div class="input-wrap">
              <i class="bi bi-person input-icon"></i>
              <input v-model="form.username" type="text" autocomplete="username"
                     lang="en" inputmode="latin" style="ime-mode:disabled;"
                     required placeholder="admin" />
            </div>
          </div>
          <div class="form-field">
            <label class="field-label">{{ t('login.password') }}</label>
            <div class="input-wrap">
              <i class="bi bi-lock input-icon"></i>
              <input v-model="form.password" :type="showPw ? 'text' : 'password'"
                     autocomplete="current-password" lang="en" inputmode="latin"
                     style="ime-mode:disabled;" required placeholder="••••••••" />
              <button type="button" class="input-eye" @click="showPw = !showPw"
                      :aria-label="showPw ? t('login.hidePassword') : t('login.showPassword')">
                <i class="bi" :class="showPw ? 'bi-eye-slash' : 'bi-eye'"></i>
              </button>
            </div>
          </div>

          <!-- 아이디 저장 — 비밀번호는 저장하지 않는다 (아이디만 브라우저에 기억) -->
          <div class="remember-row">
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="rememberId" v-model="rememberId" />
              <label class="form-check-label" for="rememberId">{{ t('login.rememberId') }}</label>
            </div>
          </div>

          <button type="submit" class="btn-submit"
                  :disabled="loading || dbHealth.ok === false">
            <span v-if="loading" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-box-arrow-in-right"></i>
            <span>{{ loading ? t('login.signingIn') : t('login.signIn') }}</span>
          </button>

        </form>
      </div>

      <!-- DB 상태 — 우하단 칩 -->
      <div class="db-health-chip"
           :class="dbHealth.ok === true ? 'is-ok' : (dbHealth.ok === false ? 'is-fail' : 'is-unknown')"
           :title="dbCardTooltip"
           @click="checkHealth">
        <i class="bi"
           :class="dbHealth.ok === true ? 'bi-database-check' :
                   dbHealth.ok === false ? 'bi-database-x' : 'bi-database'"></i>
        <span class="db-health-text">
          <template v-if="dbHealth.ok === true">{{ t('login.dbOk') }}</template>
          <template v-else-if="dbHealth.ok === false">{{ t('login.dbFail') }}</template>
          <template v-else>{{ t('login.dbChecking') }}</template>
        </span>
        <i v-if="dbHealthLoading" class="bi bi-arrow-repeat spinning ms-1"></i>
      </div>

      <!-- 무엇을 고쳐야 하는지 화면에서 바로 알려 준다 (개발 모드에서만 hint 가 내려온다) -->
      <div v-if="dbHealth.ok === false && dbHealth.hint" class="db-health-hint">
        <i class="bi bi-lightbulb me-1"></i>{{ dbHealth.hint }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 언어 선택 — 눈에 띄되 로그인 자체를 방해하지 않게 작게 */
.lang-pick { display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 6px; }
.lang-btn {
  border: 1px solid rgba(255,255,255,.16); background: transparent; color: inherit;
  opacity: .55; font-size: .72rem; padding: 2px 9px; border-radius: 999px; cursor: pointer;
}
.lang-btn:hover { opacity: .85; }
.lang-btn.on { opacity: 1; border-color: currentColor; font-weight: 600; }

/* 아이디 저장 — 버튼 위쪽, 오른쪽 정렬 */
.remember-row {
  display: flex;
  justify-content: flex-end;
  margin: 14px 0 16px;
}
.remember-row .form-check-label {
  font-size: 13px;
  color: #5b6478;
  cursor: pointer;
  user-select: none;
}
.remember-row .form-check-input { cursor: pointer; }

.db-health-hint {
  margin-top: 6px;
  max-width: 320px;
  font-size: 12px;
  line-height: 1.45;
  color: #7a3b3b;
  background: #fdecec;
  border: 1px solid #f5c2c7;
  border-radius: 6px;
  padding: 6px 9px;
}
.login-page {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  height: 100vh; overflow: hidden;
}

/* ===== 좌측 비주얼 ===== */
.login-visual {
  position: relative; overflow: hidden;
  background:
    radial-gradient(ellipse at 28% 18%, rgba(37,99,235,0.35) 0%, transparent 52%),
    radial-gradient(ellipse at 82% 82%, rgba(245,158,11,0.18) 0%, transparent 50%),
    linear-gradient(135deg, #0A1A33 0%, #0F2747 38%, #16386B 100%);
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 48px 56px 28px;
  color: #fff;
}
.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
  background-size: 58px 58px; pointer-events: none;
}
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55; pointer-events: none; }
.blob-1 { width: 460px; height: 460px; background: #2563EB; top: -130px; left: -150px; animation: float1 15s ease-in-out infinite; }
.blob-2 { width: 360px; height: 360px; background: #F59E0B; bottom: -110px; right: -120px; animation: float2 19s ease-in-out infinite; }
.blob-3 { width: 280px; height: 280px; background: #60A5FA; top: 34%; right: 26%; animation: float3 23s ease-in-out infinite; }
@keyframes float1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(46px,28px); } }
@keyframes float2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-38px,-18px); } }
@keyframes float3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(18px,-46px); } }

.pipe-svg {
  position: absolute; top: 50%; left: 70%; transform: translate(-50%,-50%);
  width: 58%; max-width: 480px; height: auto; opacity: 0.96; pointer-events: none; z-index: 1;
}
.pipe-label { font-size: 14px; font-weight: 600; fill: rgba(255,255,255,0.85);
              font-family: 'Pretendard', system-ui, sans-serif; }
.pipe-deco { font-size: 19px; font-weight: 700; fill: #93C5FD;
             font-family: 'Consolas','JetBrains Mono', monospace; }
.pipe-deco.blue  { fill: #93C5FD; }
.pipe-deco.amber { fill: #FCD34D; }
.pipe-sub { font-size: 12px; fill: rgba(255,255,255,0.6);
            font-family: 'Pretendard', system-ui, sans-serif; }
.bolt-badge { animation: bolt-pulse 1.8s ease-in-out infinite; transform-origin: center; }
@keyframes bolt-pulse {
  0%,100% { filter: drop-shadow(0 0 5px rgba(245,158,11,0.5)); }
  50%     { filter: drop-shadow(0 0 14px rgba(245,158,11,0.95)); }
}

.visual-content { position: relative; z-index: 3; max-width: 470px; }
.visual-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 34px; }
.visual-brand .brand-icon {
  width: 48px; height: 48px; border-radius: 12px; overflow: hidden;
  box-shadow: 0 6px 18px rgba(0,0,0,0.30);
}
.brand-name { font-size: 19px; font-weight: 700; line-height: 1.1; display: block;
              font-family: 'Pretendard', system-ui, sans-serif; }
.brand-sub { font-size: 11px; color: rgba(255,255,255,0.62); display: block; margin-top: 3px; letter-spacing: 0.4px;
             font-family: 'Consolas','JetBrains Mono', monospace; }
.visual-content h1 {
  font-size: 35px; font-weight: 800; line-height: 1.28; margin: 0 0 14px; letter-spacing: -0.5px;
  font-family: 'Pretendard', system-ui, sans-serif;
}
.visual-content h1 .g {
  background: linear-gradient(135deg,#93C5FD 0%,#3B82F6 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent;
}
.visual-content h1 .y {
  background: linear-gradient(135deg,#FDE047 0%,#F59E0B 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent;
}
.visual-content p { font-size: 14px; opacity: 0.82; line-height: 1.6; margin: 0 0 24px; }
.visual-features { list-style: none; padding: 0; margin: 0; }
.visual-features li { padding: 6px 0; display: flex; align-items: center; gap: 10px; font-size: 13px; opacity: 0.92; }
.visual-features li .bi { color: #60A5FA; font-size: 16px; }

.visual-footer { position: relative; z-index: 3; font-size: 11px; color: rgba(255,255,255,0.55); }
.footer-tag {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(0,0,0,0.22); padding: 5px 12px; border-radius: 12px;
  font-family: 'Consolas','JetBrains Mono', monospace;
}
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: #60A5FA; animation: live-blink 1.5s ease-in-out infinite; }
@keyframes live-blink {
  0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(96,165,250,0.6); }
  50%     { opacity: 0.5; box-shadow: 0 0 0 4px rgba(96,165,250,0); }
}

/* ===== 우측 폼 ===== */
.login-form-area {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  background: #F1F5F9; padding: 30px;
}
.login-card {
  width: 100%; max-width: 400px;
  background: #fff; border: 1px solid #E2E8F0; border-radius: 16px;
  padding: 36px 32px; box-shadow: 0 14px 40px rgba(10,26,51,0.10);
}
.card-mini-logo {
  width: 52px; height: 52px; border-radius: 13px; overflow: hidden;
  margin-bottom: 18px; box-shadow: 0 6px 16px rgba(29,78,216,0.28);
}
.login-card h2 {
  font-size: 26px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.5px; color: #1E293B;
  font-family: 'Pretendard', system-ui, sans-serif;
}
.muted { color: #64748B; font-size: 13px; margin: 0 0 22px; }

.form-field { margin-bottom: 14px; }
.field-label { font-size: 12.5px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px; }
.input-wrap { position: relative; }
.input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; font-size: 15px; }
.input-eye {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: transparent; border: none; cursor: pointer; color: #94A3B8;
  padding: 4px 6px; border-radius: 6px; display: inline-flex; align-items: center;
}
.input-eye:hover { color: #334155; background: #F1F5F9; }
.input-wrap input {
  width: 100%; padding: 10px 38px 10px 36px;
  border: 1px solid #CBD5E1; background: #fff; color: #1E293B;
  border-radius: 9px; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s;
}
.input-wrap input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.14); }
.input-wrap input::placeholder { color: #B6C2D1; }

.btn-submit {
  width: 100%; padding: 11px;
  background: linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%);
  color: #fff; border: none; border-radius: 9px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 6px; box-shadow: 0 4px 12px rgba(29,78,216,0.26); transition: transform .15s, box-shadow .15s;
}
.btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(29,78,216,0.34); }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-submit .bi { font-size: 16px; }

.login-alert {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
  background: #FEE2E2; color: #991B1B; border-left: 3px solid #DC2626;
  border-radius: 6px; font-size: 12.5px; margin: 0 0 14px;
}


/* DB 상태 칩 */
.db-health-chip {
  position: absolute; right: 18px; bottom: 16px;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 20px; font-size: 12px;
  cursor: pointer; user-select: none; border: 1px solid #D1D5DB;
  background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.08); transition: transform .15s;
}
.db-health-chip:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,.12); }
.db-health-chip.is-ok      { border-color: #93c5fd; color: #1e3a8a; background: #dbeafe; }
.db-health-chip.is-fail    { border-color: #f1aeb5; color: #842029; background: #f8d7da; }
.db-health-chip.is-unknown { border-color: #d1d5db; color: #6b7280; }
.db-health-chip .bi { font-size: 14px; }
.db-health-text { font-weight: 500; }
.spinning { animation: spin 1.2s linear infinite; display: inline-block; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .login-page { grid-template-columns: 1fr; }
  .login-visual { display: none; }
}
</style>
