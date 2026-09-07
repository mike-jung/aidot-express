// 화면 디자이너 생성기: 실시간(SSE) 옵션이 켜졌을 때 코드가 제대로 생성되는지
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const GEN = path.resolve(import.meta.dirname, '..', 'admin-client', 'src', 'generator', 'screens');

/** .js 생성기 모듈을 Node 에서 직접 불러온다 (브라우저 전용 API 미사용) */
const { genResourceStore } = await import(path.join(GEN, 'resourceStoreGen.js'));
const { genCompositeScreen } = await import(path.join(GEN, 'compositeGen.js'));

test('실시간 옵션이 꺼져 있으면 구독 코드가 없다', () => {
  const f = genResourceStore({ key: 'book', endpointPath: '/api/books', method: 'GET' });
  assert.ok(!f.content.includes('subscribeRealtime'));
  assert.ok(!f.content.includes('EventSource'));
});

test('실시간 옵션이 켜지면 EventSource 구독/해제 액션이 생성된다', () => {
  const f = genResourceStore({
    key: 'snack', endpointPath: '/api/snacks', method: 'GET',
    realtime: true, streamPath: '/api/snacks/events',
  });
  assert.match(f.content, /new EventSource\("\/api\/snacks\/events"\)/);
  assert.ok(f.content.includes("addEventListener('change'"));
  assert.ok(f.content.includes('unsubscribeRealtime'));
  assert.ok(f.content.includes('realtimeConnected'));
});

test('화면 SFC 가 구독/정리를 생명주기에 넣는다', () => {
  const spec = {
    name: 'SnackList', route: '/snacks', title: '간식 목록',
    rows: [{ widths: [12], widgets: [{ id: 'w1', type: 'list', title: '간식', source: {
      type: 'endpoint', path: '/api/snacks', method: 'GET',
      realtime: true, streamPath: '/api/snacks/events',
    } }] }],
  };
  const collector = new Map();
  const screen = genCompositeScreen(spec, { resourceCollector: collector });
  assert.ok(screen.content.includes('snackStore.subscribeRealtime()'));
  assert.ok(screen.content.includes('snackStore.unsubscribeRealtime()'));
  assert.match(screen.content, /import \{[^}]*onBeforeUnmount[^}]*\} from 'vue'/);
  const res = [...collector.values()][0];
  assert.equal(res.realtime, true);
  assert.equal(res.streamPath, '/api/snacks/events');
});

test('실시간 화면의 ListWidget 에 연결 상태가 전달된다', () => {
  const spec = {
    name: 'SnackList', route: '/snacks', title: '간식 목록',
    rows: [{ widths: [12], widgets: [{ id: 'w1', kind: 'list', type: 'list', title: '간식', source: {
      type: 'endpoint', path: '/api/snacks', method: 'GET',
      realtime: true, streamPath: '/api/snacks/events',
    } }] }],
  };
  const screen = genCompositeScreen(spec, { resourceCollector: new Map() });
  assert.match(screen.content, /:realtime="true"/);
  assert.match(screen.content, /:realtime-connected="snackStore\.realtimeConnected"/);
});

test('실시간이 꺼진 화면에는 배지 속성이 없다', () => {
  const spec = {
    name: 'BookList', route: '/books', title: '책 목록',
    rows: [{ widths: [12], widgets: [{ id: 'w1', kind: 'list', type: 'list', title: '책', source: {
      type: 'endpoint', path: '/api/books', method: 'GET',
    } }] }],
  };
  const screen = genCompositeScreen(spec, { resourceCollector: new Map() });
  assert.ok(!screen.content.includes(':realtime='));
});

test('생성된 store 코드 자체가 문법적으로 올바르다', async () => {
  const { transform } = await import('esbuild');
  for (const opts of [
    { key: 'book', endpointPath: '/api/books' },
    { key: 'snack', endpointPath: '/api/snacks', realtime: true, streamPath: '/api/snacks/events' },
  ]) {
    const f = genResourceStore({ method: 'GET', ...opts });
    await transform(f.content, { loader: 'js', format: 'esm' });   // 실패하면 throw
  }
});

test('생성되는 위젯 SFC 가 모두 Vue 컴파일을 통과한다', async (t) => {
  const { genWidgetSfcs } = await import(path.resolve(import.meta.dirname, '..', 'admin-client', 'src', 'generator', 'widget-templates', 'widgetSfcTemplates.js'));
  // vue 컴파일러는 admin-client 의 의존성이다 — 설치돼 있지 않은 환경(패키지 배포본 등)에서는 건너뛴다
  const compilerPath = path.resolve(import.meta.dirname, '..', 'admin-client', 'node_modules', 'vue', 'compiler-sfc', 'index.mjs');
  if (!fs.existsSync(compilerPath)) {
    t.skip('admin-client/node_modules 가 없어 건너뜀 (npm run build:admin 후 실행하면 검사됩니다)');
    return;
  }
  const { parse, compileScript, compileTemplate } = await import(compilerPath);
  const files = genWidgetSfcs();
  assert.ok(files.length >= 5);
  for (const f of files) {
    const { descriptor, errors } = parse(f.content, { filename: f.path });
    assert.deepEqual(errors, [], `${f.path} 파싱 오류`);
    if (descriptor.scriptSetup) compileScript(descriptor, { id: f.path });
    if (descriptor.template) {
      const r = compileTemplate({ source: descriptor.template.content, filename: f.path, id: f.path });
      assert.deepEqual(r.errors, [], `${f.path} 템플릿 오류`);
    }
  }
});
