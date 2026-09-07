<script setup>
/**
 * ToastContainer — toasts store 의 items 를 화면 우상단에 띄움.
 *   App.vue 또는 MainLayout 에 한 번만 마운트.
 *
 * Bootstrap 의 `.toast-container` + `.toast` class 를 활용 — 커스텀 CSS 최소.
 */
import { useToastStore } from '../stores/toasts';

const store = useToastStore();

function typeInfo(type) {
  switch (type) {
    case 'success': return { bg: 'text-bg-success', icon: 'bi-check-circle-fill' };
    case 'error':   return { bg: 'text-bg-danger',  icon: 'bi-x-octagon-fill' };
    case 'warning': return { bg: 'text-bg-warning', icon: 'bi-exclamation-triangle-fill' };
    case 'info':
    default:        return { bg: 'text-bg-info',    icon: 'bi-info-circle-fill' };
  }
}
</script>

<template>
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1080;">
    <div v-for="t in store.items" :key="t.id"
         class="toast show mb-2 shadow"
         :class="typeInfo(t.type).bg"
         role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <i class="bi me-2" :class="typeInfo(t.type).icon"></i>
        <strong class="me-auto">{{ t.title || '알림' }}</strong>
        <button type="button" class="btn-close" @click="store.remove(t.id)"></button>
      </div>
      <div v-if="t.message" class="toast-body">{{ t.message }}</div>
    </div>
  </div>
</template>
