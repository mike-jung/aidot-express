<script setup>
/**
 * ResourcePicker — 리소스 선택 대화상자 (검색 + 페이지네이션 + 선택/해제).
 *
 *  Props:
 *    title: '대화상자 제목'
 *    items: [{ id, name, description?, ... }]
 *    selected: ['id1', 'id2']    — 이미 선택된 id 목록
 *    nameKey: 'name'             — 검색/표시에 사용할 키
 *    descKey: 'description'      — 설명 표시 키 (선택)
 *    extraKeys: ['table_name']   — 추가 표시 컬럼 (선택)
 *    multiple: true              — 다중 선택 가능 (false 면 단일)
 *
 *  Events:
 *    select(item)   — 항목 선택됨
 *    deselect(item) — 항목 선택 해제
 *    close          — 닫기
 */
import { ref, computed, watch } from 'vue';
import Pagination from './Pagination.vue';
import { useDraggable } from '../composables/useDraggable';

const { modalRef, headerRef } = useDraggable();

const props = defineProps({
  title: { type: String, default: '선택' },
  items: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  nameKey: { type: String, default: 'name' },
  descKey: { type: String, default: 'description' },
  extraKeys: { type: Array, default: () => [] },
  multiple: { type: Boolean, default: true },
});
const emit = defineEmits(['select', 'deselect', 'close']);

const search = ref('');
const page = ref(1);
const PER_PAGE = 8;

const selectedSet = computed(() => new Set(props.selected));

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.items;
  return props.items.filter((item) => {
    const hay = [item[props.nameKey], item[props.descKey], ...(props.extraKeys.map(k => item[k]))]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PER_PAGE)));
const paged = computed(() => {
  const start = (page.value - 1) * PER_PAGE;
  return filtered.value.slice(start, start + PER_PAGE);
});

function isSelected(item) {
  return selectedSet.value.has(item.id || item[props.nameKey]);
}

function toggle(item) {
  const key = item.id || item[props.nameKey];
  if (isSelected(item)) {
    emit('deselect', item);
  } else {
    emit('select', item);
  }
}

// 검색 바뀌면 1페이지로
// 검색 바뀌면 1페이지로
watch(search, () => { page.value = 1; });
</script>

<template>
  <div class="app-modal-backdrop" @mousedown.self="$emit('close')" style="z-index:1060">
    <div ref="modalRef" class="app-modal" style="max-width:600px">
      <div ref="headerRef" class="modal-header">
        <h6 class="mb-0"><i class="bi bi-search me-2"></i>{{ title }}</h6>
        <button class="btn-close btn-sm" @click="$emit('close')"></button>
      </div>
      <div class="modal-body" style="max-height:500px; overflow-y:auto">
        <!-- 검색 -->
        <input v-model="search" type="text" class="form-control form-control-sm mb-2"
               placeholder="이름 또는 설명으로 검색..." autofocus />

        <!-- 선택됨 표시 -->
        <div v-if="selected.length" class="mb-2 d-flex flex-wrap gap-1">
          <span class="small text-secondary me-1">선택됨:</span>
          <span v-for="s in selected" :key="s" class="badge bg-primary">{{ s }}</span>
        </div>

        <!-- 목록 -->
        <div v-if="paged.length === 0" class="text-center text-secondary small py-3">
          {{ search ? '검색 결과가 없습니다.' : '항목이 없습니다.' }}
        </div>

        <div v-for="item in paged" :key="item.id || item[nameKey]"
             class="d-flex align-items-center py-2 px-2 border-bottom"
             style="cursor:pointer; transition: background 0.1s"
             :style="isSelected(item) ? 'background:#e8f0fe' : ''"
             @click="toggle(item)">
          <i :class="isSelected(item) ? 'bi-check-square-fill text-primary' : 'bi-square text-secondary'"
             class="bi me-2 fs-5"></i>
          <div class="flex-grow-1">
            <div class="small fw-bold">{{ item[nameKey] }}</div>
            <div v-if="item[descKey]" class="small text-secondary">{{ item[descKey] }}</div>
            <div v-if="extraKeys.length" class="small text-secondary">
              <span v-for="k in extraKeys" :key="k" class="me-2">
                <small class="text-muted">{{ k }}:</small> {{ item[k] || '-' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 페이지네이션 -->
        <div v-if="totalPages > 1" class="mt-2">
          <Pagination v-model:page="page" :total-pages="totalPages" :window-size="10" />
        </div>
      </div>
      <div class="modal-footer">
        <small class="text-secondary me-auto">{{ filtered.length }}개 중 {{ selected.length }}개 선택</small>
        <button class="btn btn-sm btn-primary" @click="$emit('close')">확인</button>
      </div>
    </div>
  </div>
</template>
