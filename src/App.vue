<script setup lang="ts">
import { onUnmounted } from 'vue';
import HomePage from '@/pages/Home/HomePage.vue';
import PetPage from '@/pages/Pet/PetPage.vue';
import PetAreaPage from '@/pages/Pet/PetAreaPage.vue';
import { isTauriRuntime } from '@/utils/environment/isTauri';
import { usePetStore } from '@/store/pet/petStore';
import { usePetSettingsStore } from '@/store/pet/petSettingsStore';

const petWindow = new URLSearchParams(window.location.search).get('view') === 'pet';
const areaWindow = new URLSearchParams(window.location.search).get('view') === 'pet-area';
const preview = petWindow && !isTauriRuntime();
const petStore = usePetStore();
if (preview) petStore.visible = true;
let disposed = false;
let stopSettings: (() => void) | undefined;
void usePetSettingsStore().connect().then(stop => { if (disposed) stop(); else stopSettings = stop; });
onUnmounted(() => { disposed = true; stopSettings?.(); });
</script>

<template>
  <PetAreaPage v-if="areaWindow" />
  <div v-else-if="petWindow" :class="{ 'pet-preview-stage': preview }">
    <PetPage v-if="!preview || petStore.visible" />
    <button v-else class="show-pet-preview" type="button" @click="petStore.setVisible(true)">显示桌宠</button>
  </div>
  <HomePage v-else />
</template>

<style scoped>
.pet-preview-stage { display: grid; place-items: center; width: 100vw; height: 100vh; overflow: hidden; background: radial-gradient(circle at 50% 45%, #f8fcf9, #e3eee9); }
.show-pet-preview { padding: 10px 18px; border: 1px solid #c6d8cb; border-radius: 12px; color: #34443d; background: #ffffffd9; cursor: pointer; }
</style>

