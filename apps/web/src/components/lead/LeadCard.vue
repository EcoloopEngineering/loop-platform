<template>
  <q-card
    flat
    bordered
    class="lead-card cursor-pointer q-mb-sm"
    @click="$router.push(`/leads/${lead.id}`)"
  >
    <q-card-section class="q-pa-md">
      <div class="row items-center no-wrap">
        <div class="col">
          <div class="text-subtitle1 text-weight-bold ellipsis">
            {{ lead.firstName }} {{ lead.lastName }}
          </div>
          <div class="row items-center q-mt-xs q-gutter-x-sm">
            <q-icon :name="sourceIcon" size="16px" color="grey-6" />
            <q-badge
              :color="stageColor"
              text-color="white"
              :label="lead.stage"
              class="text-caption"
            />
          </div>
        </div>

        <div class="text-right">
          <div class="text-subtitle2 text-weight-bold" :class="scoreTextClass">
            {{ scorePercent }}%
          </div>
          <div class="text-caption text-grey-5">{{ timeAgo }}</div>
        </div>

        <q-icon name="chevron_right" color="grey-5" class="q-ml-sm" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Lead } from '@/stores/lead.store';

const props = defineProps<{
  lead: Lead & { score?: number; leadSource?: string };
}>();

const STAGE_COLORS: Record<string, string> = {
  // Closer
  NEW_LEAD: 'positive', ALREADY_CALLED: 'light-green', CONNECTED: 'blue',
  REQUEST_DESIGN: 'light-blue', DESIGN_IN_PROGRESS: 'orange', DESIGN_READY: 'purple', WON: 'teal',
  // PM
  SITE_AUDIT: 'deep-orange', PROGRESS_REVIEW: 'pink', NTP: 'purple', ENGINEERING: 'indigo',
  PERMIT_AND_ICE: 'blue', FINAL_APPROVAL: 'cyan', INSTALL_READY: 'teal', INSTALL: 'positive',
  COMMISSION: 'light-green', SITE_COMPLETE: 'lime', INITIAL_SUBMISSION_AND_INSPECTION: 'amber',
  WAITING_FOR_PTO: 'orange', FINAL_SUBMISSION: 'deep-orange', CUSTOMER_SUCCESS: 'positive',
  // Finance
  FIN_TICKETS_OPEN: 'blue', FIN_IN_PROGRESS: 'orange', FIN_POST_INITIAL_NURTURE: 'purple', FIN_TICKETS_CLOSED: 'positive',
  // Maintenance
  MAINT_TICKETS_OPEN: 'blue', MAINT_IN_PROGRESS: 'orange', MAINT_POST_INSTALL_NURTURE: 'purple', MAINT_TICKETS_CLOSED: 'positive',
  // Legacy lowercase (backwards compat)
  new: 'blue', contacted: 'orange', qualified: 'purple', proposal: 'cyan', won: 'positive', lost: 'negative',
};

const SOURCE_ICONS: Record<string, string> = {
  referral: 'share',
  website: 'language',
  form: 'description',
  manual: 'edit',
};

const stageColor = computed(() => STAGE_COLORS[props.lead.stage] ?? 'grey-6');
const sourceIcon = computed(
  () => SOURCE_ICONS[props.lead.source ?? ''] ?? 'person_add',
);

const scorePercent = computed(() => {
  const s = (props.lead as { score?: number }).score;
  return s ?? 0;
});

const scoreTextClass = computed(() => {
  if (scorePercent.value >= 70) return 'text-positive';
  if (scorePercent.value >= 40) return 'text-warning';
  return 'text-grey-6';
});

const timeAgo = computed(() => {
  const diff = Date.now() - new Date(props.lead.createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
});
</script>

<style lang="scss" scoped>
.lead-card {
  border-radius: 12px;
  transition: box-shadow 0.2s;
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}
</style>
