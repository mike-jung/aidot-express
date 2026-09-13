/**
 * src/util/version.js — 버전/빌드 정보의 단일 출처(single source of truth)
 *
 *  우선순위
 *    1) package.json     : 실행 버전의 기준. 같은 버전의 build-info.json만 함께 사용한다.
 *    2) build-info.json   : package.json이 없는 배포본의 보조 정보
 *                           { version, builtAt, channel, artifact }
 *    3) 'unknown'
 *
 *  왜 파일을 하나 더 두나?
 *    - 배포본은 `npm start` 없이 실행되는 경우(Electron 등)가 있어 process.env.npm_package_version 을 못 믿는다.
 *    - "언제 만든 패키지인지" 를 함께 남겨야 현장에서 받은 zip 이 무엇인지 확인할 수 있다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

let cached = null;

/** { version, builtAt, channel, source } */
export function getVersionInfo() {
  if (cached) return cached;

  const build = readJson(path.join(projectRoot, 'build-info.json'));
  const pkg = readJson(path.join(projectRoot, 'package.json'));
  if (build?.version && (!pkg?.version || build.version === pkg.version)) {
    cached = {
      version: build.version,
      builtAt: build.builtAt || null,
      channel: build.channel || 'release',
      artifact: build.artifact || null,
      source: 'build-info.json',
    };
    return cached;
  }

  cached = {
    version: pkg?.version || process.env.npm_package_version || 'unknown',
    builtAt: null,
    channel: 'dev',
    artifact: null,
    source: pkg?.version ? 'package.json' : 'env',
  };
  return cached;
}

export function getVersion() {
  return getVersionInfo().version;
}

/** 로그/배너용 한 줄 요약 — 예: "v1.4.0 (release, 2026-08-24 08:40)" */
export function versionLine() {
  const v = getVersionInfo();
  const when = v.builtAt ? new Date(v.builtAt).toLocaleString('sv-SE', { hour12: false }).slice(0, 16) : null;
  return `v${v.version} (${v.channel}${when ? `, ${when}` : ''})`;
}

export default { getVersion, getVersionInfo, versionLine };
