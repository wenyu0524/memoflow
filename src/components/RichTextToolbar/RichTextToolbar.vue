<script setup lang="ts">
import { Bold, ChevronDown } from '@lucide/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const visible = ref(false);
const top = ref(0);
const left = ref(0);
const currentFontSize = ref(16);
const activeEditor = ref<HTMLElement | null>(null);
const toolbarRef = ref<HTMLElement | null>(null);
const fontMenuOpen = ref(false);
const colors = ['#1F2937', '#DC2626', '#D97706'];
const fontSizes = [12, 14, 16, 18, 20, 22, 24, 28, 32];

const canDecrease = computed(() => currentFontSize.value > fontSizes[0]);
const canIncrease = computed(() => currentFontSize.value < fontSizes[fontSizes.length - 1]);

function findEditor(node: Node | null) {
  if (!node) {
    return null;
  }

  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

  return element instanceof HTMLElement ? element.closest<HTMLElement>('[data-rich-editor]') : null;
}

function resolveFontSize(node: Node | null) {
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;

  if (!(element instanceof HTMLElement)) {
    return 16;
  }

  const rawSize = Number.parseFloat(getComputedStyle(element).fontSize);

  return fontSizes.reduce((closest, size) =>
    Math.abs(size - rawSize) < Math.abs(closest - rawSize) ? size : closest,
  );
}

function updatePosition() {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    visible.value = false;
    fontMenuOpen.value = false;
    activeEditor.value = null;
    return;
  }

  const editor = findEditor(selection.anchorNode);

  if (!editor || editor.dataset.locked === 'true') {
    visible.value = false;
    fontMenuOpen.value = false;
    activeEditor.value = null;
    return;
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    visible.value = false;
    fontMenuOpen.value = false;
    activeEditor.value = null;
    return;
  }

  activeEditor.value = editor;
  currentFontSize.value = resolveFontSize(selection.anchorNode);
  left.value = rect.left + rect.width / 2;
  top.value = Math.max(12, rect.top - 42);
  visible.value = true;
}

function notifyInput() {
  activeEditor.value?.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

function wrapSelection(style: Partial<Record<'fontSize' | 'color', string>>) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return;
  }

  const range = selection.getRangeAt(0);
  const span = document.createElement('span');

  Object.entries(style).forEach(([name, value]) => {
    if (value) {
      span.style.setProperty(name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), value);
    }
  });

  span.appendChild(range.extractContents());
  range.insertNode(span);
  selection.removeAllRanges();

  const nextRange = document.createRange();

  nextRange.selectNodeContents(span);
  selection.addRange(nextRange);
  notifyInput();
  updatePosition();
}

function runBold() {
  activeEditor.value?.focus();
  document.execCommand('styleWithCSS', false, 'true');
  document.execCommand('bold');
  notifyInput();
  updatePosition();
}

function changeFontSize(direction: -1 | 1) {
  const index = fontSizes.indexOf(currentFontSize.value);
  const safeIndex = index === -1 ? fontSizes.indexOf(resolveFontSize(window.getSelection()?.anchorNode ?? null)) : index;
  const nextSize = fontSizes[Math.min(fontSizes.length - 1, Math.max(0, safeIndex + direction))];

  setFontSize(nextSize);
}

function setFontSize(nextSize: number) {
  currentFontSize.value = nextSize;
  fontMenuOpen.value = false;
  wrapSelection({ fontSize: `${nextSize}px` });
}

function changeColor(color: string) {
  wrapSelection({ color });
}

function toggleFontMenu() {
  fontMenuOpen.value = !fontMenuOpen.value;
}

function closeFontMenu(event: PointerEvent) {
  if (!toolbarRef.value?.contains(event.target as Node)) {
    fontMenuOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('selectionchange', updatePosition);
  document.addEventListener('pointerdown', closeFontMenu);
  window.addEventListener('resize', updatePosition);
});

onUnmounted(() => {
  document.removeEventListener('selectionchange', updatePosition);
  document.removeEventListener('pointerdown', closeFontMenu);
  window.removeEventListener('resize', updatePosition);
});
</script>

<template>
  <div
    v-if="visible"
    ref="toolbarRef"
    class="rich-toolbar"
    :style="{ top: `${top}px`, left: `${left}px` }"
    @mousedown.prevent
  >
    <button type="button" aria-label="粗体" title="Bold" @click="runBold">
      <Bold :size="14" />
    </button>
    <button
      class="text-button"
      type="button"
      aria-label="缩小字号"
      title="A-"
      :disabled="!canDecrease"
      @click="changeFontSize(-1)"
    >
      A-
    </button>
    <div class="font-size-select">
      <button
        class="font-size-trigger"
        type="button"
        aria-label="Font size"
        title="Font size"
        :aria-expanded="fontMenuOpen"
        @click="toggleFontMenu"
      >
        <span>{{ currentFontSize }}</span>
        <ChevronDown :size="12" :stroke-width="2.2" />
      </button>
      <Transition name="font-menu">
        <div v-if="fontMenuOpen" class="font-size-menu" role="menu" aria-label="Font size">
          <button
            v-for="size in fontSizes"
            :key="size"
            class="font-size-option"
            :class="{ active: size === currentFontSize }"
            type="button"
            role="menuitemradio"
            :aria-checked="size === currentFontSize"
            @click="setFontSize(size)"
          >
            {{ size }}
          </button>
        </div>
      </Transition>
    </div>
    <button
      class="text-button"
      type="button"
      aria-label="增大字号"
      title="A+"
      :disabled="!canIncrease"
      @click="changeFontSize(1)"
    >
      A+
    </button>
    <button
      v-for="color in colors"
      :key="color"
      class="swatch"
      type="button"
      :aria-label="`颜色 ${color}`"
      :title="color"
      :style="{ background: color }"
      @click="changeColor(color)"
    />
  </div>
</template>

<style scoped>
.rich-toolbar {
  position: fixed;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--color-control-border);
  border-radius: 999px;
  background: var(--color-glass);
  box-shadow: 0 10px 30px rgba(31, 41, 55, 0.16);
  backdrop-filter: blur(26px) saturate(150%);
  transform: translateX(-50%);
}

button {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

button:not(:disabled):hover {
  background: var(--color-control);
}

button:disabled {
  cursor: default;
  opacity: 0.35;
}

.text-button {
  font-size: 12px;
  font-weight: 700;
}

.font-size-select {
  position: relative;
  display: grid;
  place-items: center;
}

.font-size-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  gap: 2px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.font-size-trigger svg {
  flex: 0 0 auto;
}

.font-size-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  z-index: 1;
  display: grid;
  min-width: 50px;
  gap: 2px;
  padding: 5px;
  border: 1px solid var(--color-control-border);
  border-radius: 12px;
  background: var(--color-glass);
  box-shadow: 0 10px 26px rgba(31, 41, 55, 0.18);
  backdrop-filter: blur(24px) saturate(150%);
  transform: translateX(-50%);
}

.font-size-option {
  width: 40px;
  height: 26px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}

.font-size-option.active {
  background: var(--color-control-hover);
  color: var(--color-primary);
}

.font-menu-enter-active,
.font-menu-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.font-menu-enter-from,
.font-menu-leave-to {
  opacity: 0;
  transform: translate(-50%, -4px) scale(0.98);
}

.swatch {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(255, 255, 255, 0.58);
}
</style>
