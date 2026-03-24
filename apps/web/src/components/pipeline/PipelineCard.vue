<template>
  <q-card
    flat
    bordered
    class="pipeline-card cursor-pointer q-mb-sm"
    @click="$router.push(`/crm/leads/${lead.id}`)"
  >
    <q-card-section class="q-pa-sm">
      <div class="text-subtitle2 text-weight-bold ellipsis">
        {{ titleCase(lead.customerName) }}
      </div>

      <div class="row items-center q-mt-xs q-gutter-x-sm">
        <q-badge
          :color="scoreColor"
          text-color="white"
          class="text-caption"
        >
          {{ lead.leadScore }}pts
        </q-badge>
        <span class="text-caption text-grey-6">{{ formatSource(lead.leadSource) }}</span>
      </div>

      <div class="text-caption text-grey-5 q-mt-xs">
        {{ timeAgo }}
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { titleCase } from '@/utils/format';
import type { PipelineLead } from '@/stores/pipeline.store';

const props = defineProps<{
  lead: PipelineLead;
}>();

const scoreColor = computed(() => {
  if (props.lead.leadScore >= 70) return 'positive';
  if (props.lead.leadScore >= 40) return 'warning';
  return 'grey-6';
});

function formatSource(s: string) {
  return (s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const timeAgo = computed(() => {
  const diff = Date.now() - new Date(props.lead.createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
});
</script>

<style lang="scss" scoped>
.pipeline-card {
  border-radius: 10px;
  transition: box-shadow 0.2s;
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}
</style>
