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
          :class="stepCircleClass(idx)"
          class="q-mb-xs step-circle"
        >
          <q-icon v-if="modelValue > idx + 1" name="check" size="16px" />
          <span v-else class="step-number">{{ idx + 1 }}</span>
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
      :value="modelValue / 3"
      color="teal"
      track-color="grey-3"
      size="3px"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: number;
}>();

defineEmits<{
  'update:modelValue': [step: number];
}>();

function stepCircleClass(idx: number) {
  if (props.modelValue > idx + 1) return 'step-done';
  if (props.modelValue === idx + 1) return 'step-active';
  return 'step-inactive';
}

const steps = [
  { label: 'Contact', icon: 'person' },
  { label: 'Home', icon: 'home' },
  { label: 'Review', icon: 'fact_check' },
];
</script>

<style lang="scss" scoped>
.wizard-stepper {
  background: white;
  padding-top: 12px;
  border-bottom: 1px solid #F3F4F6;
}

.wizard-step-indicator {
  flex: 1;
  min-width: 0;
  transition: all 0.2s ease;
  padding: 4px 0 8px;

  &.is-active {
    transform: scale(1.05);
  }

  span {
    font-size: 11px;
    letter-spacing: 0.02em;
  }
}

.step-circle {
  font-weight: 700;
}

.step-number {
  font-size: 13px;
  font-weight: 700;
}

.step-active {
  background: #00897B !important;
  color: #FFFFFF !important;
}

.step-done {
  background: #00897B !important;
  color: #FFFFFF !important;
}

.step-inactive {
  background: #D1D5DB !important;
  color: #4B5563 !important;
}

.body--dark {
  .step-inactive {
    background: #3A4050 !important;
    color: #E8ECF1 !important;
  }
}
</style>
