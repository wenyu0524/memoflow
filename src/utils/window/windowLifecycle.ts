import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { AppSettings } from '@/types/settings';
import { isTauriRuntime } from '@/utils/environment/isTauri';

export async function initializeWindowBehavior(settings: AppSettings | null) {
  if (!isTauriRuntime()) {
    return;
  }

  const appWindow = getCurrentWindow();
  await appWindow.setAlwaysOnTop(settings?.alwaysOnTop ?? false);
  await appWindow.setResizable(!(settings?.editingLocked ?? false));
}

export async function bindTrayWindowEvents(handlers: {
  togglePinned: () => void | Promise<void>;
  toggleLocked: () => void | Promise<void>;
}) {
  if (!isTauriRuntime()) {
    return () => {};
  }

  const unlistenPin = await listen('tray-toggle-pin', () => {
    void handlers.togglePinned();
  });
  const unlistenLock = await listen('tray-toggle-lock', () => {
    void handlers.toggleLocked();
  });

  return () => {
    unlistenPin();
    unlistenLock();
  };
}
