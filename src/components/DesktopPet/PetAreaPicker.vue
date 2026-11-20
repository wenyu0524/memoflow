<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { selectionRect, type PetArea } from '@/utils/pet/petArea';

const props = withDefaults(defineProps<{ minimumWidth?: number; minimumHeight?: number }>(), { minimumWidth: 200, minimumHeight: 240 });
const emit = defineEmits<{ choose: [area: PetArea]; cancel: [] }>();
const start = ref<{ x: number; y: number } | null>(null);
const end = ref({ x: 0, y: 0 });
const dragging = ref(false);
const area = computed(() => start.value ? selectionRect(start.value, end.value) : null);
const valid = computed(() => area.value && area.value.size.width >= props.minimumWidth && area.value.size.height >= props.minimumHeight);
function point(event: PointerEvent) {
  return { x: Math.max(0, Math.min(window.innerWidth, event.clientX)), y: Math.max(0, Math.min(window.innerHeight, event.clientY)) };
}
function begin(event: PointerEvent) {
  if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
  start.value = point(event); end.value = point(event); dragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) { if (dragging.value) end.value = point(event); }
function finish(event: PointerEvent) {
  if (!dragging.value) return;
  end.value = point(event); dragging.value = false;
}
function confirm() { if (valid.value && area.value) emit('choose', area.value); }
function key(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('cancel'); }
  if (event.key === 'Enter') { event.preventDefault(); confirm(); }
}
onMounted(() => window.addEventListener('keydown', key));
onUnmounted(() => window.removeEventListener('keydown', key));
</script>

<template>
  <div class="area-picker" role="dialog" aria-modal="true" aria-label="框选桌宠活动区域" @pointerdown="begin" @pointermove="move" @pointerup="finish" @pointercancel="dragging = false">
    <div class="picker-help">
      <strong>拖拽框选桌宠的活动区域</strong>
      <p>至少 {{ minimumWidth }} × {{ minimumHeight }}，可反向拖拽。Enter 确认，Esc 取消。</p>
      <p v-if="area" aria-live="polite">{{ Math.round(area.size.width) }} × {{ Math.round(area.size.height) }} {{ valid ? '· 可以使用' : '· 区域太小，请重新框选' }}</p>
      <button type="button" :disabled="!valid || dragging" @click="confirm">使用这个区域</button>
      <button type="button" @click="emit('cancel')">取消</button>
    </div>
    <div v-if="area" class="selection" :class="{ invalid: !valid }" :style="{ left: area.position.x + 'px', top: area.position.y + 'px', width: area.size.width + 'px', height: area.size.height + 'px' }" />
  </div>
</template>

<style scoped>
.area-picker { position: fixed; inset: 0; z-index: 10000; background: #203c3138; cursor: crosshair; touch-action: none; user-select: none; color: #29483a; }
.picker-help { position: absolute; z-index: 2; top: 16px; left: 50%; transform: translateX(-50%); width: min(430px, calc(100% - 32px)); box-sizing: border-box; padding: 14px 18px; border: 1px solid #cbded2; border-radius: 16px; background: #fafffcf5; box-shadow: 0 6px 25px #152a2220; cursor: default; font-size: 13px; }
p { margin: 7px 0; line-height: 1.5; }
button { padding: 6px 12px; margin: 4px 8px 0 0; border: 1px solid #b8cfc1; border-radius: 8px; color: inherit; background: white; cursor: pointer; }
button:disabled { opacity: .45; cursor: default; }
.selection { position: absolute; box-sizing: border-box; border: 2px dashed #458066; background: #d7f4e33b; pointer-events: none; }
.selection.invalid { border-color: #b77954; }
</style>
