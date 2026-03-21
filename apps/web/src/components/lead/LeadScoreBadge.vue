<template>
  <div class="lead-score-badge">
    <div class="row items-center q-mb-xs">
      <span class="text-h5 text-weight-bold" :style="{ color: tierColor }">
        {{ tierLabel }}
      </span>
      <q-space />
      <span class="text-h4 text-weight-bold" :style="{ color: tierColor }">
        {{ score }}%
      </span>
    </div>
    <q-linear-progress
      :value="score / 100"
      :color="progressColor"
      track-color="grey-3"
      size="10px"
      rounded
      class="q-mb-xs"
    />
    <p class="text-caption text-grey-6 q-mb-none">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  score: number;
  tier?: string;
}>();

const tierLabel = computed(() => {
  if (props.tier) return props.tier;
  if (props.score >= 70) return 'Hot Lead';
  if (props.score >= 40) return 'Warm Lead';
  return 'Cold Lead';
});

const tierColor = computed(() => {
  if (props.score >= 70) return '#00897b';
  if (props.score >= 40) return '#f57c00';
  return '#757575';
});

const progressColor = computed(() => {
  if (props.score >= 70) return 'teal';
  if (props.score >= 40) return 'orange';
  return 'grey-6';
});

const description = computed(() => {
  if (props.score >= 70) return 'This lead has strong indicators for solar adoption. Prioritize follow-up.';
  if (props.score >= 40) return 'This lead shows moderate potential. Gather more details to improve the score.';
  return 'This lead needs more qualification data to determine viability.';
});
</script>

<style lang="scss" scoped>
.lead-score-badge {
  padding: 16px;
  border-radius: 12px;
  background: white;
}
</style>
