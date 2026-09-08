/**
 * 예제를 어디까지 만들 것인가 — DB_SAMPLES. (v1.10.41)
 *
 * ## 왜 나눴는가
 * 샘플이 13 컨트롤러 · 라우트 100개 남짓으로 불어났고, 그중 건강기록 3종

 * 36개를 차지했다. 같은 것을 세 번 보여 주는 셈이라 배울 것이 겹친다.
 *
 * ## 세 갈래
 *   core (기본)  튜토리얼이 실제로 쓰는 것만 — book · guestbook · students
 *   all          선택·정리 대상까지 전부
 *   none         예제 없음
 *
 * ★ v1.36.5 — deprecated 갈래를 **지웠다.**
 *   "파일은 남겨 두고 만들지만 않는다" 가 문제였다. 테이블은 없는데 컨트롤러는 남아
 *   콘솔 [API test] 에서 부르면 500 이 났다. 반쯤 치운 셈이었다.
 *   고칠 수 없으면 지우는 편이 낫다 — 예제는 처음 열어 보는 사람이 먼저 누르는 것이다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIG = path.join(ROOT, 'src/database/migrations');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** 파일 이름에서 갈래를 읽는다 (러너와 같은 규칙) */
const groupOf = (name) => (/_samples_(core|optional|deprecated)\.sql$/i.exec(name) || [])[1]?.toLowerCase() ?? null;

function tablesOf(file) {
  const sql = fs.readFileSync(path.join(MIG, file), 'utf8');
  return [...sql.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?\{\{\s*sample\s*\}\}(\w+)/gi)]
    .map((m) => m[1]);
}

test('★ 갈래별로 파일이 나뉘어 있다', () => {
  // 한 파일에 9개가 뭉쳐 있어 갈래별로 켜고 끌 수 없었다
  const files = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql'));
  const groups = new Set(files.map(groupOf).filter(Boolean));
  for (const g of ['core', 'optional']) {   /* deprecated 는 v1.36.5 에서 삭제 */
    assert.ok(groups.has(g), `${g} 갈래 파일이 없다`);
  }
});

test('★ 튜토리얼이 쓰는 것은 core 에 있다', () => {
  const files = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql'));
  // book · guestbook 은 003 · 006 (갈래 표시 없음 = 항상 만든다), students 는 core
  const always = files.filter((f) => groupOf(f) === null || groupOf(f) === 'core');
  const made = new Set(always.flatMap(tablesOf));
  for (const t of ['book', 'guestbook', 'students']) {
    assert.ok(made.has(t), `${t} 가 기본에서 만들어지지 않는다 — 튜토리얼이 깨진다`);
  }
});

test('★ 남은 예제는 모두 기본에서 만들어진다', () => {
  /* ★ v1.36.5 — 예전에는 "겹치는 예제는 optional/deprecated 로 빼 둔다" 였다.
     그런데 **테이블만 안 만들고 컨트롤러는 남겨** 두어, 콘솔에서 부르면 500 이 났다.
     deprecated 갈래를 통째로 지웠으므로, 이제 남은 예제는 전부 기본에서 돌아야 한다.
     실측(빈 DB · 기본 설정): books · guestbook · students · snack · secure-members 전부 200 */
  const files = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql'));
  assert.equal(files.some((f) => groupOf(f) === 'deprecated'), false,
    'deprecated 갈래는 지웠다 — 반쯤 치우면 그 예제가 500 을 낸다');

  /* 예제 컨트롤러가 쓰는 SQL 파일이 실제로 있어야 한다 */
  const sqlDir = path.join(ROOT, 'src/database/sql');
  for (const f of fs.readdirSync(path.join(ROOT, 'src/controller')).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(ROOT, 'src/controller', f), 'utf8');
    for (const m of src.matchAll(/@Sql\('([^']+)'\)/g)) {
      assert.ok(fs.existsSync(path.join(sqlDir, `${m[1]}.sql`)),
        `${f} 가 없는 SQL 을 가리킨다: ${m[1]}.sql`);
    }
  }
});

test('★ 기본값은 core 다', () => {
  assert.match(read('src/config/default.js'), /samples: 'core',/);
  assert.match(read('.env.example'), /^DB_SAMPLES=core$/m);
});

test('★ 예전 표기(true/false)도 받는다', () => {
  /* 배포본을 받은 분이 .env 를 안 고쳐도 동작이 깨지면 안 된다.
     v1.10.31 에서 배운 것: 새 설정을 넣을 때 기존 자산을 깨뜨리지 않는다. */
  const idx = read('src/config/index.js');
  assert.match(idx, /\(0\|false\|no\|off\|none\)/);
  assert.match(idx, /\(1\|true\|yes\|on\|all\)/);
  assert.match(idx, /if \(v === 'core'\) return 'core';/);
});

test('러너가 갈래를 보고 건너뛴다', () => {
  const r = read('src/database/migrationRunner.js');
  assert.match(r, /level === 'core' && \(g === 'optional' \|\| g === 'deprecated'\)/);
  assert.match(r, /level === 'none'/);
});

test('★ 갈래 표시가 없는 예제는 건너뛰지 않는다', () => {
  /* 003_init_book 처럼 이름에 갈래가 없는 파일은 만들어야 한다.
     애매하면 만드는 쪽이 안전하다 — 안 만들어서 깨지는 편이 더 위험하다. */
  const r = read('src/database/migrationRunner.js');
  assert.match(r, /return m \? m\[1\]\.toLowerCase\(\) : null;/);
});

test('원본 004 는 기록 보존용으로 남는다', () => {
  // 이미 적용된 기록이 있는 환경에서 파일을 지우면 안 된다
  const f = path.join(MIG, '004_init_samples.sql');
  assert.ok(fs.existsSync(f), '004 를 지우면 기존 환경의 기록과 어긋난다');
  assert.equal(tablesOf('004_init_samples.sql').length, 0, '내용은 비어 있어야 한다');
});
