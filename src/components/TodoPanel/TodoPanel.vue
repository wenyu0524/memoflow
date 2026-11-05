<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { Pencil, Trash2 } from '@lucide/vue';
import CircleCheckbox from '@/components/Checkbox/CircleCheckbox.vue';
import { useThemeStore } from '@/store/theme/themeStore';
import { useTodoStore } from '@/store/todo/todoStore';
import { insertPlainText, isBlankRichText, normalizeRichText } from '@/utils/richText/richText';

const todoStore = useTodoStore();
const settingsStore = useThemeStore();
const draftEditor = ref<HTMLElement | null>(null);
const draftEmpty = ref(true);
const itemEditors = new Map<string, HTMLElement>();
const editingId = ref<string | null>(null);
const editingSnapshot = ref('');

function setItemInput(id: string, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) {
    itemEditors.set(id, element);
    return;
  }

  itemEditors.delete(id);
}

async function addDraft() {
  const editor = draftEditor.value;
  const value = normalizeRichText(editor?.innerHTML ?? '');

  if (isBlankRichText(value)) {
    return;
  }

  await todoStore.add(value);
  if (editor) {
    editor.innerHTML = '';
  }
  draftEmpty.value = true;
  await nextTick();
  draftEditor.value?.focus();
}

async function startEditing(id: string, html: string) {
  if (settingsStore.settings?.editingLocked) {
    return;
  }

  editingId.value = id;
  editingSnapshot.value = html;
  await nextTick();
  const editor = itemEditors.get(id);
  if (editor) {
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

async function finishItem(id: string) {
  const html = itemEditors.get(id)?.innerHTML ?? '';
  editingId.value = null;
  await todoStore.updateTitle(id, html);
  await todoStore.cleanupBlank(id);
}

function toggleItem(id: string) {
  if (!settingsStore.settings?.editingLocked && editingId.value !== id) {
    void todoStore.toggle(id);
  }
}

function finishOnOutsideClick(event: PointerEvent) {
  if (!editingId.value || !(event.target instanceof Element)) return;
  const row = itemEditors.get(editingId.value)?.closest('.todo-row');
  if (row?.contains(event.target) || event.target.closest('.rich-toolbar')) return;
  void finishItem(editingId.value);
}

function cancelEditing(id: string) {
  const editor = itemEditors.get(id);

  if (editor) {
    editor.innerHTML = editingSnapshot.value;
  }

  editingId.value = null;
}

function updateDraftState() {
  draftEmpty.value = isBlankRichText(draftEditor.value?.innerHTML ?? '');
}

onMounted(async () => {
  document.addEventListener('pointerdown', finishOnOutsideClick, true);
  await nextTick();
  draftEditor.value?.focus();
});

onUnmounted(() => document.removeEventListener('pointerdown', finishOnOutsideClick, true));
</script>

<template>
  <section class="todo-panel" aria-labelledby="today-title">
    <header class="panel-head" data-tauri-drag-region>
      <h1 id="today-title">今日待办</h1>
      <span>{{ todoStore.remainingCount }} left</span>
    </header>

    <div class="todo-list" aria-label="今日待办">
      <div v-for="item in todoStore.items" :key="item.id" class="todo-row" :class="{ done: item.completed, editing: editingId === item.id }" @click="toggleItem(item.id)">
        <span class="todo-icon-cell">
          <CircleCheckbox
            :checked="item.completed"
            :disabled="settingsStore.settings?.editingLocked ?? false"
            @click.stop
            @toggle="toggleItem(item.id)"
          />
        </span>
        <div
          :ref="(element) => setItemInput(item.id, element)"
          class="rich-line"
          data-rich-editor
          :data-locked="settingsStore.settings?.editingLocked || editingId !== item.id ? 'true' : 'false'"
          :contenteditable="!settingsStore.settings?.editingLocked && editingId === item.id ? 'true' : 'false'"
          spellcheck="false"
          aria-label="待办内容"
          v-html="item.title"
          @paste="insertPlainText"
          @keydown.enter.prevent="finishItem(item.id)"
          @keydown.esc.prevent="cancelEditing(item.id)"
        />

        <div v-if="!settingsStore.settings?.editingLocked" class="row-actions" aria-label="待办操作">
          <button type="button" aria-label="编辑" title="编辑" @click.stop="startEditing(item.id, item.title)">
            <Pencil :size="13" />
          </button>
          <button type="button" aria-label="删除" title="删除" @click.stop="todoStore.remove(item.id)">
            <Trash2 :size="13" />
          </button>
        </div>
      </div>

      <label class="todo-row todo-draft">
        <span class="todo-icon-cell">
          <span class="draft-dot" aria-hidden="true" />
        </span>
        <div
          ref="draftEditor"
          class="rich-line draft-editor"
          data-rich-editor
          :data-empty="draftEmpty ? 'true' : 'false'"
          :data-locked="settingsStore.settings?.editingLocked ? 'true' : 'false'"
          :contenteditable="settingsStore.settings?.editingLocked ? 'false' : 'true'"
          spellcheck="false"
          aria-label="新增今日待办"
          @input="updateDraftState"
          @blur="addDraft"
          @paste="insertPlainText"
          @keydown.enter.prevent="addDraft"
        />
      </label>
    </div>
  </section>
</template>

<style scoped>
.todo-panel {
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
  min-height: 0;
  padding: 18px 28px 28px 30px;
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
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

.todo-list {
  display: grid;
  align-content: start;
  gap: 13px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.todo-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  position: relative;
  align-items: center;
  gap: 11px;
  min-height: 24px;
}

.todo-row.editing {
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  box-shadow: inset 3px 0 var(--color-primary);
}

.todo-icon-cell {
  display: flex;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.rich-line {
  width: 100%;
  min-width: 0;
  min-height: 23px;
  padding-right: 56px;
  border: 0;
  outline: 0;
  color: var(--color-text);
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.45;
  word-break: break-word;
}

.todo-row.done .rich-line {
  color: var(--color-completed);
  text-decoration: line-through;
  opacity: 0.7;
  transition:
    color 150ms ease,
    opacity 150ms ease,
    text-decoration-color 150ms ease;
}

.draft-dot {
  width: 18px;
  height: 18px;
  border: 1.4px dashed var(--color-line);
  border-radius: 50%;
  opacity: 0.72;
}

.draft-editor[data-empty='true']::before {
  color: var(--color-muted);
  content: '添加今日事项...';
  opacity: 0.72;
}

.rich-line[contenteditable='false'] {
  cursor: default;
}

.row-actions {
  position: absolute;
  right: 0;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 150ms ease;
}

.todo-row:hover .row-actions,
.todo-row:focus-within .row-actions {
  opacity: 1;
}

.row-actions button {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  color: var(--color-muted);
  background: var(--color-control);
  cursor: pointer;
}

.row-actions button:hover {
  color: var(--color-text);
  background: var(--color-control-hover);
}
</style>
