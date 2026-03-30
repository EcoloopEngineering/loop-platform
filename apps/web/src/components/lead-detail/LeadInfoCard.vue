<template>
  <div>
    <!-- Back link -->
    <a class="back-link q-mb-sm inline-block cursor-pointer" @click="$router.back()" role="button" aria-label="Go back to previous page" tabindex="0" @keyup.enter="$router.back()">
      <q-icon name="chevron_left" size="18px" aria-hidden="true" />
      <span>Back</span>
    </a>

    <!-- Lead Header with name, badges, action buttons -->
    <LeadHeaderCard
      :lead="lead"
      @quick-action="(type: string) => emit('quickAction', type)"
      @open-schedule="dialogs?.openSchedule()"
      @open-change-order="dialogs?.openChangeOrder()"
      @open-cap="dialogs?.openCap()"
      @open-lost="dialogs?.openLost()"
      @open-cancelled="dialogs?.openCancelled()"
    />

    <!-- Deal info: stage, owner, PM, fields -->
    <LeadDealInfo
      :lead="lead"
      :lead-id="leadId"
      @stage-changed="(stage: string) => emit('stageChanged', stage)"
    />

    <!-- All dialogs: Change Order, CAP, Lost, Cancelled, Schedule -->
    <LeadDialogs
      ref="dialogs"
      :lead-id="leadId"
      @file-added="(file) => emit('fileAdded', file)"
      @status-changed="(status: string) => emit('statusChanged', status)"
      @refresh="emit('refresh')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Lead, Document } from '@/types/api';
import LeadHeaderCard from './LeadHeaderCard.vue';
import LeadDealInfo from './LeadDealInfo.vue';
import LeadDialogs from './LeadDialogs.vue';

defineProps<{
  lead: Lead;
  leadId: string;
}>();

const emit = defineEmits<{
  (e: 'quickAction', type: string): void;
  (e: 'stageChanged', stage: string): void;
  (e: 'fileAdded', file: Document): void;
  (e: 'statusChanged', status: string): void;
  (e: 'refresh'): void;
}>();

const dialogs = ref<InstanceType<typeof LeadDialogs> | null>(null);
</script>

<style lang="scss" scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #6B7280;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.15s;

  &:hover {
    color: #1A1A2E;
  }
}

.inline-block {
  display: inline-block;
}
</style>
