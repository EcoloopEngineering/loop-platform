<template>
  <q-btn
    v-bind="$attrs"
    :color="color"
    :text-color="textColor"
    unelevated
    no-caps
    :rounded="rounded"
    :padding="padding"
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
  letter-spacing: 0.02em;
  border-radius: 12px;
}
</style>
