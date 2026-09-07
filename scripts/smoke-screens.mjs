#!/usr/bin/env node
/**
 * scripts/smoke-screens.mjs — 콘솔의 **모든 화면을 실제로 열어 본다** (`npm run smoke`)
 *
 *  왜 필요한가 — 두 번 크게 데였다.
 *   · 다국어 추출 도구가 t() 만 넣고 선언을 빠뜨려 **화면 디자이너가 통째로 죽어 있었다**
 *   · 선언을 옮기는 스크립트가 주석 블록 한가운데 넣어 **대시보드·요청 추적이 죽어 있었다**
 *  둘 다 문법 검사도 단위 시험도 통과한다. 화면은 뜨는데 그 안이 비어 보일 뿐이라
 *  **열어 보지 않으면 모른다.** 자동 수정 스크립트를 돌린 뒤에는 반드시 이것을 돌린다.
 *
 *  판정: 화면마다 (1) 콘솔 오류가 없고 (2) 본문이 일정 길이 이상이면 정상.
 *        (본문 길이를 보는 이유 — 죽은 화면은 껍데기만 남아 글자가 거의 없다)
 *
 *  사용: npm run smoke            (기본 http://127.0.0.1:7901, admin/admin1234)
 *        SMOKE_URL=... SMOKE_USER=... SMOKE_PASS=... npm run smoke
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:7901';
const USER = process.env.SMOKE_USER || 'admin';
const PASS = process.env.SMOKE_PASS || 'admin1234';
const MIN_BODY = 150;                       // 이보다 짧으면 껍데기로 본다

let pw;
try {
  pw = require('playwright');
} catch {
  try { pw = require('/home/claude/.npm-global/lib/node_modules/playwright'); }
  catch {
    console.log('smoke: playwright 가 없어 건너뜁니다 (npm i -D playwright 후 사용)');
    process.exit(0);
  }
}

/* 화면 목록. 세 번째 값이 true 면 **설정에 따라 감춰질 수 있는** 화면이다.
 *
 *  왜 나누나 — v1.25.0 부터 백업/복원 · DB 컬럼 암호화 · 이중화는 기본 감춤이다.
 *  예전 smoke 는 "메뉴에 없음 → 건너뜀" 으로 조용히 넘어가, 17 → 14 로 줄어도
 *  **감춰진 것인지 진짜 사라진 것인지 구분할 수 없었다.**
 *  이제 감춰질 수 있는 화면만 건너뛰고, 그 외가 없으면 실패로 잡는다. */
const SCREENS = [
  ['홈', '/'], ['대시보드', '/dashboard'], ['부하 모니터링', '/monitoring'],
  ['컨트롤러', '/controllers'], ['서비스', '/services'], ['SQL', '/sqls'],
  ['API 테스트', '/api-tester'], ['시나리오 테스트', '/scenarios'],
  ['화면 디자이너', '/screen-designer'], ['접속 통계', '/access-stats'],
  ['로그', '/logs'], ['요청 추적', '/trace'], ['OpenAPI 스펙', '/openapi'],
  ['백업/복원', '/backup', true],
  ['DB 컬럼 암호화', '/secure-columns', true],
  ['이중화', '/ha', true],
  ['사용자', '/users'],
];

const browser = await pw.chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGE: ' + String(e.message).slice(0, 140)));
page.on('console', (m) => {
  const t = m.text();
  /* 401 과 리소스 로드 실패는 로그인 전후에 정상적으로 나므로 뺀다 */
  if (m.type() === 'error' && !/401|Failed to load resource/.test(t)) errs.push('CONSOLE: ' + t.slice(0, 140));
});

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', USER);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 });
} catch (e) {
  console.error('smoke: 로그인 실패 —', String(e.message).slice(0, 120));
  await browser.close();
  process.exit(1);
}

const bad = [];
const hidden = [];
let checked = 0;
for (const [name, href, optional] of SCREENS) {
  const before = errs.length;
  const link = page.locator(`a[href="${href}"]`).first();
  if (!(await link.count())) {
    if (optional) {
      /* 설정으로 꺼 둔 것 — 정상이다. 다만 몇 개가 왜 빠졌는지는 끝에 적는다 */
      hidden.push(name);
      console.log(`  · ${name} — 설정에서 꺼져 있어 건너뜀`);
    } else {
      bad.push({ name, len: 0, errs: ['메뉴에 없음 — 사라졌거나 라우트가 깨졌습니다'] });
      console.log(`  ✗ ${name} — 메뉴에 없음 (감춤 대상이 아닌데 사라졌습니다)`);
    }
    continue;
  }
  await link.click();
  await page.waitForTimeout(1800);
  const len = await page.evaluate(() => ((document.querySelector('.main') || document.body).innerText || '').length);
  const newErrs = errs.slice(before);
  checked++;
  if (newErrs.length || len < MIN_BODY) {
    bad.push({ name, len, errs: newErrs });
    console.log(`  ✗ ${name} — 본문 ${len}자${newErrs.length ? `, 오류 ${newErrs.length}건` : ' (내용이 거의 없다)'}`);
    for (const e of newErrs.slice(0, 2)) console.log(`      ${e}`);
  } else {
    console.log(`  ✓ ${name} — 본문 ${len}자`);
  }
}

await browser.close();
console.log(`\nsmoke: ${checked - bad.length} / ${checked} 정상`
  + (hidden.length ? ` · 설정으로 꺼진 화면 ${hidden.length}개 (${hidden.join(', ')})` : ''));
if (bad.length) { console.error(`열리지 않는 화면 ${bad.length}개 — 위 오류를 보세요.`); process.exit(1); }
