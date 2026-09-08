///
/// 학생 샘플 관련 API 처리 서비스
/// 순수 JavaScript 서비스 예시
/// MariaDB / Oracle 은 `:name` 바인딩을 네이티브 지원하므로 별도 bindParams 변환 없이 원본 SQL 과 params 객체를 그대로 전달함
///

// 데코레이터 임포트
import { Service, Sql, Log } from '../core/decorators.js';
import db from '../database/db.js';


// 학생 샘플 API 서비스
// @Service 데코레이터로 컨테이너에 'StudentService'라는 이름으로 등록

@Service('StudentService')
export default class StudentService {

  // SqlFile 객체 주입
  @Sql('student') studentSql;

  // Log 객체 주입
  @Log log;


  // 전체 학생 목록 조회
  async list() {
    this.log.info(`StudentService::list called`);

    // SQL 파일에서 'findAll' 쿼리를 가져와서 실행
    const sql = this.studentSql.get('findAll');
    const res = await db.execute(sql, {});

    return res.rows;
  }


  // 전체 학생 목록 조회 (페이지네이션)
  async listPaged(opts) {
    this.log.info(`StudentService::listPaged called -> page=${opts.page} perPage=${opts.perPage}`);

    // SQL 파일에서 'findAll' 쿼리를 가져와서 실행
    const sql = this.studentSql.get('findAll');
    return await db.executeList(sql, {}, { page: opts.page, perPage: opts.perPage });
  }


  // 학생 ID로 학생 정보 조회
  async getById(id) {
    this.log.debug(`StudentService::getById called -> id=${id}`);

    // SQL 파일에서 'findById' 쿼리를 가져와서 실행
    const sql = this.studentSql.get('findById');
    const res = await db.execute(sql, { id });

    return res.rows[0] ?? null;
  }

  // 학생 생성
  async create(student) {
    this.log.info(`StudentService::create called -> id=${student.id} name=${student.name}`);

    // SQL 파일에서 'insert' 쿼리를 가져와서 실행
    const sql = this.studentSql.get('insert');
    const res = await db.execute(sql, student);

    return { insertId: res.insertId, rowsAffected: res.rowsAffected };
  }

  // 학생 이름 업데이트
  async updateName(id, name) {
    this.log.info(`StudentService::updateName called -> id=${id} name=${name}`);

    // SQL 파일에서 'updateName' 쿼리를 가져와서 실행
    const sql = this.studentSql.get('updateName');
    const res = await db.execute(sql, { id, name });

    return { rowsAffected: res.rowsAffected };
  }

  // 학생 삭제
  async remove(id) {
    this.log.info(`StudentService::remove called -> id=${id}`);

    // SQL 파일에서 'deleteById' 쿼리를 가져와서 실행
    const sql = this.studentSql.get('deleteById');
    const res = await db.execute(sql, { id });

    return { rowsAffected: res.rowsAffected };
  }

}
