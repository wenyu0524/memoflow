<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { availableMonitors, currentMonitor, getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';
import PetCharacter from '@/components/DesktopPet/PetCharacter.vue';
import PetAreaPicker from '@/components/DesktopPet/PetAreaPicker.vue';
import { usePetStore } from '@/store/pet/petStore';
import { isTauriRuntime } from '@/utils/environment/isTauri';
import { createActivityPlan, type PetAction } from '@/utils/pet/petMotion';
import { getAnimationDuration } from '@/utils/pet/petFrames';
import { clampPetPosition, intersectPetArea, validPetArea, type PetArea } from '@/utils/pet/petArea';
import { usePetReminders } from '@/utils/pet/usePetReminders';
import { reminderStyles } from '@/utils/pet/reminderMessages';

const native = isTauriRuntime();
const petStore = usePetStore();
const root = ref<HTMLElement | null>(null);
const action = ref<PetAction>('idle');
const direction = ref<-1 | 1>(1);
const roaming = ref(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const menuOpen = ref(false);
const speech = ref('');
const animationKey = ref(0);
const offset = ref({ x: 0, y: 0 });
const selecting = ref(false);
const dragging = ref(false);
const selectedArea = ref<PetArea | null>(null);
const areaKey = 'memoflow-pet-area-' + (native ? 'native' : 'browser');
try {
  const stored = JSON.parse(localStorage.getItem(areaKey) ?? 'null');
  if (validPetArea(stored)) selectedArea.value = stored;
} catch { /* Ignore invalid old area settings. */ }
const visible = ref(true);
const { preferences, snapshot, error: reminderError, remindNow } = usePetReminders(say,
  () => visible.value && !menuOpen.value && !selecting.value && !dragging.value && !speech.value);
let walkTimer: number | undefined;
let jumpTimer: number | undefined;
let speechTimer: number | undefined;
let walkGeneration = 0;
let disposed = false;
let constrainTimer: number | undefined;
let constraining = false;
let suppressClickUntil = 0;
let nativeDragContext: Awaited<ReturnType<typeof movementContext>> = null;
let nativeDragMoving = false;
let drag: { pointerId: number; x: number; y: number; screenX: number; screenY: number; offsetX: number; offsetY: number; moved: boolean } | null = null;
const unlisten: UnlistenFn[] = [];

async function movementContext() {
  const rect = root.value?.getBoundingClientRect();
  if (!rect) return null;
  const appWindow = native ? getCurrentWindow() : null;
  let monitor = appWindow ? await currentMonitor() : null;
  if (appWindow && selectedArea.value) {
    const selected = selectedArea.value;
    const monitors = await availableMonitors();
    monitor = monitors.find(item => {
      const area = item.workArea;
      return selected.position.x >= area.position.x && selected.position.x < area.position.x + area.size.width
        && selected.position.y >= area.position.y && selected.position.y < area.position.y + area.size.height;
    }) ?? monitor;
  }
  if (appWindow && !monitor) return null;
  const position = appWindow ? await appWindow.outerPosition() : { x: rect.x, y: rect.y };
  const size = appWindow ? await appWindow.outerSize() : { width: rect.width, height: rect.height };
  const work = monitor?.workArea ?? { position: { x: 0, y: 0 }, size: { width: window.innerWidth, height: window.innerHeight } };
  const area = intersectPetArea(selectedArea.value, work, size);
  return { appWindow, position, size, area, scale: monitor?.scaleFactor ?? 1 };
}

async function constrainPosition() {
  if (constraining || disposed) return;
  constraining = true;
  try {
    const context = await movementContext();
    if (!context || disposed) return;
    const target = clampPetPosition(context.position, context.size, context.area);
    if (target.x === context.position.x && target.y === context.position.y) return;
    if (context.appWindow) await context.appWindow.setPosition(new PhysicalPosition(target.x, target.y));
    else offset.value = { x: offset.value.x + target.x - context.position.x, y: offset.value.y + target.y - context.position.y };
  } finally { constraining = false; }
}

function queueConstrain() {
  window.clearTimeout(constrainTimer);
  constrainTimer = window.setTimeout(() => {
    void constrainPosition().catch(() => say('活动区域暂时无法调整，请重新框选。'));
  }, 180);
}

function saveArea(area: PetArea | null) {
  selectedArea.value = area;
  selecting.value = false;
  try { localStorage.setItem(areaKey, JSON.stringify(area)); }
  catch { say('区域已应用，但暂时无法保存到本地。'); }
  queueConstrain();
  scheduleWalk(500);
}

async function selectArea() {
  stopWalking(); window.clearTimeout(jumpTimer);
  if (action.value === 'jumping') action.value = 'idle';
  menuOpen.value = false; selecting.value = true;
  if (native) {
    try { await invoke('start_pet_area_selection'); }
    catch { selecting.value = false; say('暂时无法框选活动区域，请重试。'); scheduleWalk(); }
  }
}

function closeMenu() {
  if (!menuOpen.value) return;
  menuOpen.value = false; scheduleWalk();
}
function outsideMenu(event: PointerEvent) {
  const target = event.target;
  if (target instanceof Element && !target.closest('.pet-menu, .pet-menu-trigger')) closeMenu();
}
function cancelSelection() { selecting.value = false; scheduleWalk(); }
function previewReminder() { menuOpen.value = false; remindNow(); scheduleWalk(); }

function stopWalking() {
  walkGeneration++;
  window.clearTimeout(walkTimer);
  if (action.value === 'walking' || action.value === 'running') action.value = 'idle';
}

function scheduleWalk(delay = 900 + Math.random() * 2400) {
  window.clearTimeout(walkTimer);
  if (!disposed && visible.value && roaming.value && !menuOpen.value && !selecting.value) {
    walkTimer = window.setTimeout(() => { void walk(); }, delay);
  }
}

async function walk() {
  if (disposed || !visible.value || drag || menuOpen.value || selecting.value || !roaming.value || action.value === 'jumping' || action.value === 'sitting' || action.value === 'sleeping') return;
  const generation = ++walkGeneration;
  try {
    await constrainPosition();
    const context = await movementContext();
    if (!context) { scheduleWalk(); return; }
    const { appWindow, position, size, area, scale } = context;
    if (appWindow && !(await appWindow.isVisible())) return;
    const path = createActivityPlan(position, size, area, Math.random, scale);
    if (generation !== walkGeneration || disposed || !visible.value || drag || selecting.value) return;
    direction.value = path.direction;
    action.value = path.mode;
    const startOffset = { ...offset.value };
    const distance = Math.hypot(path.end.x - path.start.x, path.end.y - path.start.y);
    let travelled = 0;
    let lastFrame = performance.now();
    while (travelled < distance) {
      if (generation !== walkGeneration || disposed || !visible.value || drag || selecting.value || !roaming.value) break;
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

function say(text: string, duration = 2400) {
  speech.value = text;
  window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => { speech.value = ''; }, duration);
}

function pet() {
  if (Date.now() < suppressClickUntil) return;
  stopWalking();
  window.clearTimeout(jumpTimer);
  action.value = 'jumping';
  animationKey.value++;
  say(['喵～', '小黑陪着你。', '休息一下吧～'][Math.floor(Math.random() * 3)]);
  jumpTimer = window.setTimeout(() => { action.value = 'idle'; scheduleWalk(); }, getAnimationDuration('jumping'));
}

function rest(mode: 'sitting' | 'sleeping') {
  stopWalking();
  window.clearTimeout(jumpTimer);
  roaming.value = false;
  action.value = mode;
  menuOpen.value = false;
  say(mode === 'sleeping' ? '呼噜…点我叫醒。' : '坐下来休息一下。');
}

async function startDrag(event: PointerEvent) {
  if (event.button !== 0) return;
  stopWalking();
  dragging.value = true;
  nativeDragContext = null;
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, screenX: event.screenX, screenY: event.screenY, offsetX: offset.value.x, offsetY: offset.value.y, moved: false };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  if (native && selectedArea.value) {
    const activeDrag = drag;
    try {
      const context = await movementContext();
      if (drag === activeDrag) nativeDragContext = context;
    } catch { say('拖动暂时不可用，请重试。'); }
  }
}

async function moveDrag(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  const screenDx = event.screenX - drag.screenX;
  const screenDy = event.screenY - drag.screenY;
  if (Math.hypot(native ? screenDx : dx, native ? screenDy : dy) < 5 && !drag.moved) return;
  const firstMove = !drag.moved;
  drag.moved = true;
  suppressClickUntil = Date.now() + 400;
  if (native && selectedArea.value) {
    if (!nativeDragContext || nativeDragMoving) return;
    const { position, size, area, scale, appWindow } = nativeDragContext;
    const target = clampPetPosition({ x: position.x + screenDx * scale, y: position.y + screenDy * scale }, size, area);
    nativeDragMoving = true;
    try { await appWindow?.setPosition(new PhysicalPosition(target.x, target.y)); }
    catch { say('拖动暂时不可用，请重试。'); }
    finally { nativeDragMoving = false; }
  } else if (native && firstMove) {
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    try { await getCurrentWindow().startDragging(); }
    catch { say('拖动暂时不可用，请重试。'); }
    finally { drag = null; dragging.value = false; queueConstrain(); scheduleWalk(); }
  } else if (!native) {
    const rect = root.value?.getBoundingClientRect();
    if (!rect) return;
    const raw = { x: rect.x - offset.value.x + drag.offsetX + dx, y: rect.y - offset.value.y + drag.offsetY + dy };
    const work = { position: { x: 0, y: 0 }, size: { width: window.innerWidth, height: window.innerHeight } };
    const size = { width: rect.width, height: rect.height };
    const target = clampPetPosition(raw, size, intersectPetArea(selectedArea.value, work, size));
    offset.value = { x: offset.value.x + target.x - rect.x, y: offset.value.y + target.y - rect.y };
  }
}

function finishDrag() {
  if (drag?.moved) suppressClickUntil = Date.now() + 400;
  drag = null;
  nativeDragContext = null;
  dragging.value = false;
  queueConstrain();
  scheduleWalk();
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
  stopWalking();
  if (menuOpen.value && native) void getCurrentWindow().setFocus().catch(() => {});
  if (!menuOpen.value) scheduleWalk();
}

function toggleRoaming() {
  roaming.value = !roaming.value;
  stopWalking();
  menuOpen.value = false;
  if (roaming.value) { action.value = 'idle'; scheduleWalk(300); }
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
  document.addEventListener('pointerdown', outsideMenu, true);
  window.addEventListener('blur', closeMenu);
  window.addEventListener('resize', queueConstrain);
  if (native) {
    try {
      const appWindow = getCurrentWindow();
      const stopVisibility = await listen<boolean>('pet-visibility-changed', ({ payload }) => {
        visible.value = payload;
        stopWalking();
        if (visible.value) scheduleWalk(1200);
      });
      if (disposed) { stopVisibility(); return; }
      unlisten.push(stopVisibility);
      const stopMoved = await appWindow.onMoved(() => {
        if (dragging.value) return;
        if (action.value !== 'walking' && action.value !== 'running') { stopWalking(); queueConstrain(); scheduleWalk(); }
      });
      if (disposed) { stopMoved(); return; }
      unlisten.push(stopMoved);
      for (const subscribe of [
        () => appWindow.onFocusChanged(({ payload }) => { if (!payload) closeMenu(); }),
        () => listen<PetArea>('pet-area-selected', ({ payload }) => { if (validPetArea(payload)) saveArea(payload); }),
        () => listen('pet-area-closed', cancelSelection),
      ]) {
        const stop = await subscribe();
        if (disposed) { stop(); return; }
        unlisten.push(stop);
      }
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
  if (!disposed) { queueConstrain(); scheduleWalk(1200); }
});

onUnmounted(() => {
  disposed = true;
  stopWalking();
  window.clearTimeout(jumpTimer);
  window.clearTimeout(speechTimer);
  window.clearTimeout(constrainTimer);
  document.removeEventListener('pointerdown', outsideMenu, true);
  window.removeEventListener('blur', closeMenu);
  window.removeEventListener('resize', queueConstrain);
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
      <label class="pet-setting"><input v-model="preferences.enabled" type="checkbox" />待办提醒</label>
      <label class="pet-setting">提醒风格<select v-model="preferences.style" aria-label="提醒风格"><option v-for="(label, key) in reminderStyles" :key="key" :value="key">{{ label }}</option></select></label>
      <label class="pet-setting">提醒频率<select v-model.number="preferences.minutes" aria-label="提醒频率"><option v-for="minutes in [5,15,30,60]" :key="minutes" :value="minutes">每 {{ minutes }} 分钟</option></select></label>
      <span v-if="snapshot" class="pet-count">{{ snapshot.remaining }} 项未完成</span>
      <button type="button" :disabled="!snapshot || !!reminderError" @click="previewReminder">现在提醒一下</button>
      <button type="button" @click="selectArea">{{ selectedArea ? '重新框选活动区域' : '框选活动区域' }}</button>
      <button v-if="selectedArea" type="button" @click="saveArea(null); closeMenu()">取消区域限制</button>
      <button type="button" :aria-pressed="roaming" @click="toggleRoaming">{{ roaming ? '✓ 自由活动' : '开启自由活动' }}</button>
      <button type="button" @click="pet(); menuOpen = false">摸摸小黑</button>
      <button type="button" @click="rest('sitting')">坐下休息</button>
      <button type="button" @click="rest('sleeping')">睡一会儿</button>
      <button type="button" @click="hidePet">隐藏桌宠</button>
    </div>
    <button class="pet-body-button" type="button" :aria-label="action === 'sleeping' ? '叫醒罗小黑，拖动可移动' : '摸摸罗小黑，拖动可移动'" title="点击摸摸或叫醒，拖动移动，右键打开菜单" @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="finishDrag" @pointercancel="finishDrag" @click="pet">
      <PetCharacter :key="animationKey" :action="action" :direction="direction" />
    </button>
    <p v-if="petStore.error || reminderError" class="pet-error" role="alert">{{ petStore.error || reminderError }}</p>
  </section>
  <Teleport to="body">
    <PetAreaPicker v-if="selecting && !native" @choose="saveArea" @cancel="cancelSelection" />
    <div v-if="selectedArea && !native && !selecting" class="pet-area-outline" aria-hidden="true" :style="{ left: selectedArea.position.x + 'px', top: selectedArea.position.y + 'px', width: selectedArea.size.width + 'px', height: selectedArea.size.height + 'px' }" />
  </Teleport>
</template>

<style scoped>
.pet-window { position: relative; flex: 0 0 auto; width: 200px; height: 240px; background: transparent; color: #34404a; user-select: none; pointer-events: auto; }
.pet-body-button { position: absolute; left: 5px; bottom: 4px; width: 190px; height: 192px; display: grid; place-items: center; padding: 0; border: 0; background: transparent; cursor: grab; touch-action: none; }
.pet-body-button:active { cursor: grabbing; transform: none; }
.pet-body-button:focus-visible { outline: 2px solid #89a4a2; outline-offset: -4px; border-radius: 24px; }
.pet-speech { position: absolute; z-index: 2; top: 3px; left: 12px; right: 12px; padding: 8px 10px; border: 1px solid #d9e3de; border-radius: 14px; color: #34443d; background: #ffffffed; text-align: center; font-size: 12px; }
.pet-menu-trigger { position: absolute; z-index: 4; right: 8px; top: 37px; width: 26px; height: 23px; padding: 0; border: 1px solid #dbe5e0; border-radius: 9px; color: #52625a; background: #ffffffed; opacity: 0; cursor: pointer; font-size: 18px; line-height: 1; }
.pet-window:hover .pet-menu-trigger, .pet-window:focus-within .pet-menu-trigger, .menu-open .pet-menu-trigger { opacity: 1; }
.pet-menu { position: absolute; z-index: 3; top: 57px; left: 22px; right: 12px; display: grid; gap: 2px; max-height: 174px; overflow-y: auto; padding: 10px; border: 1px solid #dbe5e0; border-radius: 14px; color: #34443d; background: #fffffff5; box-shadow: 0 5px 12px #12281d14; font-size: 12px; }
.pet-menu strong { padding: 2px 8px 5px; font-size: 12px; }
.pet-menu button { min-height: 27px; padding: 4px 8px; border: 0; border-radius: 7px; color: inherit; background: transparent; text-align: left; cursor: pointer; }
.pet-menu button:hover, .pet-menu button:focus-visible { background: #e8f2ec; }
.pet-setting { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; padding: 4px 7px; }
.pet-setting select { width: 100%; padding: 4px; border: 1px solid #d4e2d9; border-radius: 6px; background: white; color: inherit; font: inherit; }
.pet-count { padding: 3px 8px; color: #657d6e; }
.pet-menu button:disabled { opacity: .45; cursor: default; }
.pet-area-outline { position: fixed; z-index: 10; pointer-events: none; box-sizing: border-box; border: 1px dashed #89ab9980; border-radius: 8px; }
.pet-error { position: absolute; z-index: 5; inset: 0 8px auto; padding: 5px; border-radius: 8px; background: #fff2e6; font-size: 11px; }
</style>
