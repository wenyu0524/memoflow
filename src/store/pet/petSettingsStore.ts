import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { isTauriRuntime } from '@/utils/environment/isTauri';
import { readJsonFile, writeJsonFile } from '@/utils/storage/jsonStorage';
import { defaultPetSettings, normalizePetSettings, type PetSettings } from '@/utils/pet/petSettings';

export const usePetSettingsStore = defineStore('pet-settings', () => {
  const values = ref<PetSettings>({ ...defaultPetSettings });
  const loaded = ref(false);
  const error = ref('');
  let loading: Promise<void> | undefined;
  let pending = 0;
  let revision = 0;
  async function hydrate() {
    if (loaded.value) return;
    loading ??= (async () => {
      const readVersion = revision;
      const saved = await readJsonFile('petSettings');
      if (readVersion === revision) values.value = normalizePetSettings(saved);
      const canMigrate = !isTauriRuntime() || getCurrentWindow().label === 'main';
      let migrated = true;
      let old: string | null = null;
      try {
        migrated = Boolean(localStorage.getItem('memoflow-pet-settings-migrated'));
        old = localStorage.getItem('memoflow-pet-reminders');
      } catch { /* A blocked legacy web storage area must not prevent native JSON settings from loading. */ }
      if (canMigrate && !migrated) {
        if (old) {
          let parsed: unknown;
          try { parsed = JSON.parse(old); } catch { parsed = {}; }
          values.value = normalizePetSettings({ ...values.value, ...(parsed && typeof parsed === 'object' ? parsed : {}) });
          await writeJsonFile('petSettings', values.value);
        }
        try { localStorage.setItem('memoflow-pet-settings-migrated', '1'); } catch { /* JSON settings are already saved. */ }
      }
      loaded.value = true;
    })().catch(e => { loading = undefined; error.value = '桌宠设置读取失败，请重试。'; throw e; });
    return loading;
  }
  async function update(patch: Partial<PetSettings>) {
    try {
      await hydrate();
      values.value = normalizePetSettings({ ...values.value, ...patch });
      revision++;
      pending++;
      try { await writeJsonFile('petSettings', values.value); error.value = ''; }
      finally { pending--; }
    } catch { error.value = '桌宠设置未保存，请使用保存提示中的重试按钮。'; }
  }
  async function connect() {
    let disposed = false;
    let stopNative: (() => void) | undefined;
    const accept = (value: unknown) => { revision++; if (!pending) values.value = normalizePetSettings(value); };
    const storage = (event: StorageEvent) => {
      if (event.key === 'pet-settings.json' && event.newValue) {
        try { accept(JSON.parse(event.newValue)); } catch { error.value = '桌宠设置同步失败。'; }
      }
    };
    window.addEventListener('storage', storage);
    const stop = () => { disposed = true; stopNative?.(); window.removeEventListener('storage', storage); };
    try {
      if (isTauriRuntime()) {
        const unlisten = await listen('pet-settings-changed', event => accept(event.payload));
        if (disposed) unlisten(); else stopNative = unlisten;
      }
      await hydrate();
    } catch { error.value = '桌宠设置读取或同步失败，请重试。'; }
    return stop;
  }
  return { values, loaded, error, hydrate, update, connect };
});
