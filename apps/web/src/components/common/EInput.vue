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
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>
  </q-input>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string | number | null;
  rules?: ((val: string) => boolean | string)[];
}>();
defineEmits<{ 'update:modelValue': [value: string | number | null] }>();
</script>

<style lang="scss" scoped>
.e-input {
  :deep(.q-field__control) {
    border-radius: 12px;
  }

  :deep(.q-field__label) {
    color: #9CA3AF;
  }
}
</style>
