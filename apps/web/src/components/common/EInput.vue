<template>
  <q-input
    v-bind="$attrs"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    outlined
    :dense="size !== 'lg'"
    :rules="rules"
    lazy-rules="ondemand"
    :class="['e-input', `e-input--${size}`]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>
  </q-input>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string | number | null;
  rules?: ((val: string) => boolean | string)[];
  size?: 'sm' | 'md' | 'lg';
}>();
defineEmits<{ 'update:modelValue': [value: string | number | null] }>();
</script>

<style lang="scss" scoped>
.e-input {
  :deep(.q-field__control) {
    border-radius: 8px;
    transition: border-color 150ms, box-shadow 150ms;

    &:hover {
      border-color: #9CA3AF;
    }
  }

  :deep(.q-field__control:focus-within) {
    border-color: #00897B;
    box-shadow: 0 0 0 3px rgba(0, 137, 123, 0.08);
  }

  :deep(.q-field__label) {
    color: #9CA3AF;
    font-size: 13px;
  }

  &--sm :deep(.q-field__control) {
    border-radius: 6px;
    min-height: 32px;
  }

  &--lg :deep(.q-field__control) {
    border-radius: 10px;
    min-height: 48px;
  }
}
</style>
