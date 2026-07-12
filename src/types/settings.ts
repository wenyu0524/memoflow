export type ThemeMode = 'light' | 'dark' | 'auto';

export interface AppSettings {
  themeMode: ThemeMode;
  alwaysOnTop: boolean;
  editingLocked: boolean;
  window: {
    x: number | null;
    y: number | null;
    width: number;
    height: number;
  };
}
