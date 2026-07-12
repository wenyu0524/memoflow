<script setup lang="ts">
import { Bold, ChevronDown } from '@lucide/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

type InlineStyleName = 'color' | 'fontSize' | 'fontWeight';
type ToggleState = 'on' | 'off' | 'mixed';

const visible = ref(false);
const top = ref(0);
const left = ref(0);
const currentFontSize = ref<number | null>(16);
const effectiveFontSize = ref(16);
const currentColor = ref<string | null>(null);
const boldState = ref<ToggleState>('off');
const activeEditor = ref<HTMLElement | null>(null);
const toolbarRef = ref<HTMLElement | null>(null);
const fontMenuOpen = ref(false);
const savedRange = ref<Range | null>(null);
const colors = ['#1F2937', '#DC2626', '#D97706'];
const fontSizes = [12, 14, 16, 18, 20, 22, 24, 28, 32];
const stylePropertyNames: Record<InlineStyleName, string> = {
  color: 'color',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
};

const canDecrease = computed(() => effectiveFontSize.value > fontSizes[0]);
const canIncrease = computed(() => effectiveFontSize.value < fontSizes[fontSizes.length - 1]);
const fontSizeLabel = computed(() => currentFontSize.value ?? '—');

function findEditor(node: Node | null) {
  if (!node) {
    return null;
  }

  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

  return element instanceof HTMLElement ? element.closest<HTMLElement>('[data-rich-editor]') : null;
}

function getSelectionEditor(selection: Selection) {
  const anchorEditor = findEditor(selection.anchorNode);
  const focusEditor = findEditor(selection.focusNode);

  return anchorEditor && anchorEditor === focusEditor ? anchorEditor : null;
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

function normalizeCssColor(value: string) {
  const hexMatch = value.trim().match(/^#?([0-9a-f]{6})$/i);

  if (hexMatch) {
    const hex = hexMatch[1];
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);

    return `rgb(${red}, ${green}, ${blue})`;
  }

  const rgbMatch = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);

  if (rgbMatch) {
    return `rgb(${Number(rgbMatch[1])}, ${Number(rgbMatch[2])}, ${Number(rgbMatch[3])})`;
  }

  return value.trim().toLowerCase();
}

function resolveColor(node: Node | null) {
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;

  if (!(element instanceof HTMLElement)) {
    return null;
  }

  return normalizeCssColor(getComputedStyle(element).color);
}

function resolveBold(node: Node | null) {
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;

  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const weight = getComputedStyle(element).fontWeight;
  const numericWeight = weight === 'bold' ? 700 : weight === 'normal' ? 400 : Number.parseInt(weight, 10);

  return Number.isFinite(numericWeight) ? numericWeight >= 600 : false;
}

function getSelectedTextNodes(range: Range, editor: HTMLElement) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || !range.intersectsNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();

  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }

  return nodes;
}

function resolveUniformValue<T>(values: T[]) {
  if (values.length === 0) {
    return null;
  }

  const [firstValue] = values;

  return values.every((value) => value === firstValue) ? firstValue : null;
}

function updateSelectionState(selection: Selection, editor: HTMLElement) {
  const range = selection.getRangeAt(0);
  const textNodes = getSelectedTextNodes(range, editor);

  effectiveFontSize.value = resolveFontSize(selection.anchorNode);

  if (textNodes.length === 0) {
    currentFontSize.value = effectiveFontSize.value;
    currentColor.value = resolveColor(selection.anchorNode);
    boldState.value = resolveBold(selection.anchorNode) ? 'on' : 'off';
    return;
  }

  currentFontSize.value = resolveUniformValue(textNodes.map((node) => resolveFontSize(node)));
  currentColor.value = resolveUniformValue(textNodes.map((node) => resolveColor(node)));

  const boldValues = textNodes.map((node) => resolveBold(node));
  const uniformBold = resolveUniformValue(boldValues);

  boldState.value = uniformBold === null ? 'mixed' : uniformBold ? 'on' : 'off';
}

function updatePosition() {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    visible.value = false;
    fontMenuOpen.value = false;
    activeEditor.value = null;
    savedRange.value = null;
    return;
  }

  const editor = getSelectionEditor(selection);

  if (!editor || editor.dataset.locked === 'true') {
    visible.value = false;
    fontMenuOpen.value = false;
    activeEditor.value = null;
    savedRange.value = null;
    return;
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    visible.value = false;
    fontMenuOpen.value = false;
    activeEditor.value = null;
    savedRange.value = null;
    return;
  }

  activeEditor.value = editor;
  savedRange.value = selection.getRangeAt(0).cloneRange();
  updateSelectionState(selection, editor);
  left.value = rect.left + rect.width / 2;
  top.value = Math.max(12, rect.top - 42);
  visible.value = true;
}

