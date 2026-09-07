#!/usr/bin/env node
/**
 * verify-env.mjs — 실행 검증 전에 환경이 온전한지 확인한다. `npm run check:env`
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  왜 필요한가
 * ══════════════════════════════════════════════════════════════════════════
 *  단위 시험을 돌리려고 만든 **가짜 드라이버(stub)** 가 `node_modules` 에 남아
 *  있으면, 서버가 이런 식으로 죽습니다.
 *
 *      TypeError: Cannot read properties of undefined (reading 'createPool')
 *
 *  원인이 코드에 있는 것처럼 보여서 한참 헤매게 됩니다 — 실제로 v1.10.18~20
 *  검증 중 **세 번** 이 함정에 걸렸습니다. 원인은 늘 같았습니다.
 *
 *  그래서 서버를 띄우기 전에 **드라이버가 진짜인지** 먼저 확인합니다.
 *  1초면 끝나고, 헤맬 시간을 몇십 분 아낍니다.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  무엇을 보는가
 * ══════════════════════════════════════════════════════════════════════════
 *   ① 설정된 DB 종류의 드라이버가 설치돼 있고 **가짜가 아닌지**
 *   ② 그 드라이버로 실제 접속이 되는지 (DB 가 떠 있는지)
 *   ③ 예제 스키마 분리를 쓴다면 그 스키마를 만들 권한이 있는지
 *
 *  ⚠ 고치지는 않습니다. 무엇이 잘못됐고 어떻게 고치는지 알려 줄 뿐입니다.
 *    자동으로 고치면 "왜 이렇게 됐는지" 를 배우지 못하고, 다음에 또 걸립니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];

const say = (icon, label, detail) => console.log(`  ${icon} ${label.padEnd(26)} ${detail}`);

/* ── ① 드라이버가 진짜인가 ──────────────────────────────────────────────── */

/**
 * 가짜 드라이버는 겉모습이 진짜와 같습니다(`createPool` 이 함수). 그래서
 * **함수 본문**을 봅니다 — stub 은 전역 훅으로 넘기거나 몸통이 거의 비어 있습니다.
 */
function looksFake(mod, dir) {
  const src = String(mod?.createConnection ?? '') + String(mod?.createPool ?? '');
  if (/__FAKE|globalThis\./.test(src)) return '전역 훅으로 넘기는 가짜입니다';
  // 진짜 드라이버는 파일이 여러 개다 — stub 은 index.js 하나뿐인 경우가 많다
  try {
    const files = fs.readdirSync(dir).filter((f) => f !== 'package.json');
    if (files.length <= 1 && files[0] === 'index.js') {
      const body = fs.readFileSync(path.join(dir, 'index.js'), 'utf8');
      if (body.length < 600) return `본문이 ${body.length}바이트뿐입니다 (stub 으로 보입니다)`;
    }
  } catch { /* 읽을 수 없으면 판단하지 않는다 */ }
  return null;
}

const DRIVERS = { mariadb: 'mariadb', mysql: 'mariadb', sqlite: 'better-sqlite3' };

async function main() {
  const config = (await import(pathToFileURL(path.join(ROOT, 'src/config/index.js')).href)).default;
  const type = String(config.db?.type || 'sqlite').toLowerCase();
  const pkg = DRIVERS[type] || 'better-sqlite3';

  console.log(`\n  DB 종류  ${type}  ·  드라이버  ${pkg}\n`);

  const dir = path.join(ROOT, 'node_modules', pkg);
  if (!fs.existsSync(dir)) {
    say('✖', '드라이버', `설치되어 있지 않습니다 → npm i ${pkg}`);
    problems.push(`${pkg} 미설치`);
  } else {
    let mod = null;
    try { mod = await import(pkg); mod = mod.default ?? mod; } catch (e) {
      say('✖', '드라이버 로드', String(e.message).slice(0, 70));
      problems.push(`${pkg} 로드 실패`);
    }
    if (mod) {
      const fake = looksFake(mod, dir);
      if (fake) {
        say('✖', '드라이버', `가짜입니다 — ${fake}`);
        console.log(`     시험용 stub 이 남아 있습니다. 지우고 다시 설치하세요:`);
        console.log(`       rm -rf node_modules/${pkg} && npm i ${pkg}`);
        problems.push(`${pkg} 가 stub`);
      } else {
        say('✓', '드라이버', '진짜입니다');
      }
    }
  }

  /* ── ② 실제로 접속되는가 ──────────────────────────────────────────────── */
  if (!problems.length && (type === 'mariadb' || type === 'mysql')) {
    const drv = (await import('mariadb')).default ?? (await import('mariadb'));
    const { host, port, user, password } = config.db;
    try {
      const conn = await drv.createConnection({ host, port, user, password, connectTimeout: 3000 });
      const [row] = await conn.query('SELECT VERSION() AS v');
      say('✓', 'DB 접속', `${host}:${port} — ${row.v}`);

      /* ── ③ 예제 스키마 권한 ───────────────────────────────────────────── */
      if (config.db.samples !== false && config.db.sampleSchemaSeparate !== false) {
        const { sampleSchemaName } = await import(
          pathToFileURL(path.join(ROOT, 'src/database/tablePrefix.js')).href);
        const schema = sampleSchemaName();
        try {
          await conn.query(`CREATE DATABASE IF NOT EXISTS \`${schema}\``);
          say('✓', '예제 스키마', `${schema} — 만들 수 있습니다`);
        } catch (e) {
          say('✖', '예제 스키마', `${schema} 생성 불가 — ${String(e.message).slice(0, 50)}`);
          console.log(`     DBA 에게 요청하세요:  GRANT ALL ON \`${schema}\`.* TO '${user}'@'%';`);
          problems.push('예제 스키마 권한 없음');
        }
      } else {
        notes.push('예제 스키마 분리가 꺼져 있습니다 (접두사 사용)');
      }
      await conn.end();
    } catch (e) {
      say('✖', 'DB 접속', `${host}:${port} — ${String(e.message).slice(0, 60)}`);
      problems.push('DB 접속 실패');
    }
  } else if (type === 'sqlite') {
    say('✓', 'DB', '파일 기반 — 별도 서버가 필요 없습니다');
    notes.push('SQLite 는 스키마 개념이 없어 예제가 접두사(sample_)로 들어갑니다');
  }

  console.log('');
  for (const n of notes) console.log(`  · ${n}`);
  if (problems.length) {
    console.log(`\n  ✖ 문제 ${problems.length}건 — 위 안내대로 고친 뒤 다시 실행하세요.\n`);
    process.exit(1);
  }
  console.log('\n  ✓ 서버를 띄울 준비가 되었습니다.\n');
}

main().catch((e) => {
  console.error('\n  ✖ 점검 중 오류:', e.message, '\n');
  process.exit(1);
});
