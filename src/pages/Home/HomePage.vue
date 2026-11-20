<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import PetPage from '@/pages/Pet/PetPage.vue';
import GlassCard from '@/components/GlassCard/GlassCard.vue';
import MemoPanel from '@/components/MemoPanel/MemoPanel.vue';
import RichTextToolbar from '@/components/RichTextToolbar/RichTextToolbar.vue';
import SaveToast from '@/components/SaveToast/SaveToast.vue';
import TodoPanel from '@/components/TodoPanel/TodoPanel.vue';
import WindowBar from '@/components/WindowBar/WindowBar.vue';
import StorageNotice from '@/components/Settings/StorageNotice.vue';
import { usePetSettingsStore } from '@/store/pet/petSettingsStore';
import { flushEditors } from '@/utils/storage/editorFlush';
import { flushPendingWrites } from '@/utils/storage/jsonStorage';
import { waitForWindowPaint } from '@/utils/window/ready';
import { useMemoStore } from '@/store/memo/memoStore';
import { useThemeStore } from '@/store/theme/themeStore';
import { useTodoStore } from '@/store/todo/todoStore';
import { usePetStore } from '@/store/pet/petStore';
import { isTauriRuntime } from '@/utils/environment/isTauri';
import { watchSystemTheme } from '@/utils/theme/applyTheme';
import { bindTrayWindowEvents, initializeWindowBehavior } from '@/utils/window/windowLifecycle';

const memoStore = useMemoStore();
const themeStore = useThemeStore();
const todoStore = useTodoStore();
const petStore = usePetStore();
const petSettings = usePetSettingsStore();
const startupError = ref('');
const initializing = ref(true);
let disposed = false;
let stopExit: (() => void) | undefined;
const native = isTauriRuntime();
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
let stopPetEvents: (() => void) | undefined;

async function togglePinnedFromTray() {
  await themeStore.setAlwaysOnTop(!(themeStore.settings?.alwaysOnTop ?? false));
  await initializeWindowBehavior(themeStore.settings);
}

async function toggleLockedFromTray() {
  await themeStore.setEditingLocked(!(themeStore.settings?.editingLocked ?? false));
  await initializeWindowBehavior(themeStore.settings);
}

async function loadMain() {
  initializing.value = true; startupError.value = '';
  try {
    const results = await Promise.allSettled([themeStore.hydrate(), todoStore.hydrate(), memoStore.hydrate(), petStore.hydrate(), petSettings.hydrate()]);
    if (results.some(result => result.status === 'rejected')) throw new Error('Data initialization failed');
    if (disposed) return;
    stopThemeWatcher?.(); stopThemeWatcher = watchSystemTheme(() => themeStore.mode);
    await initializeWindowBehavior(themeStore.settings);
    await petStore.setVisible(petSettings.values.autoStart);
  } catch { if (!disposed) startupError.value = '数据读取失败，已暂停编辑以保护原文件。检查备份后可重试。'; }
  finally {
    initializing.value = false;
    await nextTick();
    await waitForWindowPaint();
    if (native && !disposed) {
      try { await invoke('complete_main_startup'); }
      catch { startupError.value = '窗口初始化失败，请重新启动应用。'; }
    }
  }
}
onMounted(async () => {
  if (native) {
    stopPetEvents = await listen<boolean>('pet-visibility-changed', ({ payload }) => {
      petStore.visible = payload;
    });
    stopExit = await listen('prepare-exit', async () => {
      try {
        await flushEditors(); await flushPendingWrites(); await invoke('exit_after_save');
      } catch { await invoke('open_main_window'); }
    });
  }
  await loadMain();
  if (disposed) return;
  stopTrayEvents = await bindTrayWindowEvents({
    togglePinned: togglePinnedFromTray,
    toggleLocked: toggleLockedFromTray,
  });
});

onUnmounted(() => {
  disposed = true; stopExit?.();
  stopThemeWatcher?.();
  stopTrayEvents?.();
  stopPetEvents?.();
});
</script>

<template>
  <main
    class="app-shell"
    aria-label="MemoFlow"
  >
    <RichTextToolbar />
    <SaveToast />
    <StorageNotice />
    <GlassCard :inert="initializing || !!startupError">
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
    <aside v-if="startupError" class="startup-error" role="alert">{{ startupError }} <button type="button" @click="loadMain">重试读取</button></aside>
  </main>
  <div v-if="!native && petStore.visible" class="pet-preview-overlay">
    <PetPage />
  </div>
</template>

<style scoped>
.startup-error { position: fixed; z-index: 90; inset: 60px 20px auto; padding: 16px; border: 1px solid #d4b18a; border-radius: 12px; color: #6b4727; background: #fff6e7; font-size: 13px; }
.startup-error button { margin-left: 8px; padding: 5px 10px; border-radius: 6px; cursor: pointer; }
.pet-preview-overlay { position: fixed; right: 16px; bottom: 12px; width: 200px; height: 240px; z-index: 20; pointer-events: none; }
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
