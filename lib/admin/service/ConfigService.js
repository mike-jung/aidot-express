/**
 * ConfigService — 서버의 환경설정 파일 조회/편집.
 *
 *  편집 가능한 파일 (화이트리스트 고정 — 다른 경로 거부):
 *    .env
 *    src/config/default.js
 *    src/config/development.js
 *    src/config/production.js
 *    src/config/test.js
 *
 *  보안:
 *   - 파일 ID 는 화이트리스트 키 (위 목록). 직접 경로 지정 불가.
 *   - 절대 경로/`..` 트래버설 완전 차단
 *   - 저장 시 타임스탬프 백업 생성 (<file>.bak-YYYYMMDD-HHMMSS)
 *   - .env 의 비밀값 (secret/password/token) 은 조회시 마스킹 옵션
 */
import fs from 'node:fs';
import { displayPath } from '../../../src/core/appPaths.js';   // ★ v1.12.0
import db from '../../../src/database/db.js';   // ★ v1.12.2
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Service, Log } from '../../../src/core/decorators.js';
import { safeWriteFile } from './safeFs.js';
import { resolveWorkspacePath } from '../../../src/core/workspacePath.js';
import config, { loadedEnvFiles } from '../../../src/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..', '..');

/**
 * .env 파일의 실제 위치를 동적 해석.
 *
 * <p>config/index.js 가 기동 시 로드한 파일 (loadedEnvFiles) 이 있으면 그 경로 사용.
 * 그렇지 않으면 userData → resources → projectRoot 순으로 탐색.
 *
 * <p>이 결과는 ConfigService.listFiles / readFile / writeFile 이 전부 같은 위치를 쓰게 해
 * "Dashboard 에서 편집한 .env 가 서버가 실제 로드하는 .env 와 일치" 를 보장한다.
 */
function resolveEnvPath() {
  // 1) 기동 시 실제 로드된 파일 (가장 신뢰 가능한 신호)
  if (loadedEnvFiles && loadedEnvFiles.length > 0) {
    return loadedEnvFiles[0];
  }
  // 2) userData — Electron 실행본일 때만 의미있음
  const userDataPath = process.env.ELECTRON_USER_DATA_PATH || '';
  if (userDataPath) {
    const p = path.join(userDataPath, '.env');
    if (fs.existsSync(p)) return p;
  }
  // 3) resources — packaged Electron
  const resourcesPath = process.resourcesPath || process.env.ELECTRON_RESOURCES_PATH || '';
  if (resourcesPath) {
    const p = path.join(resourcesPath, '.env');
    if (fs.existsSync(p)) return p;
  }
  // 4) 소스 루트 (개발 모드)
  return path.resolve(projectRoot, '.env');
}

/**
 * 파일 id 에 해당하는 절대 경로 리턴. env 만 동적, 나머지는 projectRoot 기준.
 */
function resolveAbsPath(id, relPath) {
  if (id === 'env') return resolveEnvPath();
  return path.resolve(projectRoot, relPath);
}

/**
 * .env 파일을 인코딩 자동 감지해서 UTF-8 문자열로 반환.
 * 인스톨러가 Unicode NSIS 로 UTF-16LE 저장한 경우도 정상 처리.
 * BOM 은 제거된 상태로 반환 (편집기에 BOM 문자가 보이지 않도록).
 */
function readWithBomDetect(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    return buf.slice(2).toString('utf16le');
  }
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    const swapped = Buffer.alloc(buf.length - 2);
    for (let i = 2; i < buf.length; i += 2) {
      swapped[i - 2]     = buf[i + 1] ?? 0;
      swapped[i - 2 + 1] = buf[i];
    }
    return swapped.toString('utf16le');
  }
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.slice(3).toString('utf8');
  }
  return buf.toString('utf8');
}

