<template>
  <q-btn
    v-bind="$attrs"
    :color="color"
    :text-color="textColor"
    :rounded="rounded"
    :padding="padding"
    unelevated
    no-caps
    class="e-btn"
  >
    <slot />
  </q-btn>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    color?: string;
    textColor?: string;
    rounded?: boolean;
    padding?: string;
  }>(),
  {
    color: 'primary',
    textColor: 'white',
    rounded: true,
    padding: '10px 24px',
  },
);
</script>

<style lang="scss" scoped>
.e-btn {
  font-weight: 600;
  letter-spacing: 0.01em;
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 137, 123, 0.25);
  }
}
</style>
