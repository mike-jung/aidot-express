///
/// GuestbookController — 방명록 샘플 API (설치 직후 바로 동작)
///
///   GET    /api/guestbook/       목록
///   GET    /api/guestbook/:id    한 건
///   POST   /api/guestbook/       글 남기기
///   PUT    /api/guestbook/:id    글 고치기
///   DELETE /api/guestbook/:id    글 지우기
///
///   실습 페이지: http://localhost:7901/public/demo/guestbook-lab.html
///   실시간 알림: GET /api/events/stream?channel=guestbook
///
///   ※ 따라하기 ③ 에서 학습자가 만드는 /api/snacks · /api/supplies 와는 별개의 예제입니다.
///     연습용이라 인증 없이 열려 있습니다. 실제 서비스라면 @Auth() 를 붙이세요.
///
import {
  Controller,
  Log,
  Autowired,
  GetMapping,
  PostMapping,
  PutMapping,
  DeleteMapping,
  Validate,
} from '../core/decorators.js';
import { z } from 'zod';

const writeSchema = z.object({
  writer: z.string().trim().min(1, '이름을 적어 주세요').max(30),
  message: z.string().trim().min(1, '한마디를 적어 주세요').max(200),
}).passthrough();

@Controller('/api/guestbook')
export default class GuestbookController {

  @Autowired('GuestbookService') guestbookService;

  @Log log;

  @GetMapping('/')
  async list() {
    return this.guestbookService.list();
  }

  @GetMapping('/:id')
  async get(params) {
    return this.guestbookService.getById(params.id);
  }

  @PostMapping('/')
  @Validate(writeSchema)
  async create(params, req, res) {
    const result = await this.guestbookService.create(params);
    res.status(201).json({
      code: 201,
      message: 'Created',
      header: {
        requestCode: params.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }),
      },
      data: result,
    });
  }

  @PutMapping('/:id')
  @Validate(writeSchema)
  async update(params) {
    return this.guestbookService.update(params.id, params);
  }

  @DeleteMapping('/:id')
  async remove(params) {
    return this.guestbookService.remove(params.id);
  }
}
