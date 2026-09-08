///
/// 학생 샘플 관련 API 처리 컨트롤러
///

// 데코레이터 임포트

import {
  Controller,
  RequestMapping,
  GetMapping,
  PostMapping,
  Autowired,
  Log,
} from '../core/decorators.js';


// 학생 샘플 API 컨트롤러
// 기본 경로를 '/api/students'로 설정하고 메서드에는 상대 경로만 지정

@Controller('/api/students')
export default class StudentController {

  // 서비스 주입
  @Autowired('StudentService') studentService;

  // 로그 주입
  @Log log;


  // 클라이언트 요청 처리 메서드 : 학생 리스트를 GET 방식으로 /api/students 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받음
  // GET /api/students
  @GetMapping('/')
  async list(params) {
    this.log.info(`StudentController::list called -> params=${JSON.stringify(params)}`);

    // 서비스의 list 메서드를 호출하여 학생 리스트를 가져옴
    const result = await this.studentService.list();

    // 결과 반환
    return result;
  }


  /**
   * GET /api/students/paged?page=1&perPage=20
   */
  @GetMapping('/paged')
  async listPaged(params) {
    this.log.info(`StudentController::listPaged called -> page=${params.page} perPage=${params.perPage}`);

    return this.studentService.listPaged({
      page: params.page,
      perPage: params.perPage,
    });
  }



  // 클라이언트 요청 처리 메서드 : 특정 학생 정보를 GET 방식으로 /api/students/:id 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받음
  // GET /api/students/:id
  @GetMapping('/:id')
  async get(params) {
    this.log.info(`StudentController::get called -> params=${JSON.stringify(params)}`);

    // 서비스의 getById 메서드를 호출하여 특정 학생 정보를 가져옴
    const result = await this.studentService.getById(params.id);

    // 결과를 JSON 형태로 반환
    return result;
  }

  // 클라이언트 요청 처리 메서드 : 새로운 학생 생성 POST 방식으로 /api/students 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받고, 응답 객체 res를 사용하여 직접 응답을 전송
  // POST /api/students
  @PostMapping('/')
  async create(params, req, res) {
    this.log.info(`StudentController::create called -> params=${JSON.stringify(params)}`);

    // 서비스의 create 메서드를 호출하여 새로운 학생 생성
    const result = await this.studentService.create(params);

    // 응답 직접 전송 (HTTP 상태 코드 201, JSON 형태의 응답 본문)
    const output = {
      code: 201,
      message: 'Created',
      header: {
        requestCode: params.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      },
      data: result,
    };

    res.status(201).json(output);
  }

  // 클라이언트 요청 처리 메서드 : 특정 학생 정보 업데이트 PUT 방식으로 /api/students/:id 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받음
  // 일반형: PUT /api/students/:id
  @RequestMapping({ path: '/:id', method: 'put' })
  async update(params) {
    this.log.info(`StudentController::update called -> params=${JSON.stringify(params)}`);

    // 응답을 위한 특정 포맷의 객체를 만들어 반환
    return { message: `실제 업데이트 안됨 -> 업데이트 대상 id=${params.id}`, body: params };
  }
}
