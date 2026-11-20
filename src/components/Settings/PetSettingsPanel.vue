<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Settings } from '@lucide/vue';
import { usePetSettingsStore } from '@/store/pet/petSettingsStore';
import { petCharacters, type PetSettings } from '@/utils/pet/petSettings';
import { reminderStyles } from '@/utils/pet/reminderMessages';
const store = usePetSettingsStore();
const open = ref(false);
const root = ref<HTMLElement>();
function outside(event: PointerEvent) { if (event.target instanceof Node && !root.value?.contains(event.target)) open.value = false; }
function key(event: KeyboardEvent) { if (event.key === 'Escape') open.value = false; }
function change<K extends keyof PetSettings>(key: K, event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.type === 'checkbox' ? input.checked : key === 'minutes' ? Number(input.value) : input.value;
  void store.update({ [key]: value } as Pick<PetSettings, K>);
}
onMounted(() => { document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', key); });
onUnmounted(() => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', key); });
</script>
<template>
  <div ref="root" class="settings-root">
    <button class="settings-toggle" type="button" aria-label="设置" title="设置" :aria-expanded="open" @click="open = !open"><Settings :size="16" /></button>
    <section v-if="open" class="settings-panel" aria-label="桌宠设置">
      <header><strong>桌宠设置</strong><button type="button" aria-label="关闭设置" @click="open = false">×</button></header>
      <label class="setting-row">打开备忘录时启动桌宠<input type="checkbox" :checked="store.values.autoStart" :disabled="!store.loaded" @change="change('autoStart', $event)" /></label>
      <label class="setting-row">待办提醒<input type="checkbox" :checked="store.values.enabled" :disabled="!store.loaded" @change="change('enabled', $event)" /></label>
      <label>提醒风格<select :value="store.values.style" :disabled="!store.loaded" @change="change('style', $event)"><option v-for="(label, id) in reminderStyles" :key="id" :value="id">{{ label }}</option></select></label>
      <label>提醒频率<select :value="store.values.minutes" :disabled="!store.loaded" @change="change('minutes', $event)"><option v-for="minutes in [5,15,30,60]" :key="minutes" :value="minutes">每 {{ minutes }} 分钟</option></select></label>
      <label>展示的桌宠<select :value="store.values.character" :disabled="!store.loaded" @change="change('character', $event)"><option v-for="(name, id) in petCharacters" :key="id" :value="id">{{ name }}</option></select></label>
      <p>设置自动保存。启动选项在下次打开应用时生效，角色与提醒设置立即生效。</p>
      <p v-if="store.error" role="alert">{{ store.error }}</p>
    </section>
  </div>
</template>
<style scoped>
.settings-root { position: relative; }
.settings-toggle { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--color-control-border); border-radius: 50%; background: var(--color-control); color: var(--color-muted); cursor: pointer; }
.settings-panel { position: absolute; z-index: 60; right: 0; top: 34px; width: 280px; max-height: calc(100vh - 68px); overflow: auto; padding: 16px; border: 1px solid var(--color-glass-border); border-radius: 14px; background: var(--color-glass); color: var(--color-text); box-shadow: 0 8px 30px #15233126; font-size: 13px; }
header, .setting-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
header { margin-bottom: 12px; } header button { border: 0; background: transparent; color: inherit; font-size: 21px; cursor: pointer; }
label { display: block; margin-top: 12px; } select { display: block; width: 100%; margin-top: 6px; padding: 7px; border: 1px solid var(--color-control-border); border-radius: 7px; background: var(--color-control); color: inherit; font: inherit; }
input { accent-color: var(--color-primary); } p { margin: 12px 0 0; color: var(--color-muted); line-height: 1.5; font-size: 12px; }
</style>
