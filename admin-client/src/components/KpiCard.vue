<script setup>
defineProps({
  label:  { type: String, required: true },
  value:  { type: [String, Number], required: true },
  sub:    { type: String, default: '' },  // 보조 텍스트 (예: "12.3 / 16.0 GB")
  accent: { type: String, default: 'info' },
  icon:   { type: String, default: 'bi-activity' },
});
</script>

<template>
  <div class="col-6 col-md-4 col-lg-2">
    <div class="card kpi-card h-100" :class="`border-${accent}`">
      <div class="card-body py-2 px-3">
        <div class="small text-secondary d-flex align-items-center">
          <i class="bi" :class="icon"></i>
          <span class="ms-1">{{ label }}</span>
        </div>
        <div class="kpi-value" :class="`text-${accent}`">{{ value }}</div>
        <div v-if="sub" class="kpi-sub text-secondary">{{ sub }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-card .kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.15;
  margin-top: 4px;
  white-space: nowrap;
}
.kpi-card .kpi-sub {
  margin-top: 2px;
  line-height: 1.2;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
