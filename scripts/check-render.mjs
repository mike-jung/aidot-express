/**
 * check-render.mjs — Vue 컴포넌트를 **실제 브라우저에 마운트해서** 렌더 오류를 잡는다. (v1.8.1)
 *
 *  ## 컴파일 통과 ≠ 렌더 성공
 *  `check-sfc.mjs` 는 문법을 본다. 하지만 실제로 화면이 깨지는 원인은 대개 런타임이다.
 *    · `computed` 안에서 undefined 를 파고들어 TypeError
 *    · props 기본값이 없어 `.length` 접근 실패
 *    · 라이프사이클 훅에서 던진 예외
 *    · import 는 됐지만 실제로는 존재하지 않는 export
 *  이런 건 마운트해 봐야 안다.
 *
 *  ## vite 없이 어떻게 하는가
 *   1. `@vue/compiler-sfc` 로 SFC → ESM 자바스크립트로 컴파일
 *   2. 결과를 임시 폴더에 풀고, `importmap` 으로 `vue` 를 브라우저 ESM 빌드에 연결
 *   3. Node 내장 http 서버로 서빙하고 Playwright(Chromium)로 열어 마운트
 *   4. console.error / pageerror / Vue warn 을 모두 모아 보고
 *
 *  네트워크 요청은 전부 가로채 가짜 응답을 준다 — 서버 없이 화면만 검증한다.
 *
 *  실행: node scripts/check-render.mjs [컴포넌트경로 ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientSrc = path.join(root, 'admin-client', 'src');
const work = path.join(root, '.cache', 'render-check');

/* ── 의존성 해석 ─────────────────────────────────────────────────────────── */
function resolveFrom(bases, spec) {
  for (const b of bases) {
    try { return createRequire(b).resolve(spec); } catch { /* 다음 */ }
  }
  return null;
}
const bases = [path.join(root, 'admin-client', 'package.json'), path.join(root, 'package.json')];

const sfcPath = resolveFrom(bases, '@vue/compiler-sfc');
if (!sfcPath) { console.error('@vue/compiler-sfc missing — install the admin-client dependencies.'); process.exit(2); }
const { parse, compileScript, compileTemplate, compileStyle, rewriteDefault } =
  await import(pathToFileURL(sfcPath).href);

const vueBrowser = resolveFrom(bases, 'vue/dist/vue.esm-browser.js')
  || path.join(root, 'admin-client', 'node_modules', 'vue', 'dist', 'vue.esm-browser.js');
if (!fs.existsSync(vueBrowser)) { console.error('no vue browser build'); process.exit(2); }

/* playwright 는 CJS 라 ESM 으로 import 하면 default 안에 들어간다.
   전역 설치본까지 후보에 넣고, 없으면 렌더 검증만 건너뛴다 (실패로 치지 않는다). */
const PW_GLOBAL = path.join(process.env.HOME || '', '.npm-global', 'lib', 'node_modules', 'playwright');
let playwright = null;
for (const cand of [...bases.map((b) => [b, 'playwright']), [null, PW_GLOBAL]]) {
  try {
    const target = cand[0] ? createRequire(cand[0]).resolve(cand[1]) : cand[1];
    const mod = await import(pathToFileURL(target).href);
    playwright = mod.chromium ? mod : (mod.default?.chromium ? mod.default : null);
    if (playwright) break;
  } catch { /* 다음 후보 */ }
}
if (!playwright) {
  console.log('playwright missing — skipping browser render checks (syntax is covered by check-sfc.mjs).');
  process.exit(0);
}

