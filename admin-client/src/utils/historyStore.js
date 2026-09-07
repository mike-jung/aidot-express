/**
 * API 호출 히스토리 — localStorage 저장.
 *
 *  키 형식:
 *    'history::__index'  — 전체 호출 메타 목록 (최신순)
 *    'history::<id>'     — 단건 상세 (request body 포함, 큰 사이즈 가능)
 *
 *  자동 정리: 즐겨찾기 X 항목은 최신 100개까지만 유지.
 */

const INDEX_KEY = 'history::__index';
const MAX_NON_FAVORITE = 100;

function genId() {
  return 'call_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function readIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); }
  catch { return []; }
}
function writeIndex(arr) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(arr));
}

/** 메타 목록 (최신순). 즐겨찾기는 따로 정렬 안함 */
export function listHistory() {
  return readIndex().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/** 단건 상세 조회 (request body / response body 등 포함) */
export function getHistoryItem(id) {
  try {
    const raw = localStorage.getItem(`history::${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * 호출 기록 저장.
 *  call: { method, fullPath, pathParams, queryParams, headers, body,
 *          status, statusText, timeMs, responseBody, finalUrl }
 */
export function saveHistoryItem(call) {
  const id = genId();
  const timestamp = Date.now();
  const meta = {
    id,
    timestamp,
    method: call.method,
    fullPath: call.fullPath,
    finalUrl: call.finalUrl,
    status: call.status ?? null,
    timeMs: call.timeMs ?? null,
    isFavorite: false,
    label: null,
  };
  const detail = { ...call, ...meta };

  // 메타는 인덱스에, 상세는 별도 키에
  const idx = readIndex();
  idx.unshift(meta);

  // 비즐겨찾기 항목이 100개 초과면 가장 오래된 것 정리
  const nonFavCount = idx.filter((x) => !x.isFavorite).length;
  if (nonFavCount > MAX_NON_FAVORITE) {
    const toRemove = nonFavCount - MAX_NON_FAVORITE;
    const removed = [];
    // 끝에서부터(가장 오래된) 비즐겨찾기 항목 제거
    for (let i = idx.length - 1; i >= 0 && removed.length < toRemove; i--) {
      if (!idx[i].isFavorite) {
        removed.push(idx[i].id);
        idx.splice(i, 1);
      }
    }
    for (const rid of removed) {
      try { localStorage.removeItem(`history::${rid}`); } catch {}
    }
  }

  writeIndex(idx);
  // responseBody 가 너무 크면 잘라서 저장 (크롬 localStorage 5MB 제한 대비)
  const safeDetail = { ...detail };
  if (safeDetail.responseBody && safeDetail.responseBody.length > 100_000) {
    safeDetail.responseBody = safeDetail.responseBody.slice(0, 100_000) + '\n\n... (truncated)';
  }
  try {
    localStorage.setItem(`history::${id}`, JSON.stringify(safeDetail));
  } catch (e) {
    // QuotaExceeded 같은 경우 메타만 두고 상세는 못 저장
    console.warn('[history] 상세 저장 실패:', e.message);
  }
  return id;
}

/** 즐겨찾기 토글 */
export function toggleFavorite(id) {
  const idx = readIndex();
  const item = idx.find((x) => x.id === id);
  if (!item) return false;
  item.isFavorite = !item.isFavorite;
  writeIndex(idx);
  // detail 에도 반영
  try {
    const detail = getHistoryItem(id);
    if (detail) {
      detail.isFavorite = item.isFavorite;
      localStorage.setItem(`history::${id}`, JSON.stringify(detail));
    }
  } catch {}
  return item.isFavorite;
}

/** 라벨 설정 (즐겨찾기에 이름 붙이기) */
export function setLabel(id, label) {
  const idx = readIndex();
  const item = idx.find((x) => x.id === id);
  if (!item) return;
  item.label = label || null;
  writeIndex(idx);
  try {
    const detail = getHistoryItem(id);
    if (detail) {
      detail.label = item.label;
      localStorage.setItem(`history::${id}`, JSON.stringify(detail));
    }
  } catch {}
}

/** 단건 삭제 */
export function deleteHistoryItem(id) {
  const idx = readIndex().filter((x) => x.id !== id);
  writeIndex(idx);
  try { localStorage.removeItem(`history::${id}`); } catch {}
}

/** 전체 비우기 (즐겨찾기 보존 옵션) */
export function clearHistory({ keepFavorites = true } = {}) {
  const idx = readIndex();
  const toRemove = keepFavorites ? idx.filter((x) => !x.isFavorite) : idx;
  for (const item of toRemove) {
    try { localStorage.removeItem(`history::${item.id}`); } catch {}
  }
  writeIndex(keepFavorites ? idx.filter((x) => x.isFavorite) : []);
}
