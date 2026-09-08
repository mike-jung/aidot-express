///
/// 홈 API 처리 컨트롤러
/// 순수 JavaScript 컨트롤러 예시
///

// 데코레이터 임포트
import { Controller, GetMapping, PostMapping, RequestMapping, Log } from '../core/decorators.js';


// 홈 API 컨트롤러
// 기본 경로를 '/api/home'로 설정하고 메서드에는 상대 경로만 지정

@Controller('/api/home')
export default class HomeController {

  // 로그 주입
  @Log log;

  // 클라이언트 요청 처리 메서드 : GET 방식으로 /api/home/hello 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받음
  @GetMapping('/hello')
  async hello(params) {
    this.log.info(`HomeController::hello called -> params=${JSON.stringify(params)}`);

    return { message: `Hello, ${params.name ?? 'world'}!` };
  }

  // 클라이언트 요청 처리 메서드 : POST 방식으로 /api/home/echo 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받음
  @PostMapping('/echo')
  async echo(params) {
    this.log.info(`HomeController::echo called -> params=${JSON.stringify(params)}`);

    return { message: `Echo: ${params.what}` };
  }

}
