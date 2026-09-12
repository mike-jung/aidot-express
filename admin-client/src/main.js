import { createApp } from 'vue';
import { createPinia } from 'pinia';

/* v1.7.9 — 자체 호스팅 웹폰트 (CDN 을 못 쓰는 폐쇄망을 전제로 npm 패키지에서 번들한다)
     본문: Pretendard Variable — 한글/영문 자소 크기와 시각 중심선이 맞아 한 줄에 섞여도 흔들리지 않는다.
           system-ui 대체용으로 설계돼 Windows(맑은 고딕)·macOS(애플 SD 산돌고딕) 간 인상 차이도 사라진다.
     코드: JetBrains Mono — 큰 x-height 와 슬래시 제로(0/O 구분). 아래 CSS 에서 리거처는 끈다
           (=> 가 한 글자로 합쳐지면 SQL·경로를 읽는 초보자가 혼란스럽다). */
import 'pretendard/dist/web/variable/pretendardvariable.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/admin.css';

// v1.7.8: 앱을 그리기 전에 테마를 붙인다 — 마운트 후에 붙이면 밝은 화면이 한 번 번쩍인다
import { PREF_KEYS, readPref } from './utils/prefs';
document.documentElement.setAttribute(
  'data-bs-theme', readPref(PREF_KEYS.theme, 'light') === 'dark' ? 'dark' : 'light');
document.documentElement.setAttribute(
  'data-density', readPref(PREF_KEYS.density, 'comfortable'));

import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { installLeaveHint } from './utils/leaveHint';   // ★ v1.18.0

const app = createApp(App);
app.use(createPinia());

// 부팅 시 silent refresh — 쿠키만 있으면 자동 로그인
const auth = useAuthStore();
auth.silentRefresh().finally(async () => {
  // Resolve cookie authentication before the router's first requiresAuth guard.
  app.use(router);
  await router.isReady();
  app.mount('#app');
});

/* ★ v1.18.0 — 화면을 떠날 때 서버에 힌트를 보낸다 (신뢰하지 않고 참고만 쓰인다) */
installLeaveHint();
