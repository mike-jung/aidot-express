<script setup>
/**
 * ScaffoldBar — 「출처를 고르면 기본 뼈대를 만들어 주는 줄」. (v1.10.29)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  왜 만들었는가
 * ══════════════════════════════════════════════════════════════════════════
 *  SQL·서비스·컨트롤러 세 화면이 **같은 일**(기본 뼈대 채우기)을 하는데
 *  방식이 셋 다 달랐습니다.
 *
 *    SQL      [5개 기본 쿼리 추가 생성] 버튼   · 테이블명을 근거로
 *    서비스    watch() 로 **자동**            · 고른 SQL 파일을 근거로
 *    컨트롤러  [5개 기본 라우트 자동 생성] 버튼 · 근거 없이 고정 5개
 *
 *  서비스만 자동이라 놀랍습니다 — SQL 파일을 골랐을 뿐인데 5줄이 생기고,
 *  이미 손으로 넣어 둔 것이 있으면 무슨 일이 벌어지는지 알 수 없습니다.
 *
 *  업계 진단도 같습니다: *"비슷한 동작에 서로 다른 상호작용 방식 →
 *  사용자는 매번 다시 배워야 하고 멘탈 모델이 깨진다."*
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  정한 것
 * ══════════════════════════════════════════════════════════════════════════
 *  ① **버튼으로 통일.** 클릭 한 번을 아끼려다 "내가 뭘 눌렀지" 를 만드는 건
 *     남는 장사가 아닙니다. 특히 이미 채워 둔 항목을 덮어쓸 때 위험합니다.
 *  ② **출처 바로 아래**에 둡니다 — 방금 적은 것이 근거이니 그 자리가 자연스럽습니다.
 *  ③ **꺼진 이유를 말합니다.** 이유 없이 꺼진 버튼은 "고장 났나" 로 읽힙니다.
 *  ④ **덮어쓰지 않고 뒤에 더합니다.** 지우는 것은 되돌릴 수 없고,
 *     사용자가 손으로 넣은 것일 수 있습니다. (동작은 그대로 — 안내 문구만 뺐습니다)
 *
 *  ⚠ 문구의 "5개" 는 실제로 5개가 만들어지는 화면에서만 씁니다.
 */
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();

const props = defineProps({
  /** 버튼 문구 (예: '기본 5개 만들기') */
  label: { type: String, required: true },
  /** 출처 값 — 비어 있으면 버튼이 꺼집니다 */
  source: { type: [String, Number, Object], default: '' },
  /** 출처가 비었을 때 보여 줄 이유 (예: '테이블명을 먼저 적으세요') */
  emptyHint: { type: String, default: '' },
  /** 출처가 있을 때의 설명 (예: 'snack 테이블의 컬럼으로 채웁니다') */
  readyHint: { type: String, default: '' },
  /** 이미 들어 있는 항목 수 (지금은 표시에 쓰지 않습니다 — 목록에 그대로 보이므로) */
  existing: { type: Number, default: 0 },
  /** 만드는 중 */
  busy: { type: Boolean, default: false },
});

const emit = defineEmits(['generate']);

const hasSource = computed(() => {
  const s = props.source;
  if (s == null) return false;
  if (typeof s === 'string') return s.trim() !== '';
  if (typeof s === 'object') return Object.keys(s).length > 0;
  return true;
});

/** 옆에 붙는 설명 — 무엇을 근거로 만드는지만 알려 줍니다.
    (예전에는 "이미 3개가 있습니다 — 뒤에 더합니다" 를 덧붙였는데,
     이미 있는 것은 바로 아래 목록에 보이므로 같은 말을 두 번 하는 셈이었습니다.
     이제 세 화면 모두 빈 목록에서 시작하므로 더 그렇습니다.) */
const hint = computed(() => (hasSource.value ? props.readyHint : props.emptyHint));
</script>

<template>
  <div class="scaffold-bar">
    <button type="button" class="btn btn-sm btn-outline-primary"
            :disabled="!hasSource || busy"
            @click="emit('generate')">
      <i class="bi me-1" :class="busy ? 'bi-hourglass-split' : 'bi-magic'"></i>{{ label }}
    </button>
    <!-- 꺼진 이유든 켜진 안내든, 항상 무슨 일이 일어날지 말해 준다 -->
    <span class="hint" :class="{ muted: !hasSource }">{{ hint }}</span>
  </div>
</template>

<style scoped>
.scaffold-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin: 2px 0 12px;
}
.scaffold-bar .hint {
  font-size: .78rem; color: var(--ax-text-muted, #6b7280);
}
/* 꺼져 있을 때는 더 옅게 — 지금은 못 누른다는 것이 한눈에 보이게 */
.scaffold-bar .hint.muted { opacity: .75; font-style: italic; }
</style>
