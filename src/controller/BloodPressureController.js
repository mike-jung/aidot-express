///
/// 혈압 기록·목표 API 컨트롤러 : src/controller/BloodPressureController.js
///
/// 원본(구 구조): controllers/bp_controller.js 에서
///   - POST /api/bp/records/add, /update, /delete (전부 POST 였음)
///   로 정의되어 있던 엔드포인트들을 aidot-express 표준 + 신규 REST 경로로 재정의.
///
/// 하위 호환: 프론트(stores/records_bp.js) 는 아직 POST 기반 구 경로를 사용하므로
///   구 경로와 신규 REST 경로를 **둘 다 제공**.
///

import {
  Controller,
  GetMapping,
  PostMapping,
  PutMapping,
  DeleteMapping,
  Autowired,
  Log,
} from '../core/decorators.js';


@Controller('/api/bp')
export default class BloodPressureController {

  // 서비스 주입
  @Autowired('BloodPressureService') bpService;

  // 로그 주입
  @Log log;


  /* ═══════════════════ records ═══════════════════ */

  /**
   * GET /api/bp/records
   *  혈압 기록 전체 조회.
   */
  @GetMapping('/records')
  async list(params) {
    this.log.info(`BloodPressureController::list 호출됨`);
    return await this.bpService.list();
  }

  /**
   * GET /api/bp/records/paged?page=1&perPage=10
   *  혈압 기록 페이지네이션 조회.
   *   - 응답 envelope 예:
   *       {
   *         code: 200,
   *         message: 'OK',
   *         header: { total, page, perPage, totalPages },
   *         data:   [...]
   *       }
   */
  @GetMapping('/records/paged')
  async listPaged(params) {
    this.log.info(`BloodPressureController::listPaged 호출됨 -> page=${params.page} perPage=${params.perPage}`);
    return await this.bpService.listPaged({
      page:    params.page,
      perPage: params.perPage,
    });
  }

  /**
   * GET /api/bp/records/:id  (신규 REST 경로) — 단건 조회
   */
  @GetMapping('/records/:id')
  async get(params) {
    this.log.info(`BloodPressureController::get 호출됨 -> id=${params.id}`);
    return await this.bpService.getById(params.id);
  }

  /**
   * 구 경로: POST /api/bp/records/add  (하위 호환)
   */
  @PostMapping('/records/add')
  async addLegacy(params) {
    this.log.info(`BloodPressureController::addLegacy 호출됨 (deprecated)`);
    return await this.bpService.create(params);
  }

  /**
   * 신규 REST: POST /api/bp/records
   */
  @PostMapping('/records')
  async create(params) {
    this.log.info(`BloodPressureController::create 호출됨`);
    return await this.bpService.create(params);
  }

  /**
   * 구 경로: POST /api/bp/records/update  (하위 호환)
   */
  @PostMapping('/records/update')
  async updateLegacy(params) {
    this.log.info(`BloodPressureController::updateLegacy 호출됨 -> id=${params.id}`);
    return await this.bpService.update(params.id, params);
  }

  /**
   * 신규 REST: PUT /api/bp/records/:id
   */
  @PutMapping('/records/:id')
  async update(params) {
    this.log.info(`BloodPressureController::update 호출됨 -> id=${params.id}`);
    return await this.bpService.update(params.id, params);
  }

  /**
   * 구 경로: POST /api/bp/records/delete  (하위 호환)
   */
  @PostMapping('/records/delete')
  async removeLegacy(params) {
    this.log.info(`BloodPressureController::removeLegacy 호출됨 -> id=${params.id}`);
    return await this.bpService.remove(params.id);
  }

  /**
   * 신규 REST: DELETE /api/bp/records/:id
   */
  @DeleteMapping('/records/:id')
  async remove(params) {
    this.log.info(`BloodPressureController::remove 호출됨 -> id=${params.id}`);
    return await this.bpService.remove(params.id);
  }


  /* ═══════════════════ goals ═══════════════════ */

  /**
   * GET /api/bp/goals
   *  혈압 목표 조회. 프론트는 배열 그대로 받아 type 별로 재매핑함.
   */
  @GetMapping('/goals')
  async listGoals(params) {
    this.log.info(`BloodPressureController::listGoals 호출됨`);
    return await this.bpService.listGoals();
  }

  /**
   * 구 경로: POST /api/bp/goals/update  (하위 호환)
   *  body 는 다음 형태 중 하나 수용 (원본 호환):
   *    - 배열 직접:  [{type, min_value, max_value}, ...]
   *    - 래핑:       { goals: [...] }
   *    - 객체 래핑:  { goals: { "수축기": {...}, "이완기": {...} } }
   */
  @PostMapping('/goals/update')
  async saveGoalsLegacy(params) {
    this.log.info(`BloodPressureController::saveGoalsLegacy 호출됨`);
    return await this.bpService.saveGoals(params);
  }

  /**
   * 신규 REST: PUT /api/bp/goals
   */
  @PutMapping('/goals')
  async saveGoals(params) {
    this.log.info(`BloodPressureController::saveGoals 호출됨`);
    return await this.bpService.saveGoals(params);
  }
}
