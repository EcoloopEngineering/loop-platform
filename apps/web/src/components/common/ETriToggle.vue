<template>
  <div
    role="switch"
    tabindex="0"
    class="tri-toggle"
    :class="positionClass"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
    :aria-checked="modelValue === null ? 'mixed' : String(modelValue)"
  >
    <div class="tri-toggle-track">
      <div class="tri-toggle-thumb" />
    </div>
    <span v-if="label" class="tri-toggle-label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label?: string;
  modelValue: boolean | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const positionClass = computed(() => {
  if (props.modelValue === null) return 'tri-toggle--neutral';
  return props.modelValue ? 'tri-toggle--true' : 'tri-toggle--false';
});

function toggle() {
  emit('update:modelValue', props.modelValue !== true);
}
</script>

<style lang="scss" scoped>
$thumb-size: 18px;
$thumb-gap: 3px;

.tri-toggle {
  gap: 8px;
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;

  &:focus-visible .tri-toggle-track {
    box-shadow: 0 0 0 3px rgba(0, 137, 123, 0.15);
  }
}

.tri-toggle-track {
  width: 48px;
  height: 24px;
  position: relative;
  border-radius: 24px;
  transition: background 0.2s ease;
  background: var(--color-border);
}

.tri-toggle-thumb {
  top: $thumb-gap;
  width: $thumb-size;
  height: $thumb-size;
  position: absolute;
  border-radius: 50%;
  background: var(--color-card-bg);
  transition: left 0.2s ease;
  left: calc(50% - #{$thumb-size / 2});
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.tri-toggle--neutral .tri-toggle-thumb {
  left: calc(50% - #{$thumb-size / 2});
}

.tri-toggle--true {
  .tri-toggle-track {
    background: var(--color-primary);
  }

  .tri-toggle-thumb {
    left: calc(100% - #{$thumb-size} - #{$thumb-gap});
  }
}

.tri-toggle--false {
  .tri-toggle-track {
    background: #E57373;
  }

  .tri-toggle-thumb {
    left: $thumb-gap;
  }
}

.tri-toggle-label {
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
