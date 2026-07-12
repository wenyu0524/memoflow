<template>
  <section class="glass-card">
    <slot />
  </section>
</template>

<style scoped>
.glass-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-glass-border);
  border-radius: 20px;
  background: var(--color-glass);
  box-shadow: var(--shadow-widget);
}
</style>
