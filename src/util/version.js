/**
 * src/util/version.js — 버전/빌드 정보의 단일 출처(single source of truth)
 *
 *  우선순위
 *    1) build-info.json   : 배포 패키지를 만들 때 scripts/release.mjs 가 심어 둔 정보
 *                           { version, builtAt, channel, artifact }
 *    2) package.json      : 소스에서 직접 실행할 때 (개발 중)
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
  if (build?.version) {
    cached = {
      version: build.version,
      builtAt: build.builtAt || null,
      channel: build.channel || 'release',
      artifact: build.artifact || null,
      source: 'build-info.json',
    };
    return cached;
  }

  const pkg = readJson(path.join(projectRoot, 'package.json'));
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
