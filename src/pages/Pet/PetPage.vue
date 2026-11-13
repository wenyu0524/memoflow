<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { currentMonitor, getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';
import PetCharacter from '@/components/DesktopPet/PetCharacter.vue';
import { usePetStore } from '@/store/pet/petStore';
import { isTauriRuntime } from '@/utils/environment/isTauri';
import { createActivityPlan, type PetAction } from '@/utils/pet/petMotion';

const native = isTauriRuntime();
const petStore = usePetStore();
const root = ref<HTMLElement | null>(null);
const action = ref<PetAction>('idle');
const direction = ref<-1 | 1>(1);
const lookY = ref(0);
const roaming = ref(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const menuOpen = ref(false);
const speech = ref('');
const animationKey = ref(0);
const offset = ref({ x: 0, y: 0 });
let walkTimer: number | undefined;
let jumpTimer: number | undefined;
let speechTimer: number | undefined;
let walkGeneration = 0;
let disposed = false;
let visible = true;
let suppressClickUntil = 0;
let drag: { pointerId: number; x: number; y: number; offsetX: number; offsetY: number; moved: boolean } | null = null;
const unlisten: UnlistenFn[] = [];

function stopWalking() {
  walkGeneration++;
  window.clearTimeout(walkTimer);
  if (action.value === 'walking' || action.value === 'running') action.value = 'idle';
}

function scheduleWalk(delay = 900 + Math.random() * 2400) {
  window.clearTimeout(walkTimer);
  if (!disposed && visible && roaming.value && !menuOpen.value) {
    walkTimer = window.setTimeout(() => { void walk(); }, delay);
  }
}

async function walk() {
  if (disposed || !visible || drag || menuOpen.value || !roaming.value || action.value === 'jumping') return;
  const generation = ++walkGeneration;
  try {
    const rect = root.value?.getBoundingClientRect();
    if (!rect) return;
    const appWindow = native ? getCurrentWindow() : null;
    if (appWindow && !(await appWindow.isVisible())) return;
    const monitor = appWindow ? await currentMonitor() : null;
    if (appWindow && !monitor) { scheduleWalk(); return; }
    const position = appWindow ? await appWindow.outerPosition() : { x: rect.x, y: rect.y };
    const size = appWindow ? await appWindow.outerSize() : { width: rect.width, height: rect.height };
    const area = monitor?.workArea ?? { position: { x: 0, y: 0 }, size: { width: window.innerWidth, height: window.innerHeight } };
    const path = createActivityPlan(position, size, area, Math.random, monitor?.scaleFactor ?? 1);
    if (generation !== walkGeneration || disposed || !visible || drag) return;
    direction.value = path.direction;
    lookY.value = path.lookY;
    action.value = path.mode;
    const startOffset = { ...offset.value };
    const distance = Math.hypot(path.end.x - path.start.x, path.end.y - path.start.y);
    let travelled = 0;
    let lastFrame = performance.now();
    while (travelled < distance) {
      if (generation !== walkGeneration || disposed || !visible || drag || !roaming.value) break;
      const now = performance.now();
      const elapsed = Math.min((now - lastFrame) / 1000, .08);
      lastFrame = now;
      if (path.burstAt !== null && travelled / distance >= path.burstAt) action.value = 'running';
      const speed = action.value === 'running' ? path.runSpeed : path.walkSpeed;
      travelled = Math.min(distance, travelled + speed * elapsed);
      const progress = travelled / distance;
      const x = Math.round(path.start.x + (path.end.x - path.start.x) * progress);
      const y = Math.round(path.start.y + (path.end.y - path.start.y) * progress);
      if (appWindow) {
        await appWindow.setPosition(new PhysicalPosition(x, y));
      } else {
        offset.value = { x: startOffset.x + x - position.x, y: startOffset.y + y - position.y };
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 32));
    }
    if (generation === walkGeneration && !disposed) {
      action.value = 'idle';
      scheduleWalk(path.pause);
    }
  } catch {
    if (!disposed && generation === walkGeneration) {
      action.value = 'idle';
      roaming.value = false;
      say('自由活动暂停了，可以再试一次。');
    }
  }
}

function say(text: string) {
  speech.value = text;
  window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => { speech.value = ''; }, 2400);
}

function pet() {
  if (Date.now() < suppressClickUntil) return;
  stopWalking();
  window.clearTimeout(jumpTimer);
  action.value = 'jumping';
  animationKey.value++;
  say(['喵～', '小黑陪着你。', '休息一下吧～'][Math.floor(Math.random() * 3)]);
  jumpTimer = window.setTimeout(() => { action.value = 'idle'; scheduleWalk(); }, 700);
}

function startDrag(event: PointerEvent) {
  if (event.button !== 0) return;
  stopWalking();
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: offset.value.x, offsetY: offset.value.y, moved: false };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

async function moveDrag(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (Math.hypot(dx, dy) < 5 && !drag.moved) return;
  const firstMove = !drag.moved;
  drag.moved = true;
  suppressClickUntil = Date.now() + 400;
  if (native && firstMove) {
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    try { await getCurrentWindow().startDragging(); }
    catch { say('拖动暂时不可用，请重试。'); }
    finally { drag = null; scheduleWalk(); }
  } else if (!native) {
    offset.value = { x: drag.offsetX + dx, y: drag.offsetY + dy };
  }
}

function finishDrag() {
  if (drag?.moved) suppressClickUntil = Date.now() + 400;
  drag = null;
  scheduleWalk();
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
  stopWalking();
  if (!menuOpen.value) scheduleWalk();
}

function toggleRoaming() {
  roaming.value = !roaming.value;
  stopWalking();
  menuOpen.value = false;
  if (roaming.value) scheduleWalk(300);
}

