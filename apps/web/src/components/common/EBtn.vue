<template>
  <q-btn
    v-bind="$attrs"
    :color="variant === 'primary' ? 'primary' : undefined"
    :outline="variant === 'secondary'"
    :flat="variant === 'ghost' || variant === 'text'"
    :text-color="textColorComputed"
    :padding="paddingComputed"
    unelevated
    no-caps
    :class="['e-btn', `e-btn--${size}`, `e-btn--${variant}`, { 'e-btn--icon-only': !$slots.default && !$attrs.label }]"
  >
    <slot />
  </q-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'text';
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    variant: 'primary',
    size: 'md',
  },
);

const textColorComputed = computed(() => {
  if (props.variant === 'primary') return 'white';
  if (props.variant === 'danger') return 'red-6';
  if (props.variant === 'secondary') return 'primary';
  if (props.variant === 'ghost') return 'grey-8';
  return 'grey-8';
});

const paddingComputed = computed(() => {
  if (props.size === 'sm') return '6px 12px';
  if (props.size === 'lg') return '12px 28px';
  return '8px 20px';
});
</script>

<style lang="scss" scoped>
.e-btn {
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &--sm {
    font-size: 12px;
    border-radius: 6px;
    min-height: 32px;
  }

  &--md {
    font-size: 14px;
    border-radius: 8px;
    min-height: 38px;
  }

  &--lg {
    font-size: 15px;
    border-radius: 10px;
    min-height: 44px;
  }

  &--primary {
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 137, 123, 0.3);
    }
    &:active { transform: translateY(0); }
  }

  &--secondary {
    border: 1.5px solid #E5E7EB;
    &:hover {
      border-color: #00897B;
      background: rgba(0, 137, 123, 0.04);
    }
  }

  &--ghost {
    &:hover {
      background: #F3F4F6;
    }
  }

  &--danger {
    color: #EF4444;
    &:hover {
      background: rgba(239, 68, 68, 0.06);
    }
  }

  &--icon-only {
    aspect-ratio: 1;
    padding: 8px !important;
  }
}
</style>
