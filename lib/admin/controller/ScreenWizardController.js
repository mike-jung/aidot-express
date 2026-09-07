/**
 * ScreenWizardController — 화면 자동 생성 Wizard REST API.
 *
 *   GET  /api/admin/screen-wizard/analyze?controllerId=X&handler=Y
 *        → handler 의 input + output 구조 + 참조 Service/SQL 의존성 반환.
 *
 *   POST /api/admin/screen-wizard/probe
 *        body: { controllerId, handler, params }
 *        → 실제 HTTP self-call 로 handler 를 호출하여 응답 샘플을 반환.
 *
 *  probe 는 서버 자기 자신에게 fetch 하므로:
 *   - 인증 미들웨어를 정상 통과 (호출자의 cookie / Authorization 을 그대로 전달)
 *   - DI 등록 여부와 무관 — 라우터에 등록된 모든 컨트롤러에 동작
 *   - POST/PUT/DELETE 는 실제로 DB 변경 발생 (호출자는 경고 대화상자를 먼저 띄워야 함)
 *
 *  Phase 34 (patch-13): aidot-express / aidot-server 통합 버전.
 */
import {
  Controller, GetMapping, PostMapping, Auth, Autowired, Log,
} from '../../../src/core/decorators.js';

@Controller('/api/admin/screen-wizard')
export default class ScreenWizardController {

  @Autowired('ScreenWizardService') wizardService;

  @Log log;

  /** GET /api/admin/screen-wizard/analyze */
  @GetMapping('/analyze')
  @Auth()
  async analyze(params) {
    const { controllerId, handler } = params || {};
    if (!controllerId || !handler) {
      throw Object.assign(new Error('controllerId 와 handler 는 필수입니다.'), { status: 400 });
    }
    const data = await this.wizardService.analyze(String(controllerId), String(handler));
    return { data };
  }

  /**
   * POST /api/admin/screen-wizard/probe
   *
   *  body: { controllerId, handler, params }
   *  호출자의 cookie / Authorization 을 probe 요청에 포함 (self-call 시 인증 유지).
   */
  @PostMapping('/probe')
  @Auth()
  async probe(params, req) {
    const { controllerId, handler, params: callParams } = params || {};
    if (!controllerId || !handler) {
      throw Object.assign(new Error('controllerId 와 handler 는 필수입니다.'), { status: 400 });
    }

    // 인증 컨텍스트 전달 — 호출자의 cookie / Authorization 헤더를 그대로 self-call 에.
    //  Express: req.headers.cookie / req.headers.authorization
    //  uWS shim: 동일 인터페이스 제공.
    const cookie = req?.headers?.cookie || '';
    const authHeader = req?.headers?.authorization || '';

    const data = await this.wizardService.probe({
      controllerId: String(controllerId),
      handlerName: String(handler),
      params: callParams || {},
      cookie,
      authHeader,
    });
    return { data };
  }
}
