<template>
  <div class="pipeline-board">
    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <div v-else-if="stages.length === 0" class="text-center text-grey-6 q-pa-xl">
      No pipeline stages found.
    </div>

    <div v-else class="board-scroll row no-wrap q-gutter-md">
      <PipelineColumn
        v-for="stage in stages"
        :key="stage.id"
        :stage="stage"
        @stage-change="onStageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PipelineColumn from './PipelineColumn.vue';
import type { PipelineStage } from '@/stores/pipeline.store';

defineProps<{
  stages: PipelineStage[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  'stage-change': [payload: { leadId: string; toStage: string }];
}>();

function onStageChange(payload: { leadId: string; toStage: string }) {
  emit('stage-change', payload);
}
</script>

<style lang="scss" scoped>
.pipeline-board {
  width: 100%;
  overflow: hidden;
}

.board-scroll {
  overflow-x: auto;
  padding-bottom: 16px;
  min-height: 400px;
  align-items: flex-start;
}
</style>
