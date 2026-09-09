import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import editionPlugin from './edition-plugin.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Vite dev 서버 설정.
 *
 *  포트 5174 에서 실행 (admin-client 전용, 서버와 충돌 회피).
 *  strictPort 로 Electron 런처(scripts/electron-dev-vite.cjs) 가 이 포트를 기다림.
 *
 *  /api 요청은 Express 서버로 프록시한다.
 *  프록시 타겟은 다음 순서로 결정:
 *    1) process.env.VITE_API_TARGET      — 명시적 (예: CI 에서 주입, 원격 서버 지정)
 *    2) ../.env 의 PORT 값                — 개발자가 쓰는 실제 포트
 *    3) http://localhost:3000             — default config 값 (fallback)
 *
 *  로그인 등 API 요청 시 ECONNREFUSED 가 나면 프록시 타겟과 실제 서버 포트가
 *  일치하지 않는 것 → 서버 기동 로그의 포트와 여기서 결정된 포트를 비교.
 */
function resolveApiTarget() {
  if (process.env.VITE_API_TARGET) return process.env.VITE_API_TARGET;

  // 프로젝트 루트의 .env 에서 PORT 값 읽기 (dotenv 라이브러리 없이 직접 파싱)
  try {
    const envPath = path.resolve(process.cwd(), '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
      if (match) {
        const port = match[1];
        console.log(`[vite] API proxy target: http://localhost:${port} (from ../.env PORT)`);
        return `http://localhost:${port}`;
      }
    }
  } catch (e) {
    console.warn('[vite] .env 읽기 실패:', e.message);
  }

  console.log('[vite] API proxy target: http://localhost:3000 (default fallback)');
  return 'http://localhost:3000';
}

const apiTarget = resolveApiTarget();

export default defineConfig({
  plugins: [vue(), editionPlugin()],
  define: { __AIDOT_EDITION__: JSON.stringify('full') },
  server: {
    port: 5174,
    host: '127.0.0.1',
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        // 프록시 연결 실패 시 명확한 에러 메시지 — 디버깅 용이
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error(`[vite proxy] ${req.method} ${req.url} → ${apiTarget} 실패: ${err.code || err.message}`);
            if (res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({
                error: 'proxy_error',
                message: `Express 서버(${apiTarget}) 에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.`,
                code: err.code,
              }));
            }
          });
        },
      },
    },
  },
});