async function hidePet() {
  stopWalking();
  menuOpen.value = false;
  await petStore.setVisible(false);
}

async function openMemo() {
  menuOpen.value = false;
  if (native) {
    try { await invoke('open_main_window'); }
    catch { say('暂时无法打开备忘录，请重试。'); }
  } else {
    say('小黑在这里陪你记事。');
  }
  scheduleWalk();
}

onMounted(async () => {
  if (native) {
    try {
      const appWindow = getCurrentWindow();
      const stopVisibility = await listen<boolean>('pet-visibility-changed', ({ payload }) => {
        visible = payload;
        stopWalking();
        if (visible) scheduleWalk(1200);
      });
      if (disposed) { stopVisibility(); return; }
      unlisten.push(stopVisibility);
      const stopMoved = await appWindow.onMoved(() => {
        if (action.value !== 'walking' && action.value !== 'running') { stopWalking(); scheduleWalk(); }
      });
      if (disposed) { stopMoved(); return; }
      unlisten.push(stopMoved);
      if (!localStorage.getItem('memoflow-pet-positioned')) {
        const monitor = await currentMonitor();
        if (monitor) {
          const size = await appWindow.outerSize();
          const area = monitor.workArea;
          await appWindow.setPosition(new PhysicalPosition(
            Math.max(area.position.x, area.position.x + area.size.width - size.width - 24),
            Math.max(area.position.y, area.position.y + area.size.height - size.height - 16),
          ));
          localStorage.setItem('memoflow-pet-positioned', 'true');
        }
      }
      if (!disposed) await petStore.setVisible(true);
    } catch {
      if (!disposed) await petStore.setVisible(true);
    }
  }
  await nextTick();
  if (!disposed) scheduleWalk(1200);
});

onUnmounted(() => {
  disposed = true;
  stopWalking();
  window.clearTimeout(jumpTimer);
  window.clearTimeout(speechTimer);
  unlisten.forEach((stop) => stop());
});
</script>

<template>
  <section ref="root" class="pet-window" :class="{ 'menu-open': menuOpen, native }" :style="{ transform: native ? undefined : `translate(${offset.x}px, ${offset.y}px)` }" aria-label="罗小黑桌宠" @contextmenu.prevent="toggleMenu" @keydown.esc="menuOpen = false; scheduleWalk()">
    <div v-if="speech" class="pet-speech" role="status" aria-live="polite">{{ speech }}</div>
    <button class="pet-menu-trigger" type="button" aria-label="桌宠菜单" :aria-expanded="menuOpen" @click="toggleMenu">···</button>
    <div v-if="menuOpen" class="pet-menu" aria-label="桌宠操作">
      <strong>罗小黑</strong>
      <button type="button" @click="openMemo">打开备忘录</button>
      <button type="button" :aria-pressed="roaming" @click="toggleRoaming">{{ roaming ? '✓ 自由活动' : '开启自由活动' }}</button>
      <button type="button" @click="pet(); menuOpen = false">摸摸小黑</button>
      <button type="button" @click="hidePet">隐藏桌宠</button>
    </div>
    <button class="pet-body-button" type="button" aria-label="摸摸罗小黑，拖动可移动" title="点击摸摸，拖动移动，右键打开菜单" @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="finishDrag" @pointercancel="finishDrag" @click="pet">
      <PetCharacter :key="animationKey" :action="action" :direction="direction" :look-y="lookY" />
    </button>
    <p v-if="petStore.error" class="pet-error" role="alert">{{ petStore.error }}</p>
  </section>
</template>

<style scoped>
.pet-window { position: relative; flex: 0 0 auto; width: 200px; height: 240px; background: transparent; color: #34404a; user-select: none; pointer-events: auto; }
.pet-body-button { position: absolute; left: 5px; bottom: 4px; width: 190px; height: 192px; display: grid; place-items: center; padding: 0; border: 0; background: transparent; cursor: grab; touch-action: none; }
.pet-body-button:active { cursor: grabbing; transform: none; }
.pet-body-button:focus-visible { outline: 2px solid #89a4a2; outline-offset: -4px; border-radius: 24px; }
.pet-speech { position: absolute; z-index: 2; top: 3px; left: 12px; right: 12px; padding: 8px 10px; border: 1px solid #d9e3de; border-radius: 14px; color: #34443d; background: #ffffffed; text-align: center; font-size: 12px; }
.pet-menu-trigger { position: absolute; z-index: 4; right: 8px; top: 37px; width: 26px; height: 23px; padding: 0; border: 1px solid #dbe5e0; border-radius: 9px; color: #52625a; background: #ffffffed; opacity: 0; cursor: pointer; font-size: 18px; line-height: 1; }
.pet-window:hover .pet-menu-trigger, .pet-window:focus-within .pet-menu-trigger, .menu-open .pet-menu-trigger { opacity: 1; }
.pet-menu { position: absolute; z-index: 3; top: 57px; left: 22px; right: 12px; display: grid; gap: 2px; padding: 10px; border: 1px solid #dbe5e0; border-radius: 14px; color: #34443d; background: #fffffff5; box-shadow: 0 5px 12px #12281d14; font-size: 12px; }
.pet-menu strong { padding: 2px 8px 5px; font-size: 12px; }
.pet-menu button { min-height: 27px; padding: 4px 8px; border: 0; border-radius: 7px; color: inherit; background: transparent; text-align: left; cursor: pointer; }
.pet-menu button:hover, .pet-menu button:focus-visible { background: #e8f2ec; }
.pet-error { position: absolute; z-index: 5; inset: 0 8px auto; padding: 5px; border-radius: 8px; background: #fff2e6; font-size: 11px; }
</style>
