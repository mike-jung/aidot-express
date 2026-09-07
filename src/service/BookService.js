///
/// BookService
///

import { Service, Sql, Log } from '../core/decorators.js';
import db from '../database/db.js';


@Service('BookService')
export default class BookService {

  // SQL 파일 주입: src/database/sql/book.sql
  @Sql('book') bookSql;

  @Log log;

  // 전체 조회
  async list() {
    this.log.info(`${this.constructor.name}::list 호출됨`);
    const sql = this.bookSql.get('findAll');
    const res = await db.execute(sql, {});
    return res.rows;
  }

  // 단건 조회
  async getById(id) {
    this.log.debug(`${this.constructor.name}::getById 호출됨 -> id=${id}`);
    const sql = this.bookSql.get('findById');
    const res = await db.execute(sql, { id });
    return res.rows[0] ?? null;
  }

  // 생성
  async create(payload) {
    this.log.info(`${this.constructor.name}::create 호출됨`);
    const sql = this.bookSql.get('insert');
    const res = await db.execute(sql, payload);
    return { insertId: res.insertId, rowsAffected: res.rowsAffected };
  }

  // 수정 (patch-16: 추가)
  async updateName(id, payload) {
    this.log.info(`${this.constructor.name}::updateName 호출됨 -> id=${id}`);
    const sql = this.bookSql.get('updateName');
    const res = await db.execute(sql, { id, ...payload });
    return { rowsAffected: res.rowsAffected };
  }

  // 삭제 (patch-16: 추가)
  async remove(id) {
    this.log.info(`${this.constructor.name}::remove 호출됨 -> id=${id}`);
    const sql = this.bookSql.get('deleteById');
    const res = await db.execute(sql, { id });
    return { rowsAffected: res.rowsAffected };
  }
}
