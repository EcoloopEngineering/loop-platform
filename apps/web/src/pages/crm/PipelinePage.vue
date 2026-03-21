<template>
  <q-page class="q-pa-md">
    <h5 class="q-my-none text-weight-bold q-mb-md">Pipeline</h5>

    <PipelineFilters
      :source-options="sourceOptions"
      :user-options="userOptions"
      @change="onFilterChange"
    />

    <PipelineBoard
      :stages="stages"
      :loading="pipelineStore.loading"
      @stage-change="onStageChange"
    />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { usePipelineStore } from '@/stores/pipeline.store';
import PipelineBoard from '@/components/pipeline/PipelineBoard.vue';
import PipelineFilters from '@/components/pipeline/PipelineFilters.vue';
import type { PipelineFilterValues } from '@/components/pipeline/PipelineFilters.vue';

const pipelineStore = usePipelineStore();

const stages = computed(() => pipelineStore.pipelineData?.stages ?? []);

const sourceOptions = [
  { label: 'Referral', value: 'referral' },
  { label: 'Website', value: 'website' },
  { label: 'Form', value: 'form' },
  { label: 'Manual', value: 'manual' },
];

const userOptions = [
  { label: 'Me', value: 'me' },
];

onMounted(() => {
  pipelineStore.fetchPipelineView();
});

function onFilterChange(filters: PipelineFilterValues) {
  pipelineStore.fetchPipelineView({
    search: filters.search || undefined,
    source: filters.source ?? undefined,
    assignedTo: filters.assignedTo ?? undefined,
    dateFrom: filters.dateFrom ?? undefined,
    dateTo: filters.dateTo ?? undefined,
  });
}

async function onStageChange(payload: { leadId: string; toStage: string }) {
  const lead = stages.value
    .flatMap((s) => s.leads)
    .find((l) => l.id === payload.leadId);
  const fromStage = lead?.stage;
  if (fromStage) {
    await pipelineStore.moveLeadStage(payload.leadId, fromStage, payload.toStage);
  }
}
</script>
