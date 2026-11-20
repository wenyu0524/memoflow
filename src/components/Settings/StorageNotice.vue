<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { isTauriRuntime } from '@/utils/environment/isTauri';
import { retryFailedWrites, storageStatus } from '@/utils/storage/jsonStorage';
const status = ref(storageStatus());
const nativeRecovery = ref('');
const retrying = ref(false);
const refresh = () => { status.value = storageStatus(); };
let stop: (() => void) | undefined;
let disposed = false;
async function retry() { retrying.value = true; try { await retryFailedWrites(); } catch { /* Keep the visible failure notice. */ } finally { retrying.value = false; } }
onMounted(async () => {
  window.addEventListener('memoflow-storage-status', refresh);
  if (isTauriRuntime()) {
    const unlisten = await listen<string>('storage-recovered', event => { nativeRecovery.value = event.payload + ' 已从备份恢复，损坏文件已保留。'; });
    if (disposed) unlisten(); else stop = unlisten;
  }
});
onUnmounted(() => { disposed = true; stop?.(); window.removeEventListener('memoflow-storage-status', refresh); });
</script>
<template>
  <aside v-if="status.failedFiles.length || status.readError || status.recovery || nativeRecovery" class="storage-notice" role="alert">
    <span v-if="status.failedFiles.length">{{ status.failedFiles.join('、') }} 尚未保存，请保留应用并重试。</span>
    <span v-else>{{ status.readError || status.recovery || nativeRecovery }}</span>
    <button v-if="status.failedFiles.length" type="button" :disabled="retrying" @click="retry">{{ retrying ? '重试中…' : '重试保存' }}</button>
  </aside>
</template>
<style scoped>
.storage-notice { position: fixed; z-index: 100; bottom: 12px; left: 12px; right: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border: 1px solid #d7b68d; border-radius: 10px; color: #6b4727; background: #fff6e7; font-size: 12px; }
button { flex-shrink: 0; padding: 6px 10px; border: 1px solid #c9ad84; border-radius: 6px; background: white; color: inherit; cursor: pointer; }
</style>
