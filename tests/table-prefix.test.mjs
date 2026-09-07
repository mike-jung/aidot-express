/**
 * 샘플 테이블 접두사 (v1.7.3) 단위 테스트.
 *   실행: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  samplePrefix, renderSampleTokens, sampleTable,
  SAMPLE_TABLES, looksLikeOurSampleTable,
} from '../src/database/tablePrefix.js';

test('{{sample}} 토큰이 접두사로 치환된다', () => {
  const p = samplePrefix();
  assert.equal(renderSampleTokens('SELECT * FROM {{sample}}students'), `SELECT * FROM ${p}students`);
  assert.equal(renderSampleTokens('{{ sample }}book'), `${p}book`);          // 공백 허용
  assert.equal(sampleTable('person'), `${p}person`);
});

test('토큰이 없는 SQL 은 그대로 통과한다 (프레임워크 테이블 보호)', () => {
  const sql = 'SELECT id FROM users WHERE id = :id';
  assert.equal(renderSampleTokens(sql), sql);
  assert.equal(renderSampleTokens('ALTER TABLE admin_users ADD COLUMN x INT'),
    'ALTER TABLE admin_users ADD COLUMN x INT');
});

test('접두사가 여러 번 나와도 모두 치환된다', () => {
  const p = samplePrefix();
  const out = renderSampleTokens(
    'INSERT INTO {{sample}}students (id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM {{sample}}students)');
  assert.equal(out.includes('{{sample}}'), false);
  assert.equal((out.match(new RegExp(`${p}students`, 'g')) || []).length, 2);
});

test('우리 샘플 테이블 판정 — 컬럼이 전부 우리 것이면 참', () => {
  assert.equal(looksLikeOurSampleTable('students', ['id', 'name', 'created_at']), true);
  // sqlite 의 book 에는 author_ai 가 없다 — 부분집합도 우리 것으로 인정
  assert.equal(looksLikeOurSampleTable('book', ['id', 'title', 'author', 'price', 'created_at']), true);
});

test('우리 샘플 테이블 판정 — 모르는 컬럼이 하나라도 있으면 거짓', () => {
  // 사용자가 실제로 겪은 상황: 남의 students 에 email 이 있었다
  assert.equal(looksLikeOurSampleTable('students', ['id', 'name', 'email']), false);
  assert.equal(looksLikeOurSampleTable('person', ['id', 'name', 'age', 'mobile', 'ssn']), false);
});

test('우리 샘플 테이블 판정 — id 가 없거나 빈 테이블이면 거짓', () => {
  assert.equal(looksLikeOurSampleTable('students', ['name', 'created_at']), false);
  assert.equal(looksLikeOurSampleTable('students', []), false);
  assert.equal(looksLikeOurSampleTable('알수없는테이블', ['id']), false);
});

test('SAMPLE_TABLES 는 샘플만 담고 프레임워크 테이블은 담지 않는다', () => {
  const keys = Object.keys(SAMPLE_TABLES);
  for (const framework of ['users', 'refresh_tokens', 'schema_migrations', 'admin_users']) {
    assert.equal(keys.includes(framework), false, `${framework} 는 접두사 대상이 아니어야 한다`);
  }
  assert.equal(keys.includes('students'), true);
  assert.equal(keys.includes('person'), true);
});
