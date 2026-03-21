<template>
  <div class="e-header row items-center q-pa-md">
    <q-btn
      v-if="showBack"
      flat
      round
      dense
      icon="arrow_back"
      class="q-mr-sm"
      @click="handleBack"
    />
    <h6 class="q-my-none text-weight-bold col">{{ title }}</h6>
    <slot name="right" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const props = withDefaults(
  defineProps<{
    title: string;
    showBack?: boolean;
    backTo?: string;
  }>(),
  {
    showBack: true,
  },
);

const router = useRouter();

function handleBack() {
  if (props.backTo) {
    router.push(props.backTo);
  } else if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/home');
  }
}
</script>

<style lang="scss" scoped>
.e-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
