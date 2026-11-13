<script setup lang="ts">
import { computed } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Lock, Maximize2, Pin, PinOff, Unlock, X } from '@lucide/vue';
import { useThemeStore } from '@/store/theme/themeStore';
import { usePetStore } from '@/store/pet/petStore';
import { isTauriRuntime } from '@/utils/environment/isTauri';

const settingsStore = useThemeStore();
const petStore = usePetStore();

const pinned = computed(() => settingsStore.settings?.alwaysOnTop ?? false);
const locked = computed(() => settingsStore.settings?.editingLocked ?? false);

async function applyWindowState() {
  if (!isTauriRuntime()) {
    return;
  }

  const appWindow = getCurrentWindow();

  await appWindow.setAlwaysOnTop(pinned.value);
  await appWindow.setResizable(!locked.value);
}

async function togglePinned() {
  await settingsStore.setAlwaysOnTop(!pinned.value);
  await applyWindowState();
}

async function toggleLocked() {
  await settingsStore.setEditingLocked(!locked.value);
  await applyWindowState();
}

async function closeWindow() {
  if (isTauriRuntime()) {
    await getCurrentWindow().close();
  }
}

async function toggleMaximize() {
  if (!locked.value && isTauriRuntime()) {
    await getCurrentWindow().toggleMaximize();
  }
}
</script>

<template>
  <header class="window-bar">
    <div class="drag-zone" :data-tauri-drag-region="locked ? null : ''" />

    <div class="window-actions" aria-label="窗口操作">
      <slot />
      <button class="pet-control" type="button" :class="{ active: petStore.visible }" :aria-pressed="petStore.visible" :aria-label="petStore.visible ? '隐藏桌宠' : '显示桌宠'" :title="petStore.visible ? '隐藏桌宠' : '显示桌宠'" :disabled="petStore.busy" @click="petStore.setVisible(!petStore.visible)">桌宠</button>
      <button v-if="!locked" type="button" title="最大化/还原" aria-label="最大化/还原" @click="toggleMaximize">
        <Maximize2 :size="15" />
      </button>
      <button
        type="button"
        :class="{ active: pinned }"
        :aria-pressed="pinned"
        :title="pinned ? '取消置顶' : '置顶'"
        @click="togglePinned"
      >
        <PinOff v-if="pinned" :size="15" />
        <Pin v-else :size="15" />
      </button>

      <button
        type="button"
        :class="{ active: locked }"
        :aria-pressed="locked"
        :title="locked ? '解除锁定' : '锁定'"
        @click="toggleLocked"
      >
        <Lock v-if="locked" :size="15" />
        <Unlock v-else :size="15" />
      </button>

      <button v-if="!locked" type="button" title="关闭到托盘" aria-label="关闭到托盘" @click="closeWindow">
        <X :size="15" />
      </button>
    </div>
    <p v-if="petStore.error" class="pet-control-error" role="alert">{{ petStore.error }}</p>
  </header>
</template>

<style scoped>
.window-bar {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  height: 40px;
  padding: 6px 10px 6px 18px;
  user-select: none;
}

.pet-control { width: auto; min-width: 44px; padding: 0 8px; border-radius: 8px; font-size: 12px; }
.pet-control:disabled { cursor: wait; opacity: .6; }
.pet-control-error { position: absolute; z-index: 15; right: 12px; top: 30px; padding: 8px 12px; border-radius: 8px; background: var(--color-glass); color: var(--color-text); box-shadow: 0 3px 12px #0002; font-size: 12px; }

.drag-zone {
  height: 100%;
  cursor: grab;
}

.drag-zone:active {
  cursor: grabbing;
}

.window-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--color-control-border);
  border-radius: 999px;
  color: var(--color-muted);
  background: var(--color-control);
  cursor: pointer;
}

button:hover {
  color: var(--color-text);
  background: var(--color-control-hover);
}

button.active {
  color: white;
  border-color: rgba(108, 142, 255, 0.55);
  background: var(--color-primary);
}
</style>

