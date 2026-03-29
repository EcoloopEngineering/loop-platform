<template>
  <q-avatar :size="size" :color="bgColor" text-color="white" :style="{ fontSize: fontSize, flexShrink: '0' }">
    <q-img v-if="avatarUrl" :src="avatarUrl" :style="{ borderRadius: '50%' }" />
    <span v-else :style="{ fontSize, fontWeight: '600', lineHeight: '1' }">{{ initials }}</span>
  </q-avatar>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { API_URL } from '@/config/api';

const props = withDefaults(
  defineProps<{
    userId?: string | null;
    name?: string;
    size?: string;
    color?: string;
  }>(),
  {
    userId: null,
    name: '',
    size: '36px',
    color: 'primary',
  },
);

const apiBase = API_URL;
const avatarUrl = ref<string | null>(null);
const hasAvatar = ref(false);

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

onMounted(async () => {
  if (!props.userId) return;

  // Try to load avatar from API
  try {
    const url = `${apiBase}/api/v1/users/avatar/${props.userId}`;
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) {
      avatarUrl.value = url;
      hasAvatar.value = true;
    }
  } catch {
    // No avatar available
  }
});
</script>
