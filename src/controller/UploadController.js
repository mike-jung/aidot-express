import { Controller, PostMapping, GetMapping, Roles } from '../core/decorators.js';
import logger from '../util/logger.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 파일 업로드 예제. (v1.10.29)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  이 프레임워크가 파일을 받는 방식
 * ══════════════════════════════════════════════════════════════════════════
 *  보통의 Node 서버는 `multipart/form-data` 를 multer 같은 미들웨어로 받습니다.
 *  aidot-express 는 **그러지 않습니다.** 대신 브라우저에서 파일을 base64 로
 *  바꿔 **평범한 JSON 으로** 보냅니다.
 *
 *      브라우저            FileReader.readAsDataURL(file)
 *                              ↓  'data:...;base64,XXXX'
 *      POST (JSON)         { fileName, fileBase64 }
 *                              ↓
 *      서버                Buffer.from(fileBase64, 'base64')
 *
 *  왜 이렇게 하는가:
 *   · 컨트롤러가 **평소와 똑같이** `params` 하나만 받으면 됩니다.
 *     multipart 를 쓰면 이 컨트롤러만 미들웨어가 다르게 붙어야 합니다.
 *   · MCI 인터페이스 정의서(엑셀)와 백업 복원(zip)이 이미 이 방식입니다 —
 *     새 방식을 하나 더 만들면 배우는 사람이 두 가지를 알아야 합니다.
 *
 *  ⚠ **크기 한계가 있습니다.** 요청 본문 상한이 10MB(`BODY_LIMIT`)이고
 *    base64 는 원본보다 약 33% 커집니다. 따라서 **실제 파일은 약 7.5MB 까지**
 *    입니다. 더 큰 파일이 필요하면 `.env` 의 `BODY_LIMIT` 을 올리세요.
 */
/* ══════════════════════════════════════════════════════════════════
 *  멀티파트 파서 (의존성 없이)
 *
 *  express 의 json 파서는 multipart 본문을 건드리지 않고 흘려보내므로,
 *  여기서 원시 바이트를 직접 읽어 경계(boundary)로 자른다.
 *  파일 한두 개를 받는 용도라 통째로 메모리에 올린다 — 상한은 아래 MAX 로 막는다.
 * ══════════════════════════════════════════════════════════════════ */

const MULTIPART_MAX = Number(process.env.UPLOAD_MAX_BYTES) || 20 * 1024 * 1024;   // 20MB

/** 요청 본문을 Buffer 로 모은다 (상한을 넘으면 즉시 끊는다) */
function readRawBody(req) {
  if (Buffer.isBuffer(req.body) && req.body.length) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MULTIPART_MAX) {
        reject(Object.assign(new Error(`파일이 너무 큽니다 (상한 ${Math.floor(MULTIPART_MAX / 1024 / 1024)}MB)`), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * multipart 본문에서 **파일 파트만** 뽑는다.
 * @returns {{ field:string, filename:string, data:Buffer }[]}
 */
function parseMultipart(body, boundary) {
  const sep = Buffer.from(`--${boundary}`);
  const out = [];
  let pos = body.indexOf(sep);
  if (pos < 0) return out;
  pos += sep.length;

  while (pos < body.length) {
    if (body[pos] === 0x2d && body[pos + 1] === 0x2d) break;          // '--' → 마지막 경계
    if (body[pos] === 0x0d) pos += 2;                                  // CRLF 건너뛰기

    const headEnd = body.indexOf('\r\n\r\n', pos, 'utf8');
    if (headEnd < 0) break;
    const head = body.slice(pos, headEnd).toString('utf8');

    let next = body.indexOf(sep, headEnd);
    if (next < 0) next = body.length;
    /* 값 끝의 CRLF 는 경계의 일부이므로 뺀다 */
    const data = body.slice(headEnd + 4, Math.max(headEnd + 4, next - 2));

    const nameM = /name="([^"]*)"/i.exec(head);
    const fileM = /filename\*?=(?:UTF-8'')?"?([^";\r\n]+)"?/i.exec(head);
    if (fileM && fileM[1]) {
      let fn = fileM[1];
      try { fn = decodeURIComponent(fn); } catch { /* 그대로 쓴다 */ }
      out.push({ field: nameM ? nameM[1] : 'file', filename: fn, data });
    }
    pos = next + sep.length;
  }
  return out;
}

@Controller('/api/uploads')
export default class UploadController {
  constructor() {
    this.log = logger;
    /* 업로드 저장 위치. 프로젝트 밖으로 나가지 못하게 절대 경로로 고정합니다. */
    this.dir = path.resolve(process.cwd(), 'public', 'uploads');
  }

  /**
   * POST /api/uploads
   * body: { fileName: 'photo.png', fileBase64: 'iVBORw0...' }
   */
  @PostMapping('/')
  @Roles('admin')
  async upload(params) {
    const { fileName, fileBase64 } = params || {};

    if (!fileName || typeof fileName !== 'string') {
      throw Object.assign(new Error('fileName 이 필요합니다'), { status: 400 });
    }
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      throw Object.assign(new Error('fileBase64 가 필요합니다'), { status: 400 });
    }

