///
/// 체중 기록·목표 API 컨트롤러 : src/controller/WeightController.js
///
/// 원본(구 구조): controllers/wt_controller.js 에서
///   - POST /api/wt/records/add, /update, /delete (전부 POST 였음)
///   로 정의되어 있던 엔드포인트들을, 표준 REST 관례에 맞게 재정의.
///
/// 하위 호환: 프론트(stores/records_wt.js) 는 아직 `/wt/records`, `/wt/records/add`,
///   `/wt/records/update`, `/wt/records/delete`, `/wt/goals`, `/wt/goals/update` 를 사용
///   하므로 Base Path 를 `/api/wt` 로 유지하고, **구 경로 + 신규 REST 경로 둘 다** 제공.
///   프론트 수정 전까지는 기존 경로로 계속 동작하고, 프론트를 패치하면 REST 경로로
///   자연스럽게 전환 가능.
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


@Controller('/api/wt')
export default class WeightController {

  // 서비스 주입
  @Autowired('WeightService') weightService;

  // 로그 주입
  @Log log;


  /* ═══════════════════ records ═══════════════════ */

  /**
   * GET /api/wt/records
   *  체중 기록 전체 조회.
   *  원본: wt_controller.getRecords
   */
  @GetMapping('/records')
  async list(params) {
    this.log.info(`WeightController::list 호출됨`);
    const rows = await this.weightService.list();
    return rows;
  }

  /**
   * GET /api/wt/records/paged?page=1&perPage=10
   *  체중 기록 페이지네이션 조회.
   *   - aidot-express 표준 "list paged" 패턴 (StudentController.listPaged 와 동일).
   *   - 반환되는 envelope 예:
   *       {
   *         code: 200,
   *         message: 'OK',
   *         header: { total: 42, page: 1, perPage: 10, totalPages: 5 },
   *         data:   [...]    // 현재 페이지 rows
   *       }
   *   - 프레임워크가 서비스의 `{ rows, header }` 반환값을 envelope 의 `data` / `header`
   *     로 자동 매핑 (aidot-express 표준 listPaged 반환 형태).
   */
  @GetMapping('/records/paged')
  async listPaged(params) {
    this.log.info(`WeightController::listPaged 호출됨 -> page=${params.page} perPage=${params.perPage}`);

    return await this.weightService.listPaged({
      page:    params.page,
      perPage: params.perPage,
    });
  }

  /**
   * GET /api/wt/records/:id  (신규 REST 경로)
   *  단건 조회.
   */
  @GetMapping('/records/:id')
  async get(params) {
    this.log.info(`WeightController::get 호출됨 -> id=${params.id}`);
    return await this.weightService.getById(params.id);
  }

  /**
   * 구 경로: POST /api/wt/records/add
   *  프론트 하위 호환. 새로 짜는 클라이언트는 POST /api/wt/records 를 권장.
   */
  @PostMapping('/records/add')
  async addLegacy(params) {
    this.log.info(`WeightController::addLegacy 호출됨 (deprecated — POST /records 사용 권장)`);
    return await this.weightService.create(params);
  }

  /**
   * 신규 REST: POST /api/wt/records
   */
  @PostMapping('/records')
  async create(params) {
    this.log.info(`WeightController::create 호출됨`);
    return await this.weightService.create(params);
  }

  /**
   * 구 경로: POST /api/wt/records/update
   *  body.id 로 대상 식별. 프론트 하위 호환용.
   */
  @PostMapping('/records/update')
  async updateLegacy(params) {
    this.log.info(`WeightController::updateLegacy 호출됨 -> id=${params.id}`);
    return await this.weightService.update(params.id, params);
  }

  /**
   * 신규 REST: PUT /api/wt/records/:id
   */
  @PutMapping('/records/:id')
  async update(params) {
    this.log.info(`WeightController::update 호출됨 -> id=${params.id}`);
    return await this.weightService.update(params.id, params);
  }

  /**
   * 구 경로: POST /api/wt/records/delete
   *  body.id 로 대상 식별. 프론트 하위 호환용.
   */
  @PostMapping('/records/delete')
  async removeLegacy(params) {
    this.log.info(`WeightController::removeLegacy 호출됨 -> id=${params.id}`);
    return await this.weightService.remove(params.id);
  }

  /**
   * 신규 REST: DELETE /api/wt/records/:id
   */
  @DeleteMapping('/records/:id')
  async remove(params) {
    this.log.info(`WeightController::remove 호출됨 -> id=${params.id}`);
    return await this.weightService.remove(params.id);
  }


  /* ═══════════════════ goals ═══════════════════ */

  /**
   * GET /api/wt/goals
   *  체중 목표 조회.
   *  원본 프론트는 배열의 [0] 을 사용하므로 그대로 배열을 반환한다.
   */
  @GetMapping('/goals')
  async listGoals(params) {
    this.log.info(`WeightController::listGoals 호출됨`);
    return await this.weightService.listGoals();
  }

  /**
   * 구 경로: POST /api/wt/goals/update
   *  body 로 { height, min_weight, max_weight } 받음.
   *  아직 프론트가 이 경로를 쓰고 있음.
   */
  @PostMapping('/goals/update')
  async saveGoalsLegacy(params) {
    this.log.info(`WeightController::saveGoalsLegacy 호출됨`);
    return await this.weightService.saveGoals(params);
  }

  /**
   * 신규 REST: PUT /api/wt/goals
   */
  @PutMapping('/goals')
  async saveGoals(params) {
    this.log.info(`WeightController::saveGoals 호출됨`);
    return await this.weightService.saveGoals(params);
  }
}
