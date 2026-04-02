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
        <div class="step-circle q-mb-xs" :class="stepCircleClass(idx)">
          <svg :viewBox="`0 0 ${SVG_VIEW_BOX} ${SVG_VIEW_BOX}`" :width="CIRCLE_SIZE" :height="CIRCLE_SIZE">
            <!-- Background circle -->
            <circle
              :cx="SVG_CENTER"
              :cy="SVG_CENTER"
              :r="CIRCLE_RADIUS"
              fill="none"
              :stroke="circleTrackColor(idx)"
              :stroke-width="STROKE_WIDTH"
            />
            <!-- Progress arc -->
            <circle
              :cx="SVG_CENTER"
              :cy="SVG_CENTER"
              :r="CIRCLE_RADIUS"
              fill="none"
              stroke="var(--color-primary)"
              :stroke-width="STROKE_WIDTH"
              stroke-linecap="round"
              :stroke-dasharray="`${stepProgress(idx) * CIRCUMFERENCE} ${CIRCUMFERENCE}`"
              :opacity="stepProgress(idx) > 0 ? 1 : 0"
              :transform="`rotate(-90 ${SVG_CENTER} ${SVG_CENTER})`"
              class="progress-arc"
            />
          </svg>
          <div class="step-label">
            <q-icon v-if="stepProgress(idx) >= 1" name="check" size="14px" color="teal" />
            <span v-else class="step-number">{{ idx + 1 }}</span>
          </div>
        </div>
        <span
          class="text-caption"
          :class="modelValue >= idx + 1 ? 'text-teal text-weight-medium' : 'text-grey-6'"
        >
          {{ step.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const CIRCLE_SIZE = 32;
const SVG_VIEW_BOX = 36;
const SVG_CENTER = SVG_VIEW_BOX / 2;
const CIRCLE_RADIUS = 16;
const STROKE_WIDTH = 3;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const props = defineProps<{
  modelValue: number;
  progress?: number[];
}>();

defineEmits<{
  'update:modelValue': [step: number];
}>();

function stepProgress(idx: number): number {
  return props.progress?.[idx] ?? (props.modelValue > idx + 1 ? 1 : 0);
}

function stepCircleClass(idx: number) {
  if (props.modelValue === idx + 1) return 'step-active';
  if (stepProgress(idx) >= 1) return 'step-done';
  return 'step-inactive';
}

function circleTrackColor(idx: number) {
  if (props.modelValue === idx + 1) return 'var(--color-primary-light)';
  return 'var(--color-border)';
}

const steps = [
  { label: 'Contact' },
  { label: 'Home' },
  { label: 'Energy' },
  { label: 'Design' },
  { label: 'Review' },
];
</script>

<style lang="scss" scoped>
.wizard-stepper {
  background: var(--color-card-bg);
  padding-top: 12px;
  border-bottom: 1px solid var(--color-border-light);
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
  position: relative;
  width: 32px;
  height: 32px;
}

.step-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-number {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.step-active .step-number,
.step-done .step-number {
  color: var(--color-primary);
}

.progress-arc {
  transition: stroke-dasharray 0.3s ease, opacity 0.15s ease;
}</style>
