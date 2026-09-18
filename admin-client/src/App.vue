<script setup>
import { watch } from 'vue';
import { RouterView, useRouter, useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
watch(() => auth.isLoggedIn, loggedIn => {
  if (!loggedIn && route.meta.requiresAuth) {
    router.replace({ name: 'login', query: {
      redirect: route.fullPath,
      ...(auth.sessionExpired ? { reason: 'expired' } : {}),
    } });
  }
});
</script>

<template>
  <RouterView />
</template>
