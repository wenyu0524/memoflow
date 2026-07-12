<script setup lang="ts">
import { motion } from 'motion-v';
import { onMounted, onUnmounted } from 'vue';
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
  <motion.main
    class="app-shell"
    aria-label="MemoFlow"
    :initial="{ opacity: 0, scale: 0.985 }"
    :animate="{ opacity: 1, scale: 1 }"
    :transition="{ duration: 0.18, ease: 'easeOut' }"
  >
    <RichTextToolbar />
    <SaveToast />
    <GlassCard>
      <WindowBar />
      <div class="two-column-layout">
        <TodoPanel />
        <MemoPanel />
      </div>
    </GlassCard>
  </motion.main>
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
}

.two-column-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
  flex: 1;
  width: 100%;
  min-height: 0;
}

.two-column-layout::before {
  position: absolute;
  top: 22px;
  bottom: 26px;
  left: 47%;
  width: 1px;
  background: var(--color-divider);
  content: '';
}

.two-column-layout > :first-child {
  grid-column: 1;
  grid-row: 1;
}

.two-column-layout > :last-child {
  grid-column: 2;
  grid-row: 1;
}
</style>
