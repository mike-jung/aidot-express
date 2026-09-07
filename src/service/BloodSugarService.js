///
/// 혈당 기록·목표 관련 서비스 : src/service/BloodSugarService.js
///
/// 원본(구 구조): controllers/bs_controller.js + database/bs_sql.js 의 로직을
///   aidot-express 의 @Service / @Sql / @Log / db.execute 방식으로 재구성.
///

import { Service, Sql, Log } from '../core/decorators.js';
import db from '../database/db.js';


@Service('BloodSugarService')
export default class BloodSugarService {

  // SqlFile 객체 주입 — 'bloodSugar' = src/database/sql/bloodSugar.sql
  @Sql('bloodSugar') bsSql;

  // 로그 주입
  @Log log;


  /* ═══════════════════ records ═══════════════════ */

  async list() {
    this.log.info(`BloodSugarService::list 호출됨`);

    const sql = this.bsSql.get('findAll');
    const res = await db.execute(sql, {});
    return res.rows;
  }

  async listPaged(opts = {}) {
    this.log.info(`BloodSugarService::listPaged 호출됨 -> page=${opts.page} perPage=${opts.perPage}`);

    const sql = this.bsSql.get('findAll');
    return await db.executeList(sql, {}, {
      page:       opts.page,
      perPage:    opts.perPage,
      maxPerPage: 500,
    });
  }

  async getById(id) {
    this.log.debug(`BloodSugarService::getById 호출됨 -> id=${id}`);

    const sql = this.bsSql.get('findById');
    const res = await db.execute(sql, { id });
    return res.rows[0] ?? null;
  }

  /**
   * 혈당 기록 추가.
   *  원본: bs_controller.addRecord → bs_records_insert
   */
  async create(input) {
    this.log.info(`BloodSugarService::create 호출됨 -> date=${input.date} label=${input.label}`);

    if (!input.date)  throw new Error('date 는 필수 입력값입니다.');
    if (input.value == null || isNaN(Number(input.value))) {
      throw new Error('value 는 숫자여야 합니다.');
    }

    const sql = this.bsSql.get('insert');
    const res = await db.execute(sql, {
      date:      input.date,
      label:     input.label ?? '',
      meal_time: input.meal_time ?? null,
      value:     Number(input.value),
      memo:      input.memo ?? '',
    });

    return { insertId: res.insertId, rowsAffected: res.rowsAffected };
  }

  /**
   * 혈당 기록 수정.
   *  원본: bs_controller.updateRecord → bs_records_update
   */
  async update(id, input) {
    this.log.info(`BloodSugarService::update 호출됨 -> id=${id}`);

    if (!id) throw new Error('id 는 필수 입력값입니다.');

    const sql = this.bsSql.get('updateById');
    const res = await db.execute(sql, {
      id:        Number(id),
      date:      input.date,
      label:     input.label ?? '',
      meal_time: input.meal_time ?? null,
      value:     Number(input.value),
      memo:      input.memo ?? '',
    });
    return { rowsAffected: res.rowsAffected };
  }

  /**
   * 혈당 기록 삭제.
   *  원본: bs_controller.deleteRecord → bs_records_delete
   */
  async remove(id) {
    this.log.info(`BloodSugarService::remove 호출됨 -> id=${id}`);

    if (!id) throw new Error('id 는 필수 입력값입니다.');

    const sql = this.bsSql.get('deleteById');
    const res = await db.execute(sql, { id: Number(id) });
    return { rowsAffected: res.rowsAffected };
  }


  /* ═══════════════════ goals ═══════════════════ */

  async listGoals() {
    this.log.info(`BloodSugarService::listGoals 호출됨`);

    const sql = this.bsSql.get('goalsFindAll');
    const res = await db.execute(sql, {});
    return res.rows;
  }

  /**
   * 혈당 목표 저장 (UPSERT, 여러 건).
   *   원본 bs_controller.updateGoals 는 array / object / 중첩 'goals' 키 모두 수용.
   */
  async saveGoals(input) {
    this.log.info(`BloodSugarService::saveGoals 호출됨`);

    // 배열이든 객체든 모두 goals 배열로 변환
    let goals = [];
    if (Array.isArray(input)) {
      goals = input;
    } else if (Array.isArray(input?.goals)) {
      goals = input.goals;
    } else if (input?.goals && typeof input.goals === 'object') {
      goals = Object.values(input.goals);
    } else if (input && typeof input === 'object') {
      goals = Object.values(input);
    }

    const sql = this.bsSql.get('goalsUpsert');
    let affected = 0;
    for (const goal of goals) {
      if (!goal || !goal.type) continue;
      const res = await db.execute(sql, {
        type:      String(goal.type),
        min_value: goal.min_value != null ? Number(goal.min_value) : null,
        max_value: goal.max_value != null ? Number(goal.max_value) : null,
      });
      affected += res.rowsAffected || 0;
    }
    return { rowsAffected: affected, count: goals.length };
  }
}