/** 편집 가능한 설정 파일 목록 (id → { relPath, label, lang, optional, requiresRestart }) */
const FILE_MAP = {
  env: {
    relPath: '.env',
    label: '.env',
    lang: 'dotenv',
    optional: true,    // 없으면 빈 상태로 신규 생성 가능
    requiresRestart: true,
    description: '런타임에 적용되는 환경 변수. 빈 파일도 허용.', descKey: 'env',
  },
  default: {
    relPath: 'src/config/default.js',
    label: 'config/default.js',
    lang: 'javascript',
    optional: false,
    requiresRestart: true,
    description: '기본 설정. NODE_ENV 별 파일 및 .env 로 오버라이드됨.', descKey: 'default',
  },
  development: {
    relPath: 'src/config/development.js',
    label: 'config/development.js',
    lang: 'javascript',
    optional: true,
    requiresRestart: true,
    description: 'NODE_ENV=development 일 때 default 를 덮어씀.', descKey: 'development',
  },
  production: {
    relPath: 'src/config/production.js',
    label: 'config/production.js',
    lang: 'javascript',
    optional: true,
    requiresRestart: true,
    description: 'NODE_ENV=production 일 때 default 를 덮어씀.', descKey: 'production',
  },
  test: {
    relPath: 'src/config/test.js',
    label: 'config/test.js',
    lang: 'javascript',
    optional: true,
    requiresRestart: true,
    description: 'NODE_ENV=test 일 때 default 를 덮어씀.', descKey: 'test',
  },
};

/** .env 포맷에서 값이 비밀키 같은 이름인지 판정 */
const SECRET_KEY_RE = /(SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE_KEY|API_KEY|MASTER|CREDENTIAL|_KEY$|^KEY_)/i;

/** .env 한 줄을 key/value 로 파싱 (단순 형태만) */
function parseEnvLine(line) {
  if (!line || line.trim().startsWith('#')) return null;
  const eq = line.indexOf('=');
  if (eq < 0) return null;
  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1);
  // 앞뒤 따옴표 제거
  const trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    val = trimmed.slice(1, -1);
  } else {
    val = trimmed;
  }
  return { key, value: val };
}

function maskSecret(v) {
  if (!v) return v;
  if (v.length <= 4) return '****';
  return v.slice(0, 2) + '***' + v.slice(-2);
}

function stampSuffix() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

@Service('ConfigService')
export default class ConfigService {
  @Log log;

