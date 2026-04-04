<template>
  <div class="row q-col-gutter-sm items-center q-mb-md">
    <div class="col-12 col-sm-3">
      <q-input
        v-model="filters.search"
        dense
        outlined
        placeholder="Search leads..."
        class="filter-input"
        @update:model-value="emitChange"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
        <template v-if="filters.search" #append>
          <q-icon
            name="close"
            class="cursor-pointer"
            @click="filters.search = ''; emitChange()"
          />
        </template>
      </q-input>
    </div>

    <div class="col-6 col-sm-2">
      <q-select
        v-model="filters.source"
        dense
        outlined
        :options="sourceOptions"
        label="Source"
        emit-value
        map-options
        clearable
        class="filter-input"
        @update:model-value="emitChange"
      />
    </div>

    <div v-if="!hideAssigned" class="col-6 col-sm-2">
      <q-select
        v-model="filters.assignedTo"
        dense
        outlined
        :options="userOptions"
        label="Assigned to"
        emit-value
        map-options
        clearable
        class="filter-input"
        @update:model-value="emitChange"
      />
    </div>

    <div class="col-6 col-sm-2">
      <q-input
        v-model="filters.dateFrom"
        dense
        outlined
        type="date"
        label="From"
        class="filter-input"
        @update:model-value="emitChange"
      />
    </div>

    <div class="col-6 col-sm-2">
      <q-input
        v-model="filters.dateTo"
        dense
        outlined
        type="date"
        label="To"
        :min="filters.dateFrom || undefined"
        class="filter-input"
        @update:model-value="onDateToChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

export interface PipelineFilterValues {
  search: string;
  source: string | null;
  assignedTo: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

defineProps<{
  sourceOptions?: { label: string; value: string }[];
  userOptions?: { label: string; value: string }[];
  hideAssigned?: boolean;
}>();

const emit = defineEmits<{
  change: [filters: PipelineFilterValues];
}>();

const filters = reactive<PipelineFilterValues>({
  search: '',
  source: null,
  assignedTo: null,
  dateFrom: null,
  dateTo: null,
});

function emitChange() {
  emit('change', { ...filters });
}

function onDateToChange() {
  if (filters.dateFrom && filters.dateTo && filters.dateTo < filters.dateFrom) {
    filters.dateTo = filters.dateFrom;
  }
  emitChange();
}
</script>

<style lang="scss" scoped>
.filter-input {
  :deep(.q-field__control) {
    border-radius: 10px;
  }
}
</style>
