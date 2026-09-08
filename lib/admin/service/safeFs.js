/**
 * safeFs — Windows EPERM/EBUSY 대응 비동기 파일 I/O.
 *
 *  전략:
 *   1) 임시 파일 쓰기 → rename (atomic)
 *   2) 실패 시 원본 삭제 후 rename 재시도
 *   3) 최종 fallback: 직접 writeFile (async)
 *   모든 재시도 사이에 실제 비동기 delay (이벤트 루프 양보) → Node 내부 핸들 해제 기회 부여.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 300;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(e) {
  return e && (e.code === 'EPERM' || e.code === 'EBUSY' || e.code === 'EACCES');
}

/**
 * 안전한 파일 쓰기 (비동기).
 *  여러 전략을 순차 시도하며, 각 시도 사이에 이벤트 루프를 양보합니다.
 */
export async function safeWriteFile(filePath, content, encoding = 'utf8') {
  const dir = path.dirname(filePath);
  const tmpPath = path.join(dir, `.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const contentArg = typeof content === 'string' ? content : content;
  const writeOpts = typeof content === 'string' ? { encoding } : {};

  // 전략 1: 임시 파일 → rename
  try {
    await fsp.writeFile(tmpPath, contentArg, writeOpts);
    try {
      await fsp.rename(tmpPath, filePath);
      return;  // 성공!
    } catch (renameErr) {
      // rename 실패 — 원본이 잠겨있을 수 있음
      // 전략 2: 원본 삭제 시도 후 rename
      if (isRetryable(renameErr)) {
        for (let i = 0; i < MAX_RETRIES; i++) {
          await delay(RETRY_DELAY_MS);
          try {
            // 원본 삭제 시도 (실패해도 OK)
            try { await fsp.unlink(filePath); } catch { /* ignore */ }
            await fsp.rename(tmpPath, filePath);
            return;  // 성공!
          } catch (e) {
            if (!isRetryable(e) || i === MAX_RETRIES - 1) break;
          }
        }
      }
      // tmp 파일 정리
      try { await fsp.unlink(tmpPath); } catch { /* ignore */ }
    }
  } catch (tmpWriteErr) {
    // 임시 파일 쓰기도 실패 (디스크 꽉 찬 경우 등)
    try { await fsp.unlink(tmpPath); } catch { /* ignore */ }
  }

  // 전략 3: 직접 쓰기 (재시도)
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await fsp.writeFile(filePath, contentArg, writeOpts);
      return;  // 성공!
    } catch (e) {
      if (isRetryable(e) && i < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (i + 1));  // 점진적 대기
        continue;
      }
      throw e;  // 최종 실패
    }
  }
}

/**
 * 안전한 파일 삭제 (비동기).
 */
export async function safeUnlink(filePath) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await fsp.unlink(filePath);
      return;
    } catch (e) {
      if (e.code === 'ENOENT') return;  // 이미 없음 — OK
      if (isRetryable(e) && i < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (i + 1));
        continue;
      }
      throw e;
    }
  }
}
