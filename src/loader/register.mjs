/**
 * Node.js 실행 시 --import 로 로드되어 esbuild 로더를 등록.
 * 사용: node --import ./src/loader/register.mjs src/app.js
 */
import { register } from 'node:module';

register('./esbuild-loader.mjs', import.meta.url);