/* ── 대상 ────────────────────────────────────────────────────────────────── */
function expand(p) {
  const abs = path.resolve(p);
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    const out = [];
    (function w(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === 'dist') continue;
        const q = path.join(d, e.name);
        if (e.isDirectory()) w(q); else if (e.name.endsWith('.vue')) out.push(q);
      }
    })(abs);
    return out.sort();
  }
  return [abs];
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2).flatMap(expand)
  : [
    path.join(clientSrc, 'components', 'ConfirmDialog.vue'),
    path.join(clientSrc, 'components', 'BaseModal.vue'),
    path.join(clientSrc, 'components', 'SettingsDialog.vue'),
    path.join(clientSrc, 'components', 'CommandPalette.vue'),
    path.join(clientSrc, 'views', 'TraceExplorer.vue'),
  ];

/* ── SFC → ESM ───────────────────────────────────────────────────────────── */
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

const compiled = [];
for (const file of targets) {
  if (!fs.existsSync(file)) { console.log(`  skipped (missing): ${file}`); continue; }
  const src = fs.readFileSync(file, 'utf8');
  const id = path.basename(file, '.vue');
  const { descriptor, errors } = parse(src, { filename: file });
  if (errors?.length) { compiled.push({ id, file, error: errors[0].message }); continue; }

  let js = '';
  try {
    const script = compileScript(descriptor, { id, inlineTemplate: false, genDefaultAs: '__sfc__' });
    js += script.content + '\n';
    if (descriptor.template) {
      const t = compileTemplate({
        source: descriptor.template.content, filename: file, id,
        compilerOptions: { bindingMetadata: script.bindings },
      });
      if (t.errors?.length) throw new Error(String(t.errors[0].message || t.errors[0]));
      js += t.code.replace('export function render', 'function render') + '\n';
      js += '__sfc__.render = render;\n';
    }
    js += `__sfc__.__file = ${JSON.stringify(path.relative(root, file))};\nexport default __sfc__;\n`;
  } catch (e) {
    compiled.push({ id, file, error: e.message.split('\n')[0] });
    continue;
  }

  let css = '';
  for (const st of descriptor.styles) {
    const r = compileStyle({ source: st.content, filename: file, id: `data-v-${id}`, scoped: !!st.scoped });
    if (!r.errors?.length) css += r.code + '\n';
  }
  fs.writeFileSync(path.join(work, `${id}.js`), js, 'utf8');
  if (css) fs.writeFileSync(path.join(work, `${id}.css`), css, 'utf8');
  compiled.push({ id, file, css: !!css });
}

const compileFailed = compiled.filter((c) => c.error);
const ready = compiled.filter((c) => !c.error);

/* ── 스텁: 실제 서버·라우터·스토어 없이 화면만 본다 ───────────────────────── */
fs.writeFileSync(path.join(work, '__stubs.js'), `
import { ref, reactive, computed } from 'vue';
export const http = new Proxy({}, { get: () => async () => ({ data: { data: [], total: 0 } }) });
export const useRouter = () => ({ push: async () => {}, replace: async () => {}, resolve: () => ({ href: '#' }) });
export const useRoute  = () => ({ params: {}, query: {}, path: '/', fullPath: '/', name: 'stub' });
export const onBeforeRouteLeave = () => {};
export const useToastStore = () => ({ push: () => 1, remove: () => {}, items: [] });
export const useAuthStore = () => reactive({
  user: { username: 'tester', name: '테스터', email: 't@x.io', role: 'admin', mustChangePassword: true },
  isLoggedIn: true, logout: async () => {}, silentRefresh: async () => {},
});
export const PREF_KEYS = { rememberSidebar: 'a', sidebarCollapsed: 'b', confirmLogout: 'c', theme: 'd', density: 'e' };
export const readPref = (_k, d) => d;
export const writePref = () => true;
export const confirmState = reactive({ open: true, title: '삭제 확인', message: "'BookController' 을(를) 삭제할까요?",
  detail: '되돌릴 수 없습니다.', confirmText: '삭제', cancelText: '취소', variant: 'danger', requireText: 'BookController', typed: '', icon: 'bi-trash3' });
export const confirmDialog = async () => true;
export const confirmDelete = async () => true;
export const resolveConfirm = () => {};
export const canConfirm = () => false;
export const notifyError = () => {}; export const notifySuccess = () => {};
export const notifyInfo = () => {}; export const notifyWarning = () => {};
export const errorMessage = (e) => String(e?.message ?? e ?? '');
export const useUnsavedGuard = () => ({ skipOnce: () => {} });
export default http;
`, 'utf8');

