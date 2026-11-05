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
  background: var(--color-glass);
}
</style>
