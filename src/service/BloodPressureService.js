///
/// 혈압 기록·목표 관련 서비스 : src/service/BloodPressureService.js
///
/// 원본(구 구조): controllers/bp_controller.js + database/bp_sql.js 의 로직을
///   aidot-express 의 @Service / @Sql / @Log / db.execute 방식으로 재구성.
///   페이지네이션은 db.executeList 공용 패턴 사용.
///

import { Service, Sql, Log } from '../core/decorators.js';
import db from '../database/db.js';


@Service('BloodPressureService')
export default class BloodPressureService {

  // SqlFile 객체 주입 — 'bloodPressure' = src/database/sql/bloodPressure.sql
  @Sql('bloodPressure') bpSql;

  // 로그 주입
  @Log log;


  /* ═══════════════════ records ═══════════════════ */

  /**
   * 혈압 기록 전체 조회.
   *  원본: bp_controller.getRecords → bp_records_select_all
   */
  async list() {
    this.log.info(`BloodPressureService::list 호출됨`);

    const sql = this.bpSql.get('findAll');
    const res = await db.execute(sql, {});
    return res.rows;
  }

  /**
   * 혈압 기록 페이지네이션 조회.
   *  aidot-express 공용 db.executeList 사용.
   */
  async listPaged(opts = {}) {
    this.log.info(`BloodPressureService::listPaged 호출됨 -> page=${opts.page} perPage=${opts.perPage}`);

    const sql = this.bpSql.get('findAll');
    return await db.executeList(sql, {}, {
      page:       opts.page,
      perPage:    opts.perPage,
      maxPerPage: 500,
    });
  }

  /**
   * 혈압 기록 단건 조회.
   */
  async getById(id) {
    this.log.debug(`BloodPressureService::getById 호출됨 -> id=${id}`);

    const sql = this.bpSql.get('findById');
    const res = await db.execute(sql, { id });
    return res.rows[0] ?? null;
  }

  /**
   * 혈압 기록 추가.
   *  원본: bp_controller.addRecord → bp_records_insert
   *  반환: { insertId, rowsAffected }
   */
  async create(input) {
    this.log.info(`BloodPressureService::create 호출됨 -> date=${input.date} label=${input.label}`);

    if (!input.date)   throw new Error('date 는 필수 입력값입니다.');
    if (input.systolic  == null || isNaN(Number(input.systolic)))  throw new Error('systolic 은 숫자여야 합니다.');
    if (input.diastolic == null || isNaN(Number(input.diastolic))) throw new Error('diastolic 은 숫자여야 합니다.');

    const sql = this.bpSql.get('insert');
    const res = await db.execute(sql, {
      date:      input.date,
      label:     input.label ?? '',
      systolic:  Number(input.systolic),
      diastolic: Number(input.diastolic),
      memo:      input.memo ?? '',
    });

    return { insertId: res.insertId, rowsAffected: res.rowsAffected };
  }

  /**
   * 혈압 기록 수정.
   *  원본: bp_controller.updateRecord → bp_records_update
   */
  async update(id, input) {
    this.log.info(`BloodPressureService::update 호출됨 -> id=${id}`);

    if (!id) throw new Error('id 는 필수 입력값입니다.');

    const sql = this.bpSql.get('updateById');
    const res = await db.execute(sql, {
      id:        Number(id),
      date:      input.date,
      label:     input.label ?? '',
      systolic:  Number(input.systolic),
      diastolic: Number(input.diastolic),
      memo:      input.memo ?? '',
    });
    return { rowsAffected: res.rowsAffected };
  }

  /**
   * 혈압 기록 삭제.
   *  원본: bp_controller.deleteRecord → bp_records_delete
   */
  async remove(id) {
    this.log.info(`BloodPressureService::remove 호출됨 -> id=${id}`);

    if (!id) throw new Error('id 는 필수 입력값입니다.');

    const sql = this.bpSql.get('deleteById');
    const res = await db.execute(sql, { id: Number(id) });
    return { rowsAffected: res.rowsAffected };
  }


  /* ═══════════════════ goals ═══════════════════ */

  /**
   * 혈압 목표 전체 조회.
   *  프론트는 type 별로 재매핑하므로 배열 그대로 반환.
   *  원본: bp_controller.getGoals → bp_goals_select_all
   */
  async listGoals() {
    this.log.info(`BloodPressureService::listGoals 호출됨`);

    const sql = this.bpSql.get('goalsFindAll');
    const res = await db.execute(sql, {});
    return res.rows;
  }

  /**
   * 혈압 목표 저장 (UPSERT, 여러 건 배치).
   *  원본: bp_controller.updateGoals 는 array / object / 중첩 'goals' 키 모두 수용 →
   *    서비스단에서도 방어. 여러 type 에 대해 하나씩 UPSERT 실행.
   */
  async saveGoals(input) {
    this.log.info(`BloodPressureService::saveGoals 호출됨`);

    // 1) 배열이든 객체든 모두 goals 배열로 변환
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

    // 2) 각 goal 검증 + UPSERT
    const sql = this.bpSql.get('goalsUpsert');
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
