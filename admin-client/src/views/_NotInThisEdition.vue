<!--
  _NotInThisEdition.vue — 공개판에서 엔터프라이즈 화면 자리를 대신한다.

  ★ v1.36.2 — 예전에는 빌드 뒤 그 화면 파일을 지웠다. 그러면 번들 안에
  깨진 참조가 남는다. 이제 빌드할 때 이 컴포넌트로 갈아 끼운다.

  메뉴는 서버 플래그로 이미 감춰져 있다. 이 화면은 주소를 직접 쳤을 때만 보인다.
-->
<template>
  <div class="p-5 text-center text-secondary">
    <i class="bi bi-lock display-6 d-block mb-3 opacity-50"></i>
    <p class="mb-1 fw-semibold">{{ t('edition.notIncluded') }}</p>
    <p class="small mb-3">{{ t('edition.contact') }}</p>
    <RouterLink to="/" class="btn btn-sm btn-outline-secondary">{{ t('edition.backHome') }}</RouterLink>
  </div>
</template>

<script setup>
import { useI18n } from '../composables/useI18n';
const { t } = useI18n();
</script>
