<template>
  <q-timeline color="primary" class="q-px-sm timeline-improved">
    <q-timeline-entry
      v-for="item in activities"
      :key="item.id"
      :icon="activityIcon(item.type)"
      :color="activityColor(item.type)"
      :class="{ 'stage-entry': isStageChange(item.type) }"
    >
      <template #subtitle>
        <div class="row items-center q-gutter-x-sm">
          <q-avatar v-if="item.userName" size="28px" color="grey-4" text-color="grey-8">
            <span class="text-caption" style="font-size: 10px">
              {{ initials(item.userName) }}
            </span>
          </q-avatar>
          <span class="text-caption text-grey-6">
            {{ formatDate(item.createdAt) }}
          </span>
          <q-badge v-if="isStageChange(item.type)" color="primary" text-color="white" class="text-10 q-ml-xs">
            Stage Change
          </q-badge>
        </div>
      </template>
      <div class="text-body2" :class="{ 'text-weight-medium': isStageChange(item.type) }">
        {{ item.description }}
      </div>
      <div v-if="activityLabel(item.type)" class="text-caption text-grey-5 q-mt-xs">
        {{ activityLabel(item.type) }}
      </div>
    </q-timeline-entry>

    <div v-if="activities.length === 0" class="text-grey-6 text-center q-pa-lg">
      <q-icon name="history" size="40px" color="grey-4" />
      <div class="q-mt-sm">No activity yet.</div>
    </div>
  </q-timeline>
</template>

<script setup lang="ts">
defineProps<{
  activities: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    userName?: string;
    metadata?: Record<string, unknown>;
  }[];
}>();

// Maps both UPPER_CASE (backend enum) and lower_case (legacy) formats
const ICONS: Record<string, string> = {
  STAGE_CHANGE: 'swap_horiz',
  NOTE_ADDED: 'sticky_note_2',
  DOCUMENT_UPLOADED: 'attach_file',
  ASSIGNMENT_CHANGED: 'group',
  SCORE_UPDATED: 'analytics',
  DESIGN_REQUESTED: 'architecture',
  DESIGN_COMPLETED: 'check_circle',
  APPOINTMENT_BOOKED: 'event',
  APPOINTMENT_COMPLETED: 'event_available',
  COMMISSION_CALCULATED: 'payments',
  EMAIL_SENT: 'email',
  CALL_LOGGED: 'phone',
  HUBSPOT_SYNCED: 'sync',
  // Legacy lowercase keys
  stage_change: 'swap_horiz',
  note: 'sticky_note_2',
  document: 'attach_file',
  appointment: 'event',
  call: 'phone',
  email: 'email',
};

const COLORS: Record<string, string> = {
  STAGE_CHANGE: 'primary',
  NOTE_ADDED: 'amber-8',
  DOCUMENT_UPLOADED: 'blue',
  ASSIGNMENT_CHANGED: 'teal',
  SCORE_UPDATED: 'indigo',
  DESIGN_REQUESTED: 'deep-purple',
  DESIGN_COMPLETED: 'positive',
  APPOINTMENT_BOOKED: 'purple',
  APPOINTMENT_COMPLETED: 'purple',
  COMMISSION_CALCULATED: 'green-8',
  EMAIL_SENT: 'orange',
  CALL_LOGGED: 'positive',
  HUBSPOT_SYNCED: 'grey-7',
  // Legacy
  stage_change: 'primary',
  note: 'amber-8',
  document: 'blue',
  appointment: 'purple',
  call: 'positive',
  email: 'orange',
};

const LABELS: Record<string, string> = {
  DESIGN_REQUESTED: 'Aurora design requested',
  DESIGN_COMPLETED: 'Design completed',
  COMMISSION_CALCULATED: 'Commission calculated',
  HUBSPOT_SYNCED: 'Synced with HubSpot',
  SCORE_UPDATED: 'Lead score updated',
};

function activityIcon(type: string) {
  return ICONS[type] ?? 'circle';
}

function activityColor(type: string) {
  return COLORS[type] ?? 'grey-6';
}

function activityLabel(type: string) {
  return LABELS[type] ?? '';
}

function isStageChange(type: string) {
  return type === 'STAGE_CHANGE' || type === 'stage_change';
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style lang="scss" scoped>
.timeline-improved {
  :deep(.q-timeline__subtitle) {
    margin-bottom: 4px;
  }
}

.stage-entry {
  :deep(.q-timeline__dot) {
    box-shadow: 0 0 0 3px rgba(0, 137, 123, 0.15);
  }
}
</style>
