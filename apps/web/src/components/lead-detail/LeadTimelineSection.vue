<template>
  <q-tab-panel name="activity">
    <LeadTimeline :activities="activities" />
  </q-tab-panel>
</template>

<script setup lang="ts">
import LeadTimeline from '@/components/lead/LeadTimeline.vue';

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userName?: string;
}

defineProps<{
  activities: Activity[];
}>();
</script>

<style lang="scss" scoped>
</style>
