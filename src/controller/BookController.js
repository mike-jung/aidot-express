///
/// BookController
///

import {
  Controller,
  Log,
  GetMapping,
  PostMapping,
  PutMapping,
  DeleteMapping,
  Autowired,
} from '../core/decorators.js';


@Controller('/api/books')
export default class BookController {

  @Autowired('BookService') bookService;

  @Log log;

  // 1. GET /api/books/  →  BookController.list
  @GetMapping('/')
  async list(params) {
    this.log.info(`${this.constructor.name}::list called`);
    const result = await this.bookService.list();
    return result;
  }

  // 2. GET /api/books/:id  →  BookController.get
  @GetMapping('/:id')
  async get(params) {
    this.log.info(`${this.constructor.name}::get called -> id=${params.id}`);
    const result = await this.bookService.getById(params.id);
    // ★ v1.11.6 — 없는 id 는 404 (예전에는 200 + data:null)
    if (result === null || result === undefined) throw Object.assign(new Error(`id ${params.id} 을(를) 찾을 수 없습니다`), { status: 404 });
    return result;
  }

  // 3. POST /api/books/  →  BookController.create
  @PostMapping('/')
  async create(params, req, res) {
    this.log.info(`${this.constructor.name}::create called -> params=${JSON.stringify(params)}`);
    const result = await this.bookService.create(params);
    res.status(201).json({
      code: 201, message: 'Created',
      header: {
        requestCode: params.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      },
      data: result,
    });
  }

  // 4. PUT /api/books/:id  →  BookController.update
  //  patch-16: id 를 분리하고 나머지 body 를 service.updateName 에 그대로 넘김.
  @PutMapping('/:id')
  async update(params) {
    this.log.info(`${this.constructor.name}::update called -> id=${params.id}`);
    const { id, requestCode, ...payload } = params;
    return this.bookService.updateName(id, payload);
  }

  // 5. DELETE /api/books/:id  →  BookController.remove
  @DeleteMapping('/:id')
  async remove(params) {
    this.log.info(`${this.constructor.name}::remove called -> id=${params.id}`);
    return this.bookService.remove(params.id);
  }
}
