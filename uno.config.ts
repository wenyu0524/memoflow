import { defineConfig, presetAttributify, presetUno } from 'unocss';

export default defineConfig({
  presets: [presetUno(), presetAttributify()],
  theme: {
    colors: {
      primary: '#6C8EFF',
      accent: '#9B8CFF',
      success: '#63D471',
      warning: '#FFB84D',
      error: '#FF5E5E',
    },
  },
});

