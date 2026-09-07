///
/// 혈당 기록·목표 API 컨트롤러 : src/controller/BloodSugarController.js
///
/// 원본(구 구조): controllers/bs_controller.js 에서
///   - POST /api/bs/records/add, /update, /delete (전부 POST 였음)
///   로 정의되어 있던 엔드포인트들을 aidot-express 표준 + 신규 REST 경로로 재정의.
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


@Controller('/api/bs')
export default class BloodSugarController {

  @Autowired('BloodSugarService') bsService;

  @Log log;


  /* ═══════════════════ records ═══════════════════ */

  @GetMapping('/records')
  async list(params) {
    this.log.info(`BloodSugarController::list 호출됨`);
    return await this.bsService.list();
  }

  /**
   * GET /api/bs/records/paged?page=1&perPage=10
   *  페이지네이션 조회.
   */
  @GetMapping('/records/paged')
  async listPaged(params) {
    this.log.info(`BloodSugarController::listPaged 호출됨 -> page=${params.page} perPage=${params.perPage}`);
    return await this.bsService.listPaged({
      page:    params.page,
      perPage: params.perPage,
    });
  }

  @GetMapping('/records/:id')
  async get(params) {
    this.log.info(`BloodSugarController::get 호출됨 -> id=${params.id}`);
    return await this.bsService.getById(params.id);
  }

  /** 구 경로: POST /api/bs/records/add  (하위 호환) */
  @PostMapping('/records/add')
  async addLegacy(params) {
    this.log.info(`BloodSugarController::addLegacy 호출됨 (deprecated)`);
    return await this.bsService.create(params);
  }

  @PostMapping('/records')
  async create(params) {
    this.log.info(`BloodSugarController::create 호출됨`);
    return await this.bsService.create(params);
  }

  /** 구 경로: POST /api/bs/records/update  (하위 호환) */
  @PostMapping('/records/update')
  async updateLegacy(params) {
    this.log.info(`BloodSugarController::updateLegacy 호출됨 -> id=${params.id}`);
    return await this.bsService.update(params.id, params);
  }

  @PutMapping('/records/:id')
  async update(params) {
    this.log.info(`BloodSugarController::update 호출됨 -> id=${params.id}`);
    return await this.bsService.update(params.id, params);
  }

  /** 구 경로: POST /api/bs/records/delete  (하위 호환) */
  @PostMapping('/records/delete')
  async removeLegacy(params) {
    this.log.info(`BloodSugarController::removeLegacy 호출됨 -> id=${params.id}`);
    return await this.bsService.remove(params.id);
  }

  @DeleteMapping('/records/:id')
  async remove(params) {
    this.log.info(`BloodSugarController::remove 호출됨 -> id=${params.id}`);
    return await this.bsService.remove(params.id);
  }


  /* ═══════════════════ goals ═══════════════════ */

  @GetMapping('/goals')
  async listGoals(params) {
    this.log.info(`BloodSugarController::listGoals 호출됨`);
    return await this.bsService.listGoals();
  }

  /**
   * 구 경로: POST /api/bs/goals/update  (하위 호환)
   */
  @PostMapping('/goals/update')
  async saveGoalsLegacy(params) {
    this.log.info(`BloodSugarController::saveGoalsLegacy 호출됨`);
    return await this.bsService.saveGoals(params);
  }

  @PutMapping('/goals')
  async saveGoals(params) {
    this.log.info(`BloodSugarController::saveGoals 호출됨`);
    return await this.bsService.saveGoals(params);
  }
}
