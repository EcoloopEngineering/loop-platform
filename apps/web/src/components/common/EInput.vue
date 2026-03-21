<template>
  <q-input
    v-bind="$attrs"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    outlined
    dense
    :rules="rules"
    lazy-rules
    class="e-input"
  >
    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
      <slot :name="slot" v-bind="slotProps ?? {}" />
    </template>
  </q-input>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string | number | null;
  rules?: ((val: string) => boolean | string)[];
}>();

defineEmits<{
  'update:modelValue': [value: string | number | null];
}>();
</script>

<style lang="scss" scoped>
.e-input {
  :deep(.q-field__control) {
    border-radius: 12px;
  }
}
</style>
