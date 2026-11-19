<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { PetAction } from '@/utils/pet/petMotion';
import { petAnimations, preloadPetFrames } from '@/utils/pet/petFrames';
import { getFrameIndex, getTimedFrame } from '@/utils/pet/framePlayback';

const props = defineProps<{ action: PetAction; direction: -1 | 1 }>();
const animation = computed(() => petAnimations[props.action]);
const frameIndex = ref(0);
const ready = ref(false);
const failed = ref(false);
const media = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = ref(media.matches);
const flipped = computed(() => props.direction === 1 && ['walking', 'running', 'jumping'].includes(props.action));
let timer: number | undefined;
let startedAt = 0;
let disposed = false;

function tick() {
  const current = animation.value;
  const elapsed = performance.now() - startedAt;
  const timed = current.durations ? getTimedFrame(elapsed, current.durations) : undefined;
  frameIndex.value = timed?.index ?? getFrameIndex(elapsed, current.fps, current.frames.length, current.loop);
  if (!current.loop && frameIndex.value === current.frames.length - 1) return;
  timer = window.setTimeout(tick, timed?.delay ?? 1000 / current.fps);
}

function restart() {
  window.clearTimeout(timer);
  frameIndex.value = 0;
  startedAt = performance.now();
  if (ready.value && !reducedMotion.value && !disposed) {
    tick();
  }
}

function motionChanged(event: MediaQueryListEvent) {
  reducedMotion.value = event.matches;
}

watch([() => props.action, ready, reducedMotion], restart, { immediate: true });
onMounted(async () => {
  media.addEventListener('change', motionChanged);
  try {
    await preloadPetFrames();
    if (!disposed) ready.value = true;
  } catch {
    if (!disposed) failed.value = true;
  }
});
onUnmounted(() => {
  disposed = true;
  window.clearTimeout(timer);
  media.removeEventListener('change', motionChanged);
});
</script>

<template>
  <span class="pet-character" :class="action" :data-animation="animation.source" :data-frame="frameIndex" :data-fps="animation.fps" :data-ready="ready" :style="{ '--jump-duration': animation.frames.length / animation.fps + 's' }">
    <span v-if="failed" class="pet-frame-error" role="alert">桌宠图片加载失败，请重新显示桌宠。</span>
    <img v-else class="pet-frame" :class="{ flipped }" :src="animation.frames[frameIndex]" alt="" aria-hidden="true" draggable="false" width="512" height="512" />
  </span>
</template>

<style scoped>
.pet-character { display: inline-block; width: 190px; height: 190px; flex-shrink: 0; pointer-events: none; filter: drop-shadow(0 2px 2px #00000016); }
.pet-frame { display: block; width: 100%; height: 100%; object-fit: contain; user-select: none; }
.pet-frame.flipped { transform: scaleX(-1); }
.pet-frame-error { display: block; padding: 12px; border-radius: 10px; background: #fff1e4; color: #6c4427; font-size: 12px; }
.jumping { animation: sprite-hop var(--jump-duration) ease-out; }
@keyframes sprite-hop { 0%,100% { transform: translateY(0); } 45% { transform: translateY(-18px); } }
@media (prefers-reduced-motion: reduce) { .pet-character { animation: none !important; } }
</style>
