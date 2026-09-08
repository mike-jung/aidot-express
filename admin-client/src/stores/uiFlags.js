import { defineStore } from 'pinia';
import http from '../api/http.js';

/**
 * UI feature flags — 서버의 config 를 읽어 메뉴/라우트 조건부 렌더에 사용.
 *
 *  로드 시점:
 *    - 로그인 성공 직후 (auth.login / silentRefresh)
 *    - 앱 초기화 시 한 번 (main.js 에서 try-load, 미로그인이면 조용히 skip)
 *
 *  서버 엔드포인트: GET /api/admin/system/ui-flags  → { data: { mciGeneratorEnabled: boolean } }
 *
 *  주의: 이 store 는 UI 가림용일 뿐, 실제 보안 경계는 서버 측 guard 가 담당한다.
 *  (MciControllerController 가 config.mci.generatorEnabled 를 직접 체크하여 404 반환)
 */
export const useUiFlagsStore = defineStore('ui-flags', {
  state: () => ({
    /** 서버에서 flag 를 성공적으로 조회했는지 여부. false 면 모든 optional 메뉴 숨김. */
    loaded: false,

    /** EAI 코드 생성기 (UI + API) 활성화 여부. default false (disable). */
    mciGeneratorEnabled: false,
    /* ★ v1.25.0 — 엔터프라이즈 메뉴. 서버가 켜 줘야 보인다. */
    backupEnabled: false,
    secureColumnsEnabled: false,
    haEnabled: false,
  }),
  actions: {
    /**
     * 서버에서 flag 들을 읽어온다.
     *  - 미로그인/에러 시 조용히 실패하고 모든 flag 를 false 로 유지.
     *  - 반복 호출해도 안전.
     */
    async load() {
      try {
        // 짧은 timeout — DB 에러 등으로 서버가 응답 못할 때 메뉴 네비게이션이
        // 무한 pending 되지 않도록 보호. 실패하면 flag 초기값(false) 유지.
        const r = await http.get('/api/admin/system/ui-flags', { timeout: 3000 });
        const d = r.data?.data ?? {};
        this.mciGeneratorEnabled = !!d.mciGeneratorEnabled;
        this.backupEnabled = !!d.backupEnabled;
        this.secureColumnsEnabled = !!d.secureColumnsEnabled;
        this.haEnabled = !!d.haEnabled;
        this.loaded = true;
      } catch (_) {
        // auth 실패/네트워크 에러/timeout: flag 초기값 유지 (default false)
        this.loaded = false;
      }
    },
    /** 로그아웃 시 reset */
    clear() {
      this.loaded = false;
      this.mciGeneratorEnabled = false;
    },
  },
});
