<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import PetAreaPicker from '@/components/DesktopPet/PetAreaPicker.vue';
import type { PetArea } from '@/utils/pet/petArea';
const revision = ref(0);
const error = ref('');
let stop: UnlistenFn | undefined;
let disposed = false;
async function choose(area: PetArea) {
  try { await invoke('finish_pet_area_selection', { area }); }
  catch { error.value = '区域设置失败，请重新框选或按 Esc 取消。'; }
}
async function cancel() {
  try { await invoke('cancel_pet_area_selection'); }
  catch { error.value = '暂时无法关闭，请重试。'; }
}
onMounted(async () => {
  const unlisten = await listen('pet-area-opened', () => { revision.value++; error.value = ''; });
  if (disposed) unlisten(); else stop = unlisten;
});
onUnmounted(() => { disposed = true; stop?.(); });
</script>
<template>
  <PetAreaPicker :key="revision" @choose="choose" @cancel="cancel" />
  <p v-if="error" class="area-error" role="alert">{{ error }}</p>
</template>
<style scoped>
.area-error { position: fixed; z-index: 10001; bottom: 16px; left: 16px; padding: 12px; border-radius: 10px; background: #fff5e8; color: #7c4c35; }
</style>
