/**
 * 예제를 어디까지 만들 것인가 — DB_SAMPLES. (v1.10.41)
 *
 * ## 왜 나눴는가
 * 샘플이 13 컨트롤러 · 라우트 100개 남짓으로 불어났고, 그중 건강기록 3종
 * (weight · blood_pressure · blood_sugar)이 **구조가 거의 같은데** 라우트
 * 36개를 차지했다. 같은 것을 세 번 보여 주는 셈이라 배울 것이 겹친다.
 *
 * ## 세 갈래
 *   core (기본)  튜토리얼이 실제로 쓰는 것만 — book · guestbook · students
 *   all          선택·정리 대상까지 전부
 *   none         예제 없음
 *
 * ⚠ 기본이 `core` 다. 파일은 지우지 않았으므로 `all` 로 켜면 그대로 돌아온다.
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
  for (const g of ['core', 'optional', 'deprecated']) {
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

test('★ 겹치는 예제는 기본에서 빠진다', () => {
  const files = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql'));
  const optionalOrDep = files.filter((f) => ['optional', 'deprecated'].includes(groupOf(f)));
  const made = new Set(optionalOrDep.flatMap(tablesOf));
  // blood_* 는 weight_* 와 구조가 같다 — 셋 다 기본으로 만들 이유가 없다
  for (const t of ['blood_pressure_records', 'blood_sugar_records', 'person', 'secure_member']) {
    assert.ok(made.has(t), `${t} 가 아직 기본에 남아 있다`);
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
  assert.match(r, /_samples_\(core\|optional\|deprecated\)/);
  assert.match(r, /level === 'core' && \(g === 'optional' \|\| g === 'deprecated'\)/);
  assert.match(r, /level === 'none'/);
});

test('★ 갈래 표시가 없는 예제는 건너뛰지 않는다', () => {
  /* 003_init_book 처럼 이름에 갈래가 없는 파일은 만들어야 한다.
     애매하면 만드는 쪽이 안전하다 — 안 만들어서 깨지는 편이 더 위험하다. */
  const r = read('src/database/migrationRunner.js');
  assert.match(r, /const m = \/_samples_\(core\|optional\|deprecated\)\\\.sql\$\/i\.exec\(name\);/);
  assert.match(r, /return m \? m\[1\]\.toLowerCase\(\) : null;/);
});

test('원본 004 는 기록 보존용으로 남는다', () => {
  // 이미 적용된 기록이 있는 환경에서 파일을 지우면 안 된다
  const f = path.join(MIG, '004_init_samples.sql');
  assert.ok(fs.existsSync(f), '004 를 지우면 기존 환경의 기록과 어긋난다');
  assert.equal(tablesOf('004_init_samples.sql').length, 0, '내용은 비어 있어야 한다');
});
