import { defineStore } from 'pinia';
import type { AppSettings, ThemeMode } from '@/types/settings';
import { applyTheme } from '@/utils/theme/applyTheme';
import { readJsonFile, writeJsonFile } from '@/utils/storage/jsonStorage';

interface ThemeState {
  mode: ThemeMode;
  settings: AppSettings | null;
  loaded: boolean;
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    mode: 'auto',
    settings: null,
    loaded: false,
  }),
  actions: {
    async hydrate() {
      if (this.loaded) {
        return;
      }

      const settings = await readJsonFile('settings');

      this.settings = settings;
      this.mode = settings.themeMode;
      this.loaded = true;
      applyTheme(this.mode);
    },
    async setMode(mode: ThemeMode) {
      this.mode = mode;
      applyTheme(mode);

      const nextSettings: AppSettings = {
        ...(this.settings ?? {
          themeMode: 'auto',
          alwaysOnTop: false,
          editingLocked: false,
          window: {
            x: null,
            y: null,
            width: 650,
            height: 420,
          },
        }),
        themeMode: mode,
      };

      this.settings = nextSettings;
      await writeJsonFile('settings', nextSettings);
    },
    async setAlwaysOnTop(alwaysOnTop: boolean) {
      if (!this.settings) {
        await this.hydrate();
      }

      const nextSettings: AppSettings = {
        ...(this.settings as AppSettings),
        alwaysOnTop,
      };

      this.settings = nextSettings;
      await writeJsonFile('settings', nextSettings);
    },
    async setEditingLocked(editingLocked: boolean) {
      if (!this.settings) {
        await this.hydrate();
      }

      const nextSettings: AppSettings = {
        ...(this.settings as AppSettings),
        editingLocked,
      };

      this.settings = nextSettings;
      await writeJsonFile('settings', nextSettings);
    },
  },
});
