<script setup lang="ts">
defineProps<{
  checked: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
}>();
</script>

<template>
  <button
    class="circle-checkbox"
    :class="{ checked }"
    type="button"
    :disabled="disabled"
    :aria-pressed="checked"
    :aria-label="checked ? '标记为未完成' : '标记为完成'"
    @click="emit('toggle')"
  >
    <svg v-if="checked" class="completed-icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <circle cx="9" cy="9" r="9" />
      <path d="M5 9.15 7.65 11.75 13.15 6.25" />
    </svg>
  </button>
</template>

<style scoped>
.circle-checkbox {
  display: grid;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  place-items: center;
  padding: 0;
  border: 1.4px solid var(--color-line);
  border-radius: 50%;
  color: white;
  background: transparent;
  cursor: pointer;
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    background 150ms ease,
    box-shadow 150ms ease;
}

.circle-checkbox:hover {
  box-shadow: 0 4px 12px rgba(99, 212, 113, 0.18);
}

.circle-checkbox:active {
  transform: scale(0.88);
}

.circle-checkbox.checked {
  border: 0;
  background: transparent;
}

.completed-icon {
  display: block;
  width: 18px;
  height: 18px;
}

.completed-icon circle {
  fill: var(--color-success);
}

.completed-icon path {
  fill: none;
  stroke: white;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.circle-checkbox:disabled {
  cursor: default;
  opacity: 0.62;
}
</style>
