///
/// GuestbookService — 방명록 샘플 서비스
///
///   설치 직후 바로 동작하는 기본 예제입니다.
///   따라하기 ③ 에서 학습자가 직접 만드는 SnackService / SupplyService 와 이름이 겹치지 않도록
///   전혀 다른 주제(방명록)로 제공합니다.
///
///   특징: 글이 추가·수정·삭제되면 SSE 채널 'guestbook' 으로 알려 줍니다.
///        → 열려 있는 모든 화면의 목록이 새로고침 없이 갱신됩니다.
///
import { Service, Sql, Log } from '../core/decorators.js';
import db from '../database/db.js';
import sseHub from '../core/sse.js';

export const GUESTBOOK_CHANNEL = 'guestbook';

@Service('GuestbookService')
export default class GuestbookService {

  @Sql('guestbook') guestbookSql;

  @Log log;

  /** 전체 목록 (최신 글이 위로) */
  async list() {
    const sql = this.guestbookSql.get('findAll');
    const res = await db.execute(sql, {});
    return res.rows;
  }

  /** 한 건 조회 */
  async getById(id) {
    const sql = this.guestbookSql.get('findById');
    const res = await db.execute(sql, { id });
    return res.rows[0] ?? null;
  }

  /** 글 남기기 */
  async create({ writer, message }) {
    const sql = this.guestbookSql.get('insert');
    const res = await db.execute(sql, { writer, message });
    this.log.info(`GuestbookService::create -> id=${res.insertId} writer=${writer}`);
    this._notify('created', { id: res.insertId, writer, message });
    return { insertId: res.insertId, rowsAffected: res.rowsAffected };
  }

  /** 글 고치기 */
  async update(id, { writer, message }) {
    const sql = this.guestbookSql.get('updateName');
    const res = await db.execute(sql, { id, writer, message });
    this._notify('updated', { id: Number(id), writer, message });
    return { rowsAffected: res.rowsAffected };
  }

  /** 글 지우기 */
  async remove(id) {
    const sql = this.guestbookSql.get('deleteById');
    const res = await db.execute(sql, { id });
    this._notify('removed', { id: Number(id) });
    return { rowsAffected: res.rowsAffected };
  }

  /**
   * SSE 알림 — 실패해도 본래 작업(저장/삭제)에는 영향을 주지 않는다.
   *   구독: GET /api/events/stream?channel=guestbook
   */
  _notify(action, payload) {
    try {
      sseHub.publish(GUESTBOOK_CHANNEL, { action, ...payload, ts: new Date().toISOString() }, { event: 'guestbook' });
    } catch (e) {
      this.log.warn(`[guestbook] SSE 알림 실패(무시): ${e.message}`);
    }
  }
}