  /** 편집 가능한 파일 메타 목록. env 는 실제 로드된 절대경로를 포함. */
  listFiles() {
    return Object.entries(FILE_MAP).map(([id, info]) => {
      const abs = resolveAbsPath(id, info.relPath);
      const exists = fs.existsSync(abs);
      let size = 0, mtime = null, encoding = null;
      if (exists) {
        try {
          const st = fs.statSync(abs);
          size = st.size;
          mtime = st.mtime.toISOString();
          if (id === 'env') {
            const buf = fs.readFileSync(abs);
            if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE)      encoding = 'UTF-16LE (BOM)';
            else if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) encoding = 'UTF-16BE (BOM)';
            else if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) encoding = 'UTF-8 (BOM)';
            else encoding = 'UTF-8';
          }
        } catch { /* noop */ }
      }
      const row = { id, label: info.label, relPath: info.relPath, lang: info.lang,
                    optional: info.optional, requiresRestart: info.requiresRestart,
                    description: info.description,
                    /* ★ v1.19.5 — 화면이 번역할 수 있도록 **키도 함께** 내려보낸다.
                       description(한글)은 그대로 둬서 예전 화면·API 사용처가 깨지지 않게 한다. */
                    descKey: info.descKey || null,
                    exists, size, mtime };
      if (id === 'env') {
        // Dashboard 에 실제 로드된 절대경로/인코딩 표시 — 디버깅 필수
        row.absPath = abs;
        row.encoding = encoding;
        row.loadedFiles = Array.isArray(loadedEnvFiles) ? [...loadedEnvFiles] : [];
      }
      return row;
    });
  }

  /** 파일 내용 조회. mask=true 면 .env 의 비밀키 값 마스킹. */
  readFile({ id, mask = false } = {}) {
    const info = FILE_MAP[id];
    if (!info) throw Object.assign(new Error('알 수 없는 파일 id'), { status: 400 });
    const abs = resolveAbsPath(id, info.relPath);

    if (!fs.existsSync(abs)) {
      if (info.optional) {
        return { id, label: info.label, relPath: info.relPath, lang: info.lang,
                 exists: false, content: '', size: 0, mtime: null,
                 envPairs: id === 'env' ? [] : null };
      }
      throw Object.assign(new Error(`파일이 없습니다: ${info.relPath}`), { status: 404 });
    }

    // .env 는 인스톨러가 UTF-16LE 로 썼을 수도 있으므로 인코딩 자동 감지.
    // 그 외 JS 파일은 항상 UTF-8.
    const raw = (id === 'env') ? readWithBomDetect(abs) : fs.readFileSync(abs, 'utf8');
    const st = fs.statSync(abs);
    const out = {
      id, label: info.label, relPath: info.relPath, lang: info.lang,
      exists: true, content: raw, size: st.size, mtime: st.mtime.toISOString(),
    };
    // .env 는 절대경로와 인코딩을 응답에 명시 — 어느 파일을 편집 중인지 명확히
    if (id === 'env') {
      out.absPath = abs;
      out.loadedFiles = Array.isArray(loadedEnvFiles) ? [...loadedEnvFiles] : [];
      try {
        const buf = fs.readFileSync(abs);
        if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE)      out.encoding = 'UTF-16LE (BOM)';
        else if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) out.encoding = 'UTF-16BE (BOM)';
        else if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) out.encoding = 'UTF-8 (BOM)';
        else out.encoding = 'UTF-8';
      } catch { /* noop */ }
    }

    // .env 는 key/value 파싱해서 구조화된 목록도 제공
    if (id === 'env') {
      out.envPairs = raw.split(/\r?\n/).map((line) => {
        const p = parseEnvLine(line);
        if (!p) return null;
        return {
          key: p.key,
          value: (mask && SECRET_KEY_RE.test(p.key)) ? maskSecret(p.value) : p.value,
          isSecret: SECRET_KEY_RE.test(p.key),
        };
      }).filter(Boolean);

      if (mask) {
        // 원본 content 도 마스킹된 버전으로
        out.content = raw.split(/\r?\n/).map((line) => {
          const p = parseEnvLine(line);
          if (!p || !SECRET_KEY_RE.test(p.key)) return line;
          return `${p.key}=${maskSecret(p.value)}`;
        }).join('\n');
      }
    }
    return out;
  }

  /** 파일 내용 저장. 백업 파일 생성. JS 파일이면 간이 syntax 체크. */
  /**
   * ★ v1.12.0 — 작업 폴더(내가 만든 컨트롤러·서비스·SQL·시나리오가 저장되는 곳) 조회.
   *
   *  지금까지 이 값을 보거나 바꾸려면 `.env` 를 직접 편집해야 했다 — 어디에 저장되는지
   *  화면 어디에도 없었다. 설정 대화상자에서 보고 바꿀 수 있게 한다.
   */
  getWorkspace() {
    const raw = String(config.paths?.workspace || '').trim();
    const abs = raw ? path.resolve(projectRoot, raw) : null;
    const kinds = ['controllers', 'services', 'sql', 'scenarios'];
    const SUB = { controllers: 'controller', services: 'service', sql: 'sql', scenarios: 'scenarios' };
    const countIn = (dir, exts) => {
      try {
        return fs.readdirSync(dir, { withFileTypes: true })
          .filter((e) => e.isFile() && exts.some((x) => e.name.toLowerCase().endsWith(x)) && !e.name.startsWith('.')).length;
      } catch { return 0; }
    };
    const folders = kinds.map((kind) => {
      const dir = abs ? path.join(abs, SUB[kind]) : null;
      const exts = kind === 'sql' ? ['.sql'] : (kind === 'scenarios' ? ['.json'] : ['.js', '.mjs', '.ts']);
      return {
        kind, sub: SUB[kind],
        path: dir ? displayPath(dir) : null,
        exists: !!(dir && fs.existsSync(dir)),
        count: dir ? countIn(dir, exts) : 0,
      };
    });
    // 후보: 프로젝트 바로 아래의 폴더 중 controller/service/sql 을 가진 것 + 관례적인 이름
    const candidates = new Set(['workspace']);
    try {
      for (const e of fs.readdirSync(projectRoot, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name.startsWith('.') || ['node_modules', 'src', 'lib', 'log', 'data', 'docs', 'scripts', 'tests', 'public', 'admin-client', 'examples', 'mci-server'].includes(e.name)) continue;
        if (['controller', 'service', 'sql'].some((d) => fs.existsSync(path.join(projectRoot, e.name, d)))) candidates.add(e.name);
      }
    } catch { /* noop */ }
    if (raw) candidates.add(raw);
    return {
      configured: raw,                       // .env 의 APP_WORKSPACE 값 (비어 있으면 안 씀)
      enabled: !!raw,
      absolutePath: abs,
      exists: !!(abs && fs.existsSync(abs)),
      projectRoot,
      defaultDirs: { controllers: 'src/controller', services: 'src/service', sql: 'src/database/sql', scenarios: 'src/scenarios' },
      folders,
      candidates: [...candidates].sort(),
      envPath: resolveEnvPath(),
    };
  }

  /**
   * ★ v1.12.0 — 작업 폴더 변경. `.env` 의 APP_WORKSPACE 를 고치고 메모리 설정도 바꾼다.
   *   · 빈 값으로 두면 작업 폴더를 쓰지 않는다 (예전처럼 src/ 에 저장)
   *   · 프로젝트 밖 경로는 막는다 — 백업·배포 zip 에 안 담기고, 상대 경로 import 가 깨진다
   *   · create=true 면 폴더(controller/service/sql/scenarios)를 만들어 준다
   *   목록·저장은 바로 새 폴더를 쓰지만, **이미 로드된 라우트**는 서버를 다시 켜야 정리된다.
   */
  async setWorkspace({ dir, create = true } = {}) {
    const { relative: raw, absolute: abs } = resolveWorkspacePath(projectRoot, dir);
    if (raw) {
      if (!fs.existsSync(abs)) {
        if (!create) throw Object.assign(new Error('폴더가 없습니다. [폴더 만들기] 를 켜고 다시 시도하세요.'), { status: 400 });
        fs.mkdirSync(abs, { recursive: true });
      } else if (!fs.statSync(abs).isDirectory()) {
        throw Object.assign(new Error('같은 이름의 파일이 있습니다.'), { status: 400 });
      }
      if (create) for (const sub of ['controller', 'service', 'sql', 'scenarios']) fs.mkdirSync(path.join(abs, sub), { recursive: true });
    }
    // .env 의 APP_WORKSPACE 한 줄만 고친다 (다른 줄·주석은 그대로)
    const envPath = resolveEnvPath();
    let text = fs.existsSync(envPath) ? readWithBomDetect(envPath) : "";   // readWithBomDetect 는 문자열을 돌려준다
    const line = `APP_WORKSPACE=${raw}`;
    if (/^\s*APP_WORKSPACE\s*=.*$/m.test(text)) text = text.replace(/^\s*APP_WORKSPACE\s*=.*$/m, line);
    else text = (text.replace(/\s*$/, '') + `\n\n# ★ 작업 폴더 — 콘솔에서 만드는 컨트롤러·서비스·SQL 이 저장되는 곳 (설정 화면에서 바꿨습니다)\n${line}\n`);
    fs.writeFileSync(envPath, text, 'utf8');
    // 메모리 설정도 즉시 반영 — appPaths 가 매번 config 를 읽으므로 새 파일부터 새 폴더로 간다
    config.paths = config.paths || {};
    config.paths.workspace = raw;
    process.env.APP_WORKSPACE = raw;
    this.log.warn(`[config] workspace changed: "${raw || '(not used)'}" — routes already loaded stay until the server restarts`);
    return { ...this.getWorkspace(), restartRecommended: true };
  }

  /**
   * ★ v1.12.2 — 업무 테이블 스키마 조회. 테이블은 세 종류로 나뉜다:
   *   시스템(admin_* 등) · 예제(book·guestbook…) · **내 업무 표**.
   *   지금까지 내 업무 표는 시스템 표와 같은 스키마에 섞였다.
   */
  async getAppSchema() {
    const dbc = config.db || {};
    const supported = ['mariadb', 'mysql'].includes(String(dbc.type || '').toLowerCase());
    const current = String(dbc.appSchema || '').trim();
    const out = {
      supported,
      configured: current,
      effective: current || dbc.database,       // 실제로 SQL 이 향하는 곳
      connectionSchema: dbc.database,           // 시스템 표가 있는 곳
      sampleSchema: dbc.sampleSchemaSeparate === false ? null : (dbc.sampleSchema || 'sample'),
      envPath: resolveEnvPath(),
      schemas: [], tableCounts: {},
    };
    if (!supported) return out;
    try {
      const r = await db.execute(
        `SELECT s.SCHEMA_NAME AS name, (SELECT COUNT(*) FROM information_schema.TABLES t WHERE t.TABLE_SCHEMA = s.SCHEMA_NAME) AS tables
           FROM information_schema.SCHEMATA s
          WHERE s.SCHEMA_NAME NOT IN ('information_schema','mysql','performance_schema','sys')
          ORDER BY s.SCHEMA_NAME`, {});
      out.schemas = (r.rows || []).map((x) => ({ name: x.name, tables: Number(x.tables) }));
    } catch (e) { out.error = e.message; }
    return out;
  }

  /**
   * ★ v1.12.2 — 업무 테이블 스키마 변경. `.env` 의 DB_APP_SCHEMA 한 줄을 고치고 메모리 설정도 바꾼다.
   *   비우면 예전처럼 접속 스키마를 쓴다. create=true 면 스키마를 만들어 준다(권한이 있을 때).
   */
  async setAppSchema({ schema, create = false } = {}) {
    const raw = String(schema ?? '').trim();
    if (raw) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(raw)) {
        throw Object.assign(new Error('스키마 이름은 영문/숫자/밑줄만 쓰고 숫자로 시작할 수 없습니다.'), { status: 400 });
      }
      if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(raw.toLowerCase())) {
        throw Object.assign(new Error('시스템 스키마는 쓸 수 없습니다.'), { status: 400 });
      }
      const { rows } = await db.execute('SELECT SCHEMA_NAME AS n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = :n', { n: raw });
      if (!rows?.length) {
        if (!create) throw Object.assign(new Error(`스키마 ${raw} 가 없습니다. [스키마 만들기] 를 켜거나 DB 에서 먼저 만드세요.`), { status: 400 });
        try { await db.execute(`CREATE DATABASE \`${raw}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, {}); }
        catch (e) { throw Object.assign(new Error(`스키마를 만들지 못했습니다 (권한 확인): ${e.message}`), { status: 400 }); }
      }
    }
    const envPath = resolveEnvPath();
    let text = fs.existsSync(envPath) ? readWithBomDetect(envPath) : '';
    const line = `DB_APP_SCHEMA=${raw}`;
    if (/^\s*DB_APP_SCHEMA\s*=.*$/m.test(text)) text = text.replace(/^\s*DB_APP_SCHEMA\s*=.*$/m, line);
    else text = text.replace(/\s*$/, '') + `\n\n# ★ 업무 테이블 스키마 — 내가 만드는 표(snack 등)가 있는 곳. 비우면 접속 스키마를 씁니다 (설정 화면에서 바꿨습니다)\n${line}\n`;
    fs.writeFileSync(envPath, text, 'utf8');
    config.db = config.db || {};
    config.db.appSchema = raw;
    process.env.DB_APP_SCHEMA = raw;
    this.log.warn(`[config] app schema changed: "${raw || '(connection schema)'}"`);
    return { ...(await this.getAppSchema()), changed: true };
  }

  /** ★ v1.13.3 — 콘솔에 EAI(전문 연동) 메뉴를 보일지 */
  getEaiFlag() {
    return {
      enabled: !!config.mci?.generatorEnabled,
      envKey: 'EAI_ENABLED',
      legacyKey: 'MCI_GENERATOR_ENABLED',
      envPath: resolveEnvPath(),
      noteKey: 'set_eaiHint',
    };
  }

  /** 켜고 끄기 — .env 한 줄을 고치고 메모리 설정도 바꾼다 (메뉴는 다시 로그인/새로고침하면 반영) */
  async setEaiFlag({ enabled } = {}) {
    const on = enabled === true || enabled === 'true' || enabled === 1 || enabled === '1';
    if (on && config.edition === 'public') throw Object.assign(new Error('Enterprise integration is not included in this edition'), { status: 403 });
    const envPath = resolveEnvPath();
    let text = fs.existsSync(envPath) ? readWithBomDetect(envPath) : '';
    const line = `EAI_ENABLED=${on}`;
    if (/^\s*EAI_ENABLED\s*=.*$/m.test(text)) text = text.replace(/^\s*EAI_ENABLED\s*=.*$/m, line);
    else text = text.replace(/\s*$/, '') + `\n\n# ★ EAI(전문 연동) 메뉴 표시 — 콘솔 [설정] 에서 바꿨습니다\n${line}\n`;
    // 옛 이름이 남아 있으면 같이 맞춘다 (둘이 어긋나면 새 이름이 이긴다)
    if (/^\s*MCI_GENERATOR_ENABLED\s*=.*$/m.test(text)) {
      text = text.replace(/^\s*MCI_GENERATOR_ENABLED\s*=.*$/m, `MCI_GENERATOR_ENABLED=${on}`);
    }
    fs.writeFileSync(envPath, text, 'utf8');
    config.mci = config.mci || {};
    config.mci.generatorEnabled = on;
    process.env.EAI_ENABLED = String(on);
    this.log.warn(`[config] EAI menu ${on ? 'on' : 'off'}`);
    return this.getEaiFlag();
  }

  /** ★ v1.14.1 — 이중화 설정 조회 (콘솔 [이중화] 화면) */
  getHaConfig() {
    const c = config.ha || {};
    const mode = String(c.mode || (c.enabled ? 'active-standby' : 'standalone')).toLowerCase();
    return {
      /** 운영 모드 — 기본은 standalone(한 대) */
      mode,
      modes: [
        { value: 'standalone', labelKey: 'ha.modeStandalone' },
        { value: 'active-standby', labelKey: 'ha.modeActiveStandby' },
      ],
      enabled: mode !== 'standalone',
      nodeId: c.nodeId || '',
      preferred: !!c.preferred,
      peerUrl: c.peerUrl || '',
      anchors: Array.isArray(c.anchors) ? c.anchors : [],
      witness: { mode: c.witness?.mode || 'none', url: c.witness?.url || '', path: c.witness?.path || '' },
      roleHook: c.roleHook || '',
      timings: { ...(c.timings || {}) },
      envPath: resolveEnvPath(),
      noteKey: 'ha_restartHint',
    };
  }

  /**
   * ★ v1.14.1 — 이중화 설정 변경. `.env` 의 HA_* 줄만 고친다.
   *   ⚠ 시간 값 검증을 여기서 한다. takeover 가 demote 의 2배 미만이면 **거부** —
   *     옛 액티브가 스스로 멈추기 전에 인수하면 양쪽이 동시에 쓰게 된다(스플릿브레인).
   */
  async setHaConfig(input = {}) {
    if (config.edition === 'public') throw Object.assign(new Error('High availability is not included in this edition'), { status: 403 });
    const t = { ...(config.ha?.timings || {}), ...(input.timings || {}) };
    const demote = Number(t.demoteMs) || 5000;
    const takeover = Number(t.takeoverMs) || 15000;
    const tick = Number(t.tickMs) || 1000;
    if (takeover < demote * 2) {
      throw Object.assign(new Error(
        `인수 대기(${takeover}ms)는 자기 차단(${demote}ms)의 2배 이상이어야 합니다. `
        + '그렇지 않으면 옛 액티브가 멈추기 전에 인수해 양쪽이 동시에 쓰게 됩니다.'), { status: 400 });
    }
    if (tick > demote / 2) {
      throw Object.assign(new Error(`관측 주기(${tick}ms)가 너무 큽니다 — 자기 차단(${demote}ms) 안에 판단하지 못합니다.`), { status: 400 });
    }
    const wMode = input.mode === 'standalone' ? 'none' : String(input.witness?.mode || 'none').toLowerCase();
    if (!['none', 'http'].includes(wMode)) throw Object.assign(new Error('witness 방식은 none(수동 전환) 또는 http입니다. 기존 파일 잠금은 HTTP witness로 전환하세요.'), { status: 400 });
    if (wMode === 'http' && !String(input.witness?.url || '').trim()) throw Object.assign(new Error('witness 주소가 필요합니다.'), { status: 400 });

    const mode = String(input.mode || (input.enabled ? 'active-standby' : 'standalone')).toLowerCase();
    if (!['standalone', 'active-standby'].includes(mode)) {
      throw Object.assign(new Error('운영 모드는 standalone 또는 active-standby 입니다.'), { status: 400 });
    }
    if (mode === 'active-standby') {
      if (!String(input.nodeId || '').trim()) throw Object.assign(new Error('이 서버 이름이 필요합니다 (양쪽이 달라야 합니다).'), { status: 400 });
      if (!String(input.peerUrl || '').trim()) throw Object.assign(new Error('상대 서버 주소가 필요합니다.'), { status: 400 });
    }
    const pairs = {
      HA_MODE: mode,
      // 옛 이름도 같이 맞춰 둔다 — 예전 설정을 읽는 곳이 있어도 어긋나지 않게
      HA_ENABLED: mode === 'standalone' ? 'false' : 'true',
      HA_NODE_ID: String(input.nodeId || '').trim(),
      HA_PREFERRED: input.preferred ? 'true' : 'false',
      HA_PEER_URL: String(input.peerUrl || '').trim(),
      HA_ANCHORS: (Array.isArray(input.anchors) ? input.anchors : String(input.anchors || '').split(','))
        .map((x) => String(x).trim()).filter(Boolean).join(','),
      HA_WITNESS_MODE: wMode,
      HA_WITNESS_URL: String(input.witness?.url || '').trim(),
      HA_WITNESS_PATH: String(input.witness?.path || '').trim(),
      HA_ROLE_HOOK: String(input.roleHook || '').trim(),
      HA_TICK_MS: String(tick),
      HA_DEMOTE_MS: String(demote),
      HA_TAKEOVER_MS: String(takeover),
      HA_MIN_HOLD_MS: String(Number(t.minHoldMs) || 300000),
      HA_MAX_LAG_SEC: String(Number(t.maxReplicaLagSec) || 30),
    };
    const envPath = resolveEnvPath();
    let text = fs.existsSync(envPath) ? readWithBomDetect(envPath) : '';
    for (const [k, v] of Object.entries(pairs)) {
      const line = `${k}=${v}`;
      const re = new RegExp(`^\\s*${k}\\s*=.*$`, 'm');
      if (re.test(text)) text = text.replace(re, line);
      else text = text.replace(/\s*$/, '') + `\n${line}\n`;
    }
    fs.writeFileSync(envPath, text, 'utf8');
    this.log.warn(`[config] HA settings changed — mode=${mode} node=${pairs.HA_NODE_ID} witness=${pairs.HA_WITNESS_MODE}`);
    return { ...this.getHaConfig(), saved: pairs, restartRequired: true };
  }

  /**
   * ★ v1.26.0 — 엔터프라이즈 기능 켜기/끄기.
   *
   *  백업/복원 · DB 컬럼 암호화 · 이중화 메뉴는 기본으로 감춰져 있다(v1.25.0).
   *  예전에는 `.env` 를 손으로 고쳐야 켤 수 있었는데, 그러려면 서버 파일에 접근해야 한다.
   *  콘솔에서 켤 수 있게 한다 — 이중화 설정과 똑같이 `.env` 에 쓰고 재기동하면 적용된다.
   *
   *  ⚠ 이것은 **메뉴를 보이고 감추는 것**이지 보안 경계가 아니다.
   *    (주소를 직접 치면 화면은 열린다. 실제 권한은 서버의 @Roles 가 지킨다)
   */
  getFeatures() {
    return {
      backup: !!config.features?.backup,
      secureColumns: !!config.features?.secureColumns,
      ha: !!config.features?.ha,
    };
  }

  async setFeatures(input = {}) {
    if (config.edition === 'public') throw Object.assign(new Error('Enterprise features are not included in this edition'), { status: 403 });
    const cur = this.getFeatures();
    const next = {
      backup: input.backup === undefined ? cur.backup : !!input.backup,
      secureColumns: input.secureColumns === undefined ? cur.secureColumns : !!input.secureColumns,
      ha: input.ha === undefined ? cur.ha : !!input.ha,
    };
    const pairs = {
      FEATURE_BACKUP: next.backup ? 'true' : 'false',
      FEATURE_SECURE_COLUMNS: next.secureColumns ? 'true' : 'false',
      FEATURE_HA: next.ha ? 'true' : 'false',
    };
    this._writeEnvPairs(pairs);
    this.log.warn(`[config] feature settings changed — backup=${next.backup} secureColumns=${next.secureColumns} ha=${next.ha}`);
    return { ...next, saved: pairs, restartRequired: true };
  }

  /** .env 에 key=value 들을 넣거나 고친다 (없으면 끝에 붙인다) */
  _writeEnvPairs(pairs) {
    const envPath = resolveEnvPath();
    let text = fs.existsSync(envPath) ? readWithBomDetect(envPath) : '';
    for (const [k, v] of Object.entries(pairs)) {
      const line = `${k}=${v}`;
      const re = new RegExp(`^\\s*${k}\\s*=.*$`, 'm');
      if (re.test(text)) text = text.replace(re, line);
      else text = text.replace(/\s*$/, '') + `\n${line}\n`;
    }
    fs.writeFileSync(envPath, text, 'utf8');
  }

  async writeFile({ id, content } = {}) {
    const info = FILE_MAP[id];
    if (!info) throw Object.assign(new Error('알 수 없는 파일 id'), { status: 400 });
    if (typeof content !== 'string') {
      throw Object.assign(new Error('content 는 string 이어야 합니다.'), { status: 400 });
    }
    // 파일 사이즈 상한 (1MB) — 설정 파일은 이 이상일 일이 없음
    if (content.length > 1024 * 1024) {
      throw Object.assign(new Error('내용이 너무 큽니다 (최대 1MB).'), { status: 400 });
    }

    const abs = resolveAbsPath(id, info.relPath);

    // JS 파일이면 syntax 체크
    if (info.lang === 'javascript') {
      try {
        // Function 생성자로 파싱 시도 (ES 모듈 import 구문은 Function 생성자 안 됨)
        // 대신 vm.Script + {parsingContext} 사용 — 실행은 안 함
        const vm = await import('node:vm');
        new vm.Script(content, { filename: info.relPath });
      } catch (e) {
        throw Object.assign(new Error(`Syntax 오류: ${e.message}`), { status: 400 });
      }
    }

    // 기존 파일이 있으면 백업
    let backupPath = null;
    if (fs.existsSync(abs)) {
      backupPath = `${abs}.bak-${stampSuffix()}`;
      try { fs.copyFileSync(abs, backupPath); }
      catch (e) { this.log.warn(`[config] backup failed (ignored): ${e.message}`); backupPath = null; }
    }

    // 부모 디렉토리 보장
    const parent = path.dirname(abs);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

    await safeWriteFile(abs, content);
    this.log.info(`[config] saved: ${info.relPath} (${content.length} bytes)${backupPath ? ' + backup' : ''}`);

    return {
      id, relPath: info.relPath,
      savedBytes: content.length,
      backup: backupPath ? path.basename(backupPath) : null,
      requiresRestart: info.requiresRestart,
    };
  }
}
