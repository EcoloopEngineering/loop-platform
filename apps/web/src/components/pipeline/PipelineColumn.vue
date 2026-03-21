<template>
  <div class="pipeline-column">
    <div class="column-header row items-center q-mb-sm q-px-sm">
      <div
        class="color-dot q-mr-sm"
        :style="{ backgroundColor: stage.color }"
      />
      <span class="text-subtitle2 text-weight-bold col ellipsis">
        {{ stage.name }}
      </span>
      <q-badge :label="stage.leads.length" color="grey-4" text-color="grey-8" />
    </div>

    <div class="column-body">
      <draggable
        :list="stage.leads"
        group="pipeline"
        item-key="id"
        class="drag-area"
        ghost-class="ghost-card"
        @change="onDragChange"
      >
        <template #item="{ element }">
          <PipelineCard :lead="element" />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable';
import PipelineCard from './PipelineCard.vue';
import type { PipelineStage, PipelineLead } from '@/stores/pipeline.store';

const props = defineProps<{
  stage: PipelineStage;
}>();

const emit = defineEmits<{
  'stage-change': [payload: { leadId: string; toStage: string }];
}>();

function onDragChange(evt: { added?: { element: PipelineLead } }) {
  if (evt.added) {
    emit('stage-change', {
      leadId: evt.added.element.id,
      toStage: props.stage.id,
    });
  }
}
</script>

<style lang="scss" scoped>
.pipeline-column {
  min-width: 280px;
  max-width: 320px;
  flex-shrink: 0;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.column-body {
  flex: 1;
  overflow-y: auto;
  min-height: 100px;
}

.drag-area {
  min-height: 60px;
}

.ghost-card {
  opacity: 0.4;
}
</style>
