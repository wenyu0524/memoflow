<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import GlassCard from '@/components/GlassCard/GlassCard.vue';
import MemoPanel from '@/components/MemoPanel/MemoPanel.vue';
import RichTextToolbar from '@/components/RichTextToolbar/RichTextToolbar.vue';
import SaveToast from '@/components/SaveToast/SaveToast.vue';
import TodoPanel from '@/components/TodoPanel/TodoPanel.vue';
import WindowBar from '@/components/WindowBar/WindowBar.vue';
import { useMemoStore } from '@/store/memo/memoStore';
import { useThemeStore } from '@/store/theme/themeStore';
import { useTodoStore } from '@/store/todo/todoStore';
import { watchSystemTheme } from '@/utils/theme/applyTheme';
import { bindTrayWindowEvents, initializeWindowBehavior } from '@/utils/window/windowLifecycle';

const memoStore = useMemoStore();
const themeStore = useThemeStore();
const todoStore = useTodoStore();
const memoOpen = ref(false);
const todoWidth = ref(65);
const layout = ref<HTMLElement | null>(null);
const resizing = ref(false);

function resizePanels(event: PointerEvent) {
  if (!resizing.value || !layout.value) return;
  const rect = layout.value.getBoundingClientRect();
  const available = rect.width - 10;
  const width = Math.max(180, Math.min(available - 160, event.clientX - rect.left - 5));
  todoWidth.value = width / available * 100;
}

function startResize(event: PointerEvent) {
  if (themeStore.settings?.editingLocked || event.button !== 0) return;
  resizing.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  event.preventDefault();
}

function stopResize() {
  resizing.value = false;
}

function resizeWithKeyboard(event: KeyboardEvent) {
  if (themeStore.settings?.editingLocked || !layout.value) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  const available = layout.value.clientWidth - 10;
  todoWidth.value = Math.max(180 / available * 100, Math.min((available - 160) / available * 100,
    todoWidth.value + (event.key === 'ArrowLeft' ? -2 : 2)));
}

let stopThemeWatcher: (() => void) | undefined;
let stopTrayEvents: (() => void) | undefined;

async function togglePinnedFromTray() {
  await themeStore.setAlwaysOnTop(!(themeStore.settings?.alwaysOnTop ?? false));
  await initializeWindowBehavior(themeStore.settings);
}

async function toggleLockedFromTray() {
  await themeStore.setEditingLocked(!(themeStore.settings?.editingLocked ?? false));
  await initializeWindowBehavior(themeStore.settings);
}

onMounted(async () => {
  await Promise.all([
    themeStore.hydrate(),
    todoStore.hydrate(),
    memoStore.hydrate(),
  ]);

  stopThemeWatcher = watchSystemTheme(() => themeStore.mode);
  await initializeWindowBehavior(themeStore.settings);
  stopTrayEvents = await bindTrayWindowEvents({
    togglePinned: togglePinnedFromTray,
    toggleLocked: toggleLockedFromTray,
  });
});

onUnmounted(() => {
  stopThemeWatcher?.();
  stopTrayEvents?.();
});
</script>

<template>
  <main
    class="app-shell"
    aria-label="MemoFlow"
  >
    <RichTextToolbar />
    <SaveToast />
    <GlassCard>
      <WindowBar>
        <button class="memo-toggle" type="button" :aria-expanded="memoOpen" aria-controls="memo-pane" @click="memoOpen = !memoOpen">
          {{ memoOpen ? '收起备忘录' : '备忘录' }}
        </button>
      </WindowBar>
      <div ref="layout" class="two-column-layout" :class="{ 'memo-open': memoOpen, resizing }" :style="{ '--todo-width': `${todoWidth}fr`, '--memo-width': `${100 - todoWidth}fr` }">
        <TodoPanel />
        <div v-if="memoOpen" class="panel-divider" role="separator" aria-label="调整待办与备忘录宽度" aria-orientation="vertical" :aria-valuenow="Math.round(todoWidth)" :aria-valuemin="0" :aria-valuemax="100" :tabindex="themeStore.settings?.editingLocked ? -1 : 0" @pointerdown="startResize" @pointermove="resizePanels" @pointerup="stopResize" @pointercancel="stopResize" @lostpointercapture="stopResize" @keydown="resizeWithKeyboard" />
        <MemoPanel v-show="memoOpen" id="memo-pane" />
      </div>
    </GlassCard>
  </main>
</template>

<style scoped>
.app-shell {
  position: relative;
  display: flex;
  width: 100vw;
  height: 100vh;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 8px;
  background: transparent;
}

.two-column-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  flex: 1;
  width: 100%;
  min-height: 0;
}

.two-column-layout.memo-open {
  grid-template-columns: minmax(180px, var(--todo-width)) 10px minmax(160px, var(--memo-width));
}

.panel-divider {
  position: relative;
  margin: 22px 0 26px;
  cursor: col-resize;
  touch-action: none;
}

.panel-divider::before {
  position: absolute;
  inset: 0 4px;
  background: var(--color-divider);
  content: '';
}

.panel-divider:hover::before,
.panel-divider:focus-visible::before,
.resizing .panel-divider::before {
  background: var(--color-primary);
}

.resizing {
  user-select: none;
}

.memo-toggle {
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  color: var(--color-muted);
  background: var(--color-control);
  font-size: 12px;
  cursor: pointer;
}
</style>
