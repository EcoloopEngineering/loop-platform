<template>
  <div class="wizard-stepper">
    <div class="row items-center justify-between q-px-md q-py-sm">
      <div
        v-for="(step, idx) in steps"
        :key="idx"
        class="wizard-step-indicator column items-center cursor-pointer"
        :class="{ 'is-active': modelValue === idx + 1, 'is-done': modelValue > idx + 1 }"
        @click="$emit('update:modelValue', idx + 1)"
      >
        <q-avatar
          :size="'32px'"
          :color="modelValue >= idx + 1 ? 'teal' : 'grey-4'"
          :text-color="modelValue >= idx + 1 ? 'white' : 'grey-7'"
          class="q-mb-xs"
        >
          <q-icon v-if="modelValue > idx + 1" name="check" size="16px" />
          <span v-else class="text-caption text-weight-bold">{{ idx + 1 }}</span>
        </q-avatar>
        <span
          class="text-caption"
          :class="modelValue >= idx + 1 ? 'text-teal text-weight-medium' : 'text-grey-6'"
        >
          {{ step.label }}
        </span>
      </div>
    </div>
    <q-linear-progress
      :value="modelValue / 5"
      color="teal"
      track-color="grey-3"
      size="3px"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: number;
}>();

defineEmits<{
  'update:modelValue': [step: number];
}>();

const steps = [
  { label: 'Contact', icon: 'person' },
  { label: 'Home', icon: 'home' },
  { label: 'Energy', icon: 'bolt' },
  { label: 'Design', icon: 'design_services' },
  { label: 'Review', icon: 'fact_check' },
];
</script>

<style lang="scss" scoped>
.wizard-stepper {
  background: white;
}
.wizard-step-indicator {
  flex: 1;
  min-width: 0;
  transition: opacity 0.2s;
}
</style>
