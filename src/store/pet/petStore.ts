import { defineStore } from 'pinia';
import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '@/utils/environment/isTauri';

export const usePetStore = defineStore('pet', {
  state: () => ({ visible: false, busy: false, error: '' }),
  actions: {
    async hydrate() {
      if (isTauriRuntime()) {
        this.visible = await invoke<boolean>('get_pet_visibility');
      }
    },
    async setVisible(visible: boolean) {
      if (this.busy) return;
      this.busy = true;
      this.error = '';
      try {
        this.visible = isTauriRuntime()
          ? await invoke<boolean>('set_pet_visibility', { visible })
          : visible;
      } catch {
        this.error = '桌宠暂时无法显示或隐藏，请重试。';
      } finally {
        this.busy = false;
      }
    },
  },
});
