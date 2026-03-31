<template>
  <q-avatar :size="size" :color="bgColor" text-color="white" :style="{ fontSize: fontSize, flexShrink: '0' }">
    <q-img v-if="avatarUrl" :src="avatarUrl" :style="{ borderRadius: '50%' }" />
    <span v-else :style="{ fontSize, fontWeight: '600', lineHeight: '1' }">{{ initials }}</span>
  </q-avatar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { API_URL } from '@/config/api';

const props = withDefaults(
  defineProps<{
    userId?: string | null;
    name?: string;
    size?: string;
    color?: string;
    /** Pass the profileImage URL if known — avoids HEAD request */
    avatarSrc?: string | null;
  }>(),
  {
    userId: null,
    name: '',
    size: '36px',
    color: 'primary',
    avatarSrc: null,
  },
);

const avatarUrl = computed(() => {
  if (props.avatarSrc) {
    return props.avatarSrc.startsWith('/api/')
      ? `${API_URL}${props.avatarSrc}`
      : props.avatarSrc;
  }
  return null;
});

const bgColor = computed(() => props.color);

const fontSize = computed(() => {
  const px = parseInt(props.size);
  if (px <= 28) return '11px';
  if (px <= 36) return '13px';
  return '16px';
});

const initials = computed(() => {
  if (!props.name) return '?';
  return props.name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});
</script>

<style lang="scss" scoped>
</style>
