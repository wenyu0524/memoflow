<script setup lang="ts">
import { Check } from '@lucide/vue';
import { useFeedbackStore } from '@/store/feedback/feedbackStore';

const feedbackStore = useFeedbackStore();
</script>

<template>
  <Transition name="toast">
    <div v-if="feedbackStore.savedVisible" class="save-toast" role="status" aria-live="polite">
      <Check :size="14" />
      <span>已保存</span>
    </div>
  </Transition>
</template>

<style scoped>
.save-toast {
  position: absolute;
  right: 18px;
  bottom: 16px;
  z-index: 8;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid var(--color-control-border);
  border-radius: 999px;
  color: var(--color-text);
  background: var(--color-control);
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.14);
  font-size: 12px;
  font-weight: 600;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>