function notifyInput() {
  activeEditor.value?.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

function restoreSelection() {
  const editor = activeEditor.value;
  const range = savedRange.value;

  if (!editor || !range || editor.dataset.locked === 'true') {
    return false;
  }

  const ancestor = range.commonAncestorContainer;

  if (!range.startContainer.isConnected || !range.endContainer.isConnected || (ancestor !== editor && !editor.contains(ancestor))) {
    return false;
  }

  const selection = window.getSelection();

  if (!selection) {
    return false;
  }

  editor.focus({ preventScroll: true });
  selection.removeAllRanges();
  selection.addRange(range);

  return true;
}

function getActiveSelection() {
  const selection = window.getSelection();

  if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
    const editor = getSelectionEditor(selection);

    if (editor && editor.dataset.locked !== 'true') {
      activeEditor.value = editor;
      savedRange.value = selection.getRangeAt(0).cloneRange();
      return { editor, selection };
    }
  }

  if (!restoreSelection()) {
    return null;
  }

  const restoredSelection = window.getSelection();
  const editor = activeEditor.value;

  if (!restoredSelection || restoredSelection.rangeCount === 0 || restoredSelection.isCollapsed || !editor) {
    return null;
  }

  return { editor, selection: restoredSelection };
}

function cleanStyleAttribute(element: HTMLElement) {
  if (element.style.length === 0) {
    element.removeAttribute('style');
  }
}

function unwrapElement(element: Element) {
  const parent = element.parentNode;

  if (!parent) {
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

function clearSelectionStyles(fragment: DocumentFragment, styleNames: InlineStyleName[]) {
  if (styleNames.includes('fontWeight')) {
    fragment.querySelectorAll('b, strong').forEach((element) => unwrapElement(element));
  }

  fragment.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    styleNames.forEach((name) => {
      element.style.removeProperty(stylePropertyNames[name]);
    });
    cleanStyleAttribute(element);
  });
}

function applySelectionStyles(style: Partial<Record<InlineStyleName, string>>, clearStyleNames = Object.keys(style) as InlineStyleName[]) {
  const context = getActiveSelection();

  if (!context) {
    return;
  }

  const { editor, selection } = context;
  const range = selection.getRangeAt(0);
  const span = document.createElement('span');
  const fragment = range.extractContents();

  clearSelectionStyles(fragment, clearStyleNames);

  Object.entries(style).forEach(([name, value]) => {
    if (value) {
      span.style.setProperty(stylePropertyNames[name as InlineStyleName], value);
    }
  });

  span.appendChild(fragment);
  range.insertNode(span);
  selection.removeAllRanges();

  const nextRange = document.createRange();

  nextRange.selectNodeContents(span);
  selection.addRange(nextRange);
  activeEditor.value = editor;
  savedRange.value = nextRange.cloneRange();
  notifyInput();
  updatePosition();
}

function runBold() {
  const context = getActiveSelection();

  if (!context) {
    return;
  }

  updateSelectionState(context.selection, context.editor);
  applySelectionStyles({ fontWeight: boldState.value === 'on' ? '500' : '700' }, ['fontWeight']);
}

function changeFontSize(direction: -1 | 1) {
  const index = fontSizes.indexOf(effectiveFontSize.value);
  const safeIndex = index === -1 ? fontSizes.indexOf(resolveFontSize(window.getSelection()?.anchorNode ?? null)) : index;
  const nextSize = fontSizes[Math.min(fontSizes.length - 1, Math.max(0, safeIndex + direction))];

  setFontSize(nextSize);
}

function setFontSize(nextSize: number) {
  fontMenuOpen.value = false;
  applySelectionStyles({ fontSize: `${nextSize}px` }, ['fontSize']);
}

function changeColor(color: string) {
  applySelectionStyles({ color }, ['color']);
}

function toggleFontMenu() {
  restoreSelection();
  fontMenuOpen.value = !fontMenuOpen.value;
}

function isColorActive(color: string) {
  return currentColor.value === normalizeCssColor(color);
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
    <button
      type="button"
      aria-label="粗体"
      title="Bold"
      :class="{ active: boldState === 'on', mixed: boldState === 'mixed' }"
      :aria-pressed="boldState === 'on'"
      @click="runBold"
    >
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
        <span>{{ fontSizeLabel }}</span>
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
      :class="{ active: isColorActive(color) }"
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

button.active {
  color: var(--color-primary);
  background: var(--color-control-hover);
}

button.mixed {
  color: var(--color-muted);
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

.swatch.active {
  box-shadow:
    0 0 0 2px var(--color-primary),
    0 0 0 4px rgba(255, 255, 255, 0.7);
}
</style>
