<script setup>
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다 */
const { t } = useI18n();

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  windowSize: { type: Number, default: 10 },
});
const emit = defineEmits(['update:page']);

const window = computed(() => {
  const ws = props.windowSize;
  const total = Math.max(1, props.totalPages);
  const blockIndex = Math.floor((props.page - 1) / ws);
  const start = blockIndex * ws + 1;
  const end = Math.min(start + ws - 1, total);
  const nums = [];
  for (let i = start; i <= end; i++) nums.push(i);
  return { start, end, nums, total, hasPrevBlock: start > 1, hasNextBlock: end < total };
});

function go(p) {
  if (p < 1 || p > window.value.total || p === props.page) return;
  emit('update:page', p);
}
</script>

<template>
  <nav :aria-label="t('pagination.k1')" class="circ-pager">
    <ul class="pagination pagination-sm justify-content-center mb-0">
      <li class="page-item" :class="{ disabled: page === 1 }">
        <button class="page-link" @click="go(1)" :title="t('pagination.k2')"><i class="bi bi-chevron-double-left"></i></button>
      </li>
      <li class="page-item" :class="{ disabled: !window.hasPrevBlock }">
        <button class="page-link" @click="go(window.start - 1)" :title="t('pagination.k3')"><i class="bi bi-chevron-left"></i></button>
      </li>
      <li v-for="n in window.nums" :key="n" class="page-item" :class="{ active: n === page }">
        <button class="page-link" @click="go(n)">{{ n }}</button>
      </li>
      <li class="page-item" :class="{ disabled: !window.hasNextBlock }">
        <button class="page-link" @click="go(window.end + 1)" :title="t('pagination.k4')"><i class="bi bi-chevron-right"></i></button>
      </li>
      <li class="page-item" :class="{ disabled: page === window.total }">
        <button class="page-link" @click="go(window.total)" :title="t('pagination.k5')"><i class="bi bi-chevron-double-right"></i></button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
/* 원형 페이지네이션 — 번호/이전·이후/맨앞·맨뒤 버튼을 동그랗게 + 가로 간격 */
.circ-pager .pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;                 /* 각 버튼 사이 가로 간격 */
}

/* Bootstrap 이 붙이는 연결용 음수 마진/모서리 처리 제거 */
.circ-pager .page-item { margin: 0; }
.circ-pager .page-item:not(:first-child) .page-link { margin-left: 0; }

.circ-pager .page-link {
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;       /* 원형 */
  border: 1px solid #d8dee6;
  background: #fff;
  color: #334155;
  font-size: 13px;
  line-height: 1;
  transition: background-color .12s, color .12s, border-color .12s, transform .12s, box-shadow .12s;
}
.circ-pager .page-link:hover {
  background: #e9f7f0;
  border-color: #1AA463;
  color: #0f5132;
  transform: translateY(-1px);
}
.circ-pager .page-link:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(26, 164, 99, 0.18);
}

/* 현재 페이지 — 브랜드 그린 채움 */
.circ-pager .page-item.active .page-link {
  background: linear-gradient(135deg, #1AA463 0%, #137A4A 100%);
  border-color: #137A4A;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(19, 122, 74, 0.30);
}
.circ-pager .page-item.active .page-link:hover { transform: none; }

/* 비활성(맨앞에서 이전 등) */
.circ-pager .page-item.disabled .page-link {
  background: #f3f5f8;
  border-color: #e5e9ef;
  color: #b6c0cc;
  pointer-events: none;
  box-shadow: none;
  transform: none;
}

.circ-pager .page-link .bi { font-size: 13px; }
</style>
