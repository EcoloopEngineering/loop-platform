<template>
  <q-card flat class="sidebar-card q-mb-md">
    <q-card-section>
      <h1 class="customer-name q-mt-none q-mb-xs">
        {{ titleCase((lead.customer?.firstName ?? '') + ' ' + (lead.customer?.lastName ?? '')) }}
      </h1>

      <div class="row items-center q-gutter-x-sm q-mb-md">
        <q-badge
          :style="{ backgroundColor: stageColor(lead.currentStage) }"
          class="stage-badge"
          text-color="white"
        >
          {{ formatStage(lead.currentStage) }}
        </q-badge>
        <q-badge
          v-if="lead.status === 'LOST'"
          color="red"
          text-color="white"
          class="stage-badge"
        >
          LOST
        </q-badge>
        <q-badge
          v-if="lead.status === 'CANCELLED'"
          color="grey-6"
          text-color="white"
          class="stage-badge"
        >
          CANCELLED
        </q-badge>
        <q-badge v-if="lead.source" outline color="grey-6" class="source-badge">
          {{ formatSource(lead.source) }}
        </q-badge>
      </div>

      <div class="action-bar">
        <q-btn flat dense no-caps icon="sticky_note_2" label="Note" size="sm" color="grey-7" class="action-item" aria-label="Add a note to this lead" @click="emit('quickAction', 'note')" />
        <q-btn flat dense no-caps icon="email" label="Email" size="sm" color="grey-7" class="action-item" aria-label="Send email to lead" @click="emit('quickAction', 'email')" />
        <q-btn flat dense no-caps icon="phone" label="Call" size="sm" color="grey-7" class="action-item" aria-label="Call lead" @click="emit('quickAction', 'call')" />
        <q-btn flat dense no-caps icon="event" label="Schedule" size="sm" color="grey-7" class="action-item" aria-label="Schedule an appointment" @click="emit('openSchedule')" />
        <q-separator vertical class="q-mx-xs" style="height: 20px" />
        <LeadQuickActions
          :lead-status="lead.status"
          @change-order="emit('openChangeOrder')"
          @generate-cap="emit('openCap')"
          @send-email="emit('quickAction', 'email')"
          @mark-lost="emit('openLost')"
          @mark-cancelled="emit('openCancelled')"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { Lead } from '@/types/api';
import { titleCase, useLeadFormatting } from '@/composables/useLeadFormatting';
import LeadQuickActions from './LeadQuickActions.vue';

defineProps<{
  lead: Lead;
}>();

const emit = defineEmits<{
  (e: 'quickAction', type: string): void;
  (e: 'openSchedule'): void;
  (e: 'openChangeOrder'): void;
  (e: 'openCap'): void;
  (e: 'openLost'): void;
  (e: 'openCancelled'): void;
}>();

const { stageColor, formatStage, formatSource } = useLeadFormatting();
</script>

<style lang="scss" scoped>
.customer-name {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A2E;
  margin: 0;
  line-height: 1.3;
}

.stage-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.source-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 0;
  border-top: 1px solid #F3F4F6;
  margin-top: 8px;

  .action-item {
    border-radius: 8px;
    font-size: 12px;
    padding: 4px 8px;
    min-height: 32px;

    :deep(.q-btn__content) {
      flex-wrap: nowrap;
      gap: 4px;
    }

    &:hover {
      background: #F3F4F6;
      color: #00897B !important;
    }
  }
}

.sidebar-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 16px;

  &.q-card {
    padding: 0;
    box-shadow: none;
  }
}
</style>