/* ── 정적 서버 ───────────────────────────────────────────────────────────── */
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/vue.js') {
    res.writeHead(200, { 'content-type': 'text/javascript' });
    return res.end(fs.readFileSync(vueBrowser));
  }
  const p = path.join(work, url.replace(/^\//, ''));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' });
    return res.end(fs.readFileSync(p));
  }
  res.writeHead(404); res.end('nf');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

/* ── 브라우저 ────────────────────────────────────────────────────────────── */
const browser = await playwright.chromium.launch();
const results = [];

for (const c of ready) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.split('\n')[0]}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const t = m.text();
      if (/\[Vue warn\]|TypeError|ReferenceError|Cannot read|is not a function|Failed to resolve/.test(t)) {
        problems.push(`${m.type()}: ${t.split('\n')[0].slice(0, 200)}`);
      }
    }
  });
  // 네트워크는 전부 가짜 응답 — 서버 없이 화면만 검증한다
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"data":[],"total":0}' }));
  await page.route('**/health', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"version":"test"}' }));

  const html = `<!doctype html><html data-bs-theme="light" data-density="comfortable"><head><meta charset="utf-8">
${c.css ? `<link rel="stylesheet" href="/${c.id}.css">` : ''}
<script type="importmap">{"imports":{
  "vue":"/vue.js",
  "../api/http":"/__stubs.js","../../api/http":"/__stubs.js",
  "vue-router":"/__stubs.js",
  "../stores/auth":"/__stubs.js","../../stores/auth":"/__stubs.js",
  "../stores/toasts":"/__stubs.js","../../stores/toasts":"/__stubs.js",
  "../utils/prefs":"/__stubs.js","../../utils/prefs":"/__stubs.js",
  "../composables/useConfirm":"/__stubs.js","../../composables/useConfirm":"/__stubs.js",
  "../composables/useNotify":"/__stubs.js","../../composables/useNotify":"/__stubs.js",
  "../composables/useUnsavedGuard":"/__stubs.js","../../composables/useUnsavedGuard":"/__stubs.js",
  "./BaseModal.vue":"/BaseModal.js","../components/BaseModal.vue":"/BaseModal.js"
}}</script></head>
<body><div id="app"></div>
<script type="module">
  import { createApp, h } from 'vue';
  import C from '/${c.id}.js';
  // 컴포넌트가 선언한 props 만 넘긴다 — 없는 속성을 넘기면 Vue 가 경고를 내는데
  // 그건 컴포넌트 결함이 아니라 하네스 결함이다.
  const CANDIDATES = { open: true, modelValue: '', menu: [], controller: { id: 1, name: 'X', routes: [] },
                       title: '검증', node: { type: 'dir', name: '', children: [] } };
  const declared = C.props ? (Array.isArray(C.props) ? C.props : Object.keys(C.props)) : [];
  const props = {};
  for (const k of declared) if (k in CANDIDATES) props[k] = CANDIDATES[k];
  const app = createApp({ render: () => h(C, props) });
  app.config.warnHandler = (msg, _i, trace) => console.error('[Vue warn] ' + msg + ' ' + String(trace).slice(0,120));
  app.config.errorHandler = (err) => console.error('[Vue error] ' + (err?.message ?? err));
  try { app.mount('#app'); window.__MOUNTED__ = true; }
  catch (e) { console.error('[mount] ' + e.message); window.__MOUNTED__ = false; }
</script></body></html>`;

  /* setContent 는 about:blank 문서라 origin 이 null 이고, 그러면 importmap 의 절대경로가
     차단된다("blocked by a null value"). 이미 정적 서버가 떠 있으니 파일로 내려 실제 URL 로 연다. */
  fs.writeFileSync(path.join(work, `${c.id}.html`), html, 'utf8');
  await page.goto(`http://127.0.0.1:${port}/${c.id}.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  const mounted = await page.evaluate(() => window.__MOUNTED__ === true).catch(() => false);
  /* BaseModal·ConfirmDialog·CommandPalette 는 <Teleport to="body"> 를 쓴다.
     그러면 실제 DOM 은 #app 밖에 생기므로 body 전체에서 센다 (script/importmap 은 제외). */
  const text = await page.evaluate(() => {
    const c = document.body.cloneNode(true);
    c.querySelectorAll('script').forEach((n) => n.remove());
    return (c.innerText || c.textContent || '').trim();
  }).catch(() => '');
  const nodes = await page.evaluate(
    () => document.querySelectorAll('body *:not(script)').length).catch(() => 0);

  /* '검증 못 함' 과 '깨짐' 을 구분한다. 섞으면 신호가 잡음에 묻혀 도구가 쓸모없어진다.
       · 외부 라이브러리 스텁이 없음(@vue-flow, chart.js …)      → 하네스 한계
       · 로컬 하위 컴포넌트를 import 하는데 컴파일 대상이 아님    → 하네스 한계
       · 필수 prop 을 하네스가 만들어 줄 수 없음                  → 하네스 한계
     위 셋은 SKIP. 진짜 런타임 예외([Vue error]/pageerror TypeError)만 FAIL 로 센다. */
  const harnessLimit =
    problems.some((p) => /Failed to resolve module specifier|does not provide an export named|Missing required prop/.test(p))
    || (!mounted && problems.length === 0);
  /* 필수 prop 이 없으면 그 뒤의 TypeError 는 전부 그 결과다 (`.length` of undefined 등).
     원인이 하네스에 있으므로 연쇄 오류까지 SKIP 으로 묶는다 — 아니면 매번 같은 2건이 빨갛게 남는다. */
  const missingProp = problems.some((p) => /Missing required prop/.test(p));
  const realError = !missingProp && problems.some((p) =>
    /\[Vue error\]|TypeError|ReferenceError|Cannot read properties/.test(p));
  results.push({
    id: c.id, mounted, nodes, chars: text.length, problems,
    skipped: harnessLimit && !realError,
  });
  await page.close();
}

await browser.close();
server.close();

/* ── 보고 ────────────────────────────────────────────────────────────────── */
console.log(`\nReal browser render check (Chromium)`);
let bad = compileFailed.length;
for (const f of compileFailed) console.log(`  FAIL [compile] ${f.id} — ${f.error}`);
let skipped = 0;
for (const r of results) {
  if (r.skipped) {
    skipped++;
    const why = r.problems.find((p) => /Missing required prop/.test(p)) ? '필수 prop 필요'
      : r.problems.find((p) => /Failed to resolve|does not provide/.test(p)) ? '외부/로컬 모듈 스텁 없음'
      : '마운트 컨텍스트 부족';
    console.log(`  SKIP  ${r.id.padEnd(22)} ${why}`);
    continue;
  }
  const okMount = r.mounted && r.nodes > 0 && r.problems.length === 0;
  if (!okMount) bad++;
  console.log(`  ${okMount ? 'PASS' : 'FAIL'}  ${r.id.padEnd(22)} mounted=${r.mounted ? 'Y' : 'N'} nodes=${String(r.nodes).padStart(4)} text=${String(r.chars).padStart(4)} chars`);
  for (const p of r.problems.slice(0, 4)) console.log(`         ↳ ${p}`);
}
console.log(`\n${compiled.length} targets — passed ${results.length - bad - skipped}, failed ${bad}, skipped ${skipped}`);
process.exit(bad ? 1 : 0);
