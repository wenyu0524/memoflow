import type { ThemeMode } from '@/types/settings';

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function resolveTheme(mode: ThemeMode) {
  if (mode === 'auto') {
    return darkQuery.matches ? 'dark' : 'light';
  }

  return mode;
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = resolveTheme(mode);
  document.documentElement.dataset.themeMode = mode;
}

export function watchSystemTheme(getMode: () => ThemeMode) {
  const listener = () => applyTheme(getMode());

  darkQuery.addEventListener('change', listener);

  return () => {
    darkQuery.removeEventListener('change', listener);
  };
}

