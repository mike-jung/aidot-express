///
/// 체중 기록·목표 관련 서비스 : src/service/WeightService.js
///
/// 원본(구 구조): controllers/wt_controller.js + database/wt_sql.js 의 로직을
///   aidot-express 의 @Service / @Sql / @Log / db.execute 방식으로 재구성.
///
/// MariaDB 는 `:name` 바인딩을 네이티브 지원하므로 별도 bindParams 변환 없이
///   원본 SQL 과 params 객체를 그대로 전달함.
///

import { Service, Sql, Log } from '../core/decorators.js';
import db from '../database/db.js';


@Service('WeightService')
export default class WeightService {

  // SqlFile 객체 주입 — 'weight' = src/database/sql/weight.sql
  @Sql('weight') weightSql;

  // 로그 주입
  @Log log;


  /* ═══════════════════ records ═══════════════════ */

  /**
   * 체중 기록 전체 조회.
   *  원본: wt_controller.getRecords → wt_records_select_all
   */
  async list() {
    this.log.info(`WeightService::list 호출됨`);

    const sql = this.weightSql.get('findAll');
    const res = await db.execute(sql, {});
    return res.rows;
  }

  /**
   * 체중 기록 페이지네이션 조회.
   *  aidot-express 의 db.executeList 공용 패턴을 사용.
   *   - base SQL (findAll) 에 자동으로 LIMIT/OFFSET 을 붙이고 총 개수를 COUNT 로 구함.
   *   - MariaDB / SQLite / Oracle 모두 지원.
   *
   *  반환:
   *    {
   *      rows: [...],
   *      header: { total, page, perPage, totalPages }
   *    }
   */
  async listPaged(opts = {}) {
    this.log.info(`WeightService::listPaged 호출됨 -> page=${opts.page} perPage=${opts.perPage}`);

    const sql = this.weightSql.get('findAll');
    return await db.executeList(sql, {}, {
      page:    opts.page,
      perPage: opts.perPage,
      // 최대 perPage 상한 — 한 번에 500 건 이상 못 가져오도록 방어
      maxPerPage: 500,
    });
  }

  /**
   * 체중 기록 단건 조회.
   */
  async getById(id) {
    this.log.debug(`WeightService::getById 호출됨 -> id=${id}`);

    const sql = this.weightSql.get('findById');
    const res = await db.execute(sql, { id });
    return res.rows[0] ?? null;
  }

  /**
   * 특정 날짜의 기록 조회. 같은 날짜 중복 체크에 사용 (UX 규칙: 하루 1건).
   */
  async getByDate(date) {
    this.log.debug(`WeightService::getByDate 호출됨 -> date=${date}`);

    const sql = this.weightSql.get('findByDate');
    const res = await db.execute(sql, { date });
    return res.rows[0] ?? null;
  }

  /**
   * 체중 기록 추가.
   *  원본: wt_controller.addRecord → wt_records_insert
   *  반환: { insertId, rowsAffected }
   *
   *  주의: 원본 테이블 DDL 의 id 가 AUTO_INCREMENT 가 아니므로 SQL 쪽에서 MAX(id)+1
   *  로 채움 → res.insertId 는 보장되지 않을 수 있음. 안정적으로 새로 삽입된 id 를
   *  반환하려면 같은 date 로 재조회 후 가장 최근 id 를 돌려준다.
   */
  async create(input) {
    this.log.info(`WeightService::create 호출됨 -> date=${input.date} weight=${input.weight}`);

    if (!input.date)   throw new Error('date 는 필수 입력값입니다.');
    if (input.weight == null || isNaN(Number(input.weight))) {
      throw new Error('weight 는 숫자여야 합니다.');
    }

    const sql = this.weightSql.get('insert');
    const res = await db.execute(sql, {
      date:   input.date,
      weight: Number(input.weight),
      memo:   input.memo ?? '',
    });

    // insertId 확보 — DB 가 반환해주면 그대로, 아니면 재조회로 fallback.
    let insertId = res.insertId;
    if (!insertId) {
      const row = await this.getByDate(input.date);
      insertId = row?.id ?? null;
    }
    return { insertId, rowsAffected: res.rowsAffected };
  }

  /**
   * 체중 기록 수정.
   *  원본: wt_controller.updateRecord → wt_records_update
   */
  async update(id, input) {
    this.log.info(`WeightService::update 호출됨 -> id=${id}`);

    if (!id) throw new Error('id 는 필수 입력값입니다.');

    const sql = this.weightSql.get('updateById');
    const res = await db.execute(sql, {
      id:     Number(id),
      date:   input.date,
      weight: Number(input.weight),
      memo:   input.memo ?? '',
    });
    return { rowsAffected: res.rowsAffected };
  }

  /**
   * 체중 기록 삭제.
   *  원본: wt_controller.deleteRecord → wt_records_delete
   */
  async remove(id) {
    this.log.info(`WeightService::remove 호출됨 -> id=${id}`);

    if (!id) throw new Error('id 는 필수 입력값입니다.');

    const sql = this.weightSql.get('deleteById');
    const res = await db.execute(sql, { id: Number(id) });
    return { rowsAffected: res.rowsAffected };
  }


  /* ═══════════════════ goals ═══════════════════ */

  /**
   * 체중 목표 전체 조회.
   *  프론트는 배열의 첫 원소(data[0]) 를 사용하므로 배열 형태로 반환.
   *  원본: wt_controller.getGoals → wt_goals_select_all
   */
  async listGoals() {
    this.log.info(`WeightService::listGoals 호출됨`);

    const sql = this.weightSql.get('goalsFindAll');
    const res = await db.execute(sql, {});
    return res.rows;
  }

  /**
   * 체중 목표 저장 (UPSERT).
   *  원본: wt_controller.updateGoals → wt_goals_update (UPDATE 하드코딩 id=1)
   *
   *  개선점: INSERT ... ON DUPLICATE KEY UPDATE 로 변경해 goals 테이블에 row 가
   *  아직 없을 때도 자동 생성되도록 함. (프론트가 단일 행 편집 모델을 가정하므로 안전.)
   */
  async saveGoals(input) {
    this.log.info(`WeightService::saveGoals 호출됨 -> height=${input.height} min=${input.min_weight} max=${input.max_weight}`);

    // 원본 컨트롤러가 `params.goals` 중첩 키도 수용하던 걸 서비스단에서도 방어
    const goal = (input.goals && typeof input.goals === 'object') ? input.goals : input;

    if (goal.height == null) throw new Error('height 는 필수 입력값입니다.');

    const sql = this.weightSql.get('goalsUpsert');
    const res = await db.execute(sql, {
      height:     Number(goal.height),
      min_weight: goal.min_weight != null ? Number(goal.min_weight) : null,
      max_weight: goal.max_weight != null ? Number(goal.max_weight) : null,
    });
    return { rowsAffected: res.rowsAffected };
  }
}
