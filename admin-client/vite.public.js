/**
 * vite.public.js — 공개판 콘솔 빌드.
 *
 *  ★ v1.36.2 — 예전에는 빌드된 번들에서 파일만 지웠다. 그런데 라우터가
 *  `component: () => import('../views/HaPage.vue')` 로 부르므로, 그 파일을 지우면
 *  **참조가 깨진 채로 남는다.** 서버는 죽지 않지만 깨끗하지 않다.
 *
 *  이제 빌드할 때 그 화면들을 **빈 컴포넌트로 바꿔서** 번들을 만든다.
 *  Vite 의 alias 로 경로만 갈아 끼우면 되므로, 소스는 건드리지 않는다.
 *
 *    npm run build:admin            공개판 (기본)
 *    npm run build:admin:full       전부
 */
import { defineConfig, mergeConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import base from './vite.config.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** 공개판에 넣지 않을 화면 — 라우터가 동적 import 하는 것들 */
const ENTERPRISE_VIEWS = [
  'HaPage.vue',
  'BackupPage.vue',
  'SecureColumnsPage.vue',
  'MciControllerNew.vue',
  'MciTemplateEditor.vue',
  'MciAbbreviationsEditor.vue',
];

const placeholder = path.resolve(HERE, 'src/views/_NotInThisEdition.vue');

export default defineConfig((env) => {
  const baseCfg = typeof base === 'function' ? base(env) : base;
  return mergeConfig(baseCfg, {
    build: { outDir: 'dist-public', emptyOutDir: true },
    resolve: {
      /* ⚠ find 는 **경로 전체**와 맞아야 한다.
         `/views/X.vue$` 처럼 뒷부분만 잡으면 앞의 `../` 가 남아
         `../home/...` 같은 경로가 만들어진다 — 실제로 그렇게 실패했다. */
      alias: ENTERPRISE_VIEWS.map((v) => ({
        find: new RegExp(`^.*[\\\\/]views[\\\\/]${v.replace('.', '\\.')}$`),
        replacement: placeholder,
      })),
    },
    define: {
      /* 화면 코드에서 판을 알 수 있게 — 메뉴는 서버 플래그로 감추지만,
         혹시 직접 주소를 치고 들어와도 안내가 나오게 한다 */
      __AIDOT_EDITION__: JSON.stringify('open'),
    },
  });
});
