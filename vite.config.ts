import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), UnoCSS()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    strictPort: true,
    port: 1420,
    watch: {
      ignored: ['**/src-tauri/target/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
});
