<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

const props = defineProps({
  modelValue: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  language: { type: String, default: 'javascript' }, // 'javascript' | 'sql'
});
const emit = defineEmits(['update:modelValue']);

const containerRef = ref(null);
let view = null;
let internalChange = false;

function langExt(lang) {
  return lang === 'sql' ? sql() : javascript();
}

function makeState(doc) {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      history(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      langExt(props.language),
      oneDark,
      EditorView.editable.of(!props.readonly),
      EditorState.readOnly.of(props.readonly),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && !internalChange) {
          emit('update:modelValue', u.state.doc.toString());
        }
      }),
    ],
  });
}

onMounted(() => {
  view = new EditorView({
    state: makeState(props.modelValue ?? ''),
    parent: containerRef.value,
  });
});

watch(() => props.modelValue, (val) => {
  if (!view) return;
  const cur = view.state.doc.toString();
  if (val !== cur) {
    internalChange = true;
    view.dispatch({
      changes: { from: 0, to: cur.length, insert: val ?? '' },
    });
    internalChange = false;
  }
});

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});
</script>

<template>
  <div ref="containerRef" class="code-editor"></div>
</template>
