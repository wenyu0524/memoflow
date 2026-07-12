<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useMemoStore } from '@/store/memo/memoStore';
import { useThemeStore } from '@/store/theme/themeStore';
import { debounce } from '@/utils/function/debounce';
import { insertPlainText, normalizeRichText } from '@/utils/richText/richText';

const memoStore = useMemoStore();
const settingsStore = useThemeStore();
const editor = ref<HTMLElement | null>(null);

const statusText = computed(() => (memoStore.document.updatedAt ? '已保存' : '自动保存'));

const saveMemo = debounce((value: string) => {
  void memoStore.updateContent(value);
}, 180);

watch(
  () => memoStore.document.content,
  async (value) => {
    await nextTick();

    if (editor.value && editor.value.innerHTML !== value) {
      editor.value.innerHTML = value;
    }
  },
  { immediate: true },
);

function updateMemo(event: Event) {
  if (!(event.currentTarget instanceof HTMLElement)) {
    return;
  }

  saveMemo(normalizeRichText(event.currentTarget.innerHTML));
}
</script>

<template>
  <section class="memo-panel" aria-labelledby="memo-title">
    <header class="panel-head" data-tauri-drag-region>
      <h1 id="memo-title">备忘录</h1>
      <span>{{ statusText }}</span>
    </header>

    <div
      ref="editor"
      class="memo-editor"
      data-rich-editor
      :data-locked="settingsStore.settings?.editingLocked ? 'true' : 'false'"
      :contenteditable="settingsStore.settings?.editingLocked ? 'false' : 'true'"
      spellcheck="false"
      aria-label="备忘录"
      data-placeholder="写点什么..."
      @input="updateMemo"
      @paste="insertPlainText"
    />
  </section>
</template>

<style scoped>
.memo-panel {
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
  min-height: 0;
  padding: 18px 30px 28px 28px;
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  user-select: none;
}

h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
}

.panel-head span {
  color: var(--color-muted);
  font-size: 12px;
}

.memo-editor {
  width: 100%;
  min-width: 0;
  min-height: 0;
  padding: 0 3px 0 0;
  border: 0;
  outline: 0;
  color: var(--color-text);
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.62;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.memo-editor:empty::before {
  color: var(--color-muted);
  content: attr(data-placeholder);
  opacity: 0.72;
}

.memo-editor[contenteditable='false'] {
  cursor: default;
}
</style>