    /* ⚠ 파일 이름을 그대로 믿으면 안 됩니다.
       `../../etc/passwd` 같은 이름이 오면 프로젝트 밖에 씁니다.
       basename 으로 경로를 떼고, 남은 글자도 안전한 것만 남깁니다. */
    const safeName = path.basename(fileName).replace(/[^\w.\-가-힣 ]/g, '_');
    if (!safeName || safeName.startsWith('.')) {
      throw Object.assign(new Error('사용할 수 없는 파일 이름입니다'), { status: 400 });
    }

    let buffer;
    try {
      // 'data:image/png;base64,XXXX' 형태로 와도 받아들입니다
      const raw = fileBase64.includes(',') ? fileBase64.split(',').pop() : fileBase64;
      buffer = Buffer.from(raw, 'base64');
    } catch (e) {
      throw Object.assign(new Error(`base64 디코딩 실패: ${e.message}`), { status: 400 });
    }
    if (!buffer.length) {
      throw Object.assign(new Error('빈 파일입니다'), { status: 400 });
    }

    const { saved } = this._save(safeName, buffer);

    return {
      data: {
        fileName: saved,
        size: buffer.length,
        url: `/uploads/${encodeURIComponent(saved)}`,
      },
    };
  }

  /** GET /api/uploads — 올라온 파일 목록 */
  /* ══════════════════════════════════════════════════════════════
   *  ★ v1.27.0 — 멀티파트(multipart/form-data) 업로드
   *
   *  기존 방식(파일을 base64 글자로 바꿔 JSON 으로 보내기)은 그대로 둡니다.
   *  다만 두 가지가 아쉬웠습니다.
   *    · base64 는 원본보다 **약 33% 커집니다** — 본문 상한(10MB)에 더 빨리 닿습니다
   *    · 브라우저 <form>, curl -F, 다른 시스템은 대개 멀티파트로 보냅니다
   *  그래서 같은 저장 규칙(이름 걸러내기 · 덮어쓰지 않기)을 쓰는 길을 하나 더 엽니다.
   *
   *  의존성을 늘리지 않으려고 파서를 직접 씁니다 — 업로드 하나에 multer 를 들이는 것보다
   *  가볍고, 이 서버가 받는 형태(파일 한두 개)에는 충분합니다.
   * ══════════════════════════════════════════════════════════════ */

  /** 이름을 안전하게 만들고, 겹치면 -2 -3 을 붙여 저장한다 (두 방식이 함께 쓴다) */
  _save(safeName, buffer) {
    fs.mkdirSync(this.dir, { recursive: true });
    let target = path.join(this.dir, safeName);
    if (fs.existsSync(target)) {
      const ext = path.extname(safeName);
      const base = safeName.slice(0, safeName.length - ext.length);
      let n = 1;
      while (fs.existsSync(target)) target = path.join(this.dir, `${base}-${++n}${ext}`);
    }
    fs.writeFileSync(target, buffer);
    const saved = path.basename(target);
    this.log.info(`[upload] ${saved} (${buffer.length} bytes)`);
    return { saved, size: buffer.length };
  }

  /** 파일 이름을 그대로 믿지 않는다 — 경로를 떼고 안전한 글자만 남긴다 */
  _safeName(name) {
    const safe = path.basename(String(name || '')).replace(/[^\w.\-가-힣 ]/g, '_');
    if (!safe || safe.startsWith('.')) {
      throw Object.assign(new Error('사용할 수 없는 파일 이름입니다'), { status: 400 });
    }
    return safe;
  }

  /**
   * POST /api/uploads/multipart   (Content-Type: multipart/form-data)
   *   curl -F "file=@간식.png" -H "Authorization: Bearer <토큰>" .../api/uploads/multipart
   */
  @PostMapping('/multipart')
  @Roles('admin')
  async uploadMultipart(params, req) {
    const ctype = String(req.headers['content-type'] || '');
    if (!ctype.startsWith('multipart/form-data')) {
      throw Object.assign(new Error('multipart/form-data 로 보내 주세요'), { status: 400 });
    }
    const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype);
    if (!m) throw Object.assign(new Error('boundary 를 찾을 수 없습니다'), { status: 400 });
    const boundary = (m[1] || m[2]).trim();

    const body = await readRawBody(req);
    const files = parseMultipart(body, boundary);
    if (!files.length) throw Object.assign(new Error('파일이 없습니다'), { status: 400 });

    const out = files.map((f) => {
      const { saved, size } = this._save(this._safeName(f.filename), f.data);
      return { fileName: saved, size, url: `/uploads/${encodeURIComponent(saved)}` };
    });
    /* 하나만 올렸으면 base64 방식과 같은 모양으로 돌려준다 (쓰는 쪽이 헷갈리지 않게) */
    return { data: out.length === 1 ? out[0] : { files: out } };
  }

  @GetMapping('/')
  @Roles('admin')
  async list() {
    if (!fs.existsSync(this.dir)) return { data: [] };
    const rows = fs.readdirSync(this.dir)
      .filter((f) => !f.startsWith('.'))
      .map((f) => {
        const st = fs.statSync(path.join(this.dir, f));
        return {
          fileName: f,
          size: st.size,
          uploadedAt: st.mtime.toISOString(),
          url: `/uploads/${encodeURIComponent(f)}`,
        };
      })
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    return { data: rows };
  }
}
