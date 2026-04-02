<template>
  <q-timeline color="primary" class="q-px-sm timeline-improved">
    <q-timeline-entry
      v-for="entry in enrichedActivities"
      :key="entry.id"
      :icon="activityIcon(entry.type)"
      :color="activityColor(entry.type)"
    >
      <template #subtitle>
        <div class="row items-center q-gutter-x-sm">
          <q-avatar v-if="entry.name" size="24px" color="grey-4" text-color="grey-8">
            <span style="font-size: 10px">{{ initials(entry.name) }}</span>
          </q-avatar>
          <span class="text-caption text-grey-6">{{ formatDate(entry.createdAt) }}</span>
          <q-badge v-if="isStageChange(entry.type)" color="primary" text-color="white" class="text-10">
            Stage Change
          </q-badge>
        </div>
      </template>
      <!-- Stage transition: From → To -->
      <div v-if="entry.transition" class="text-body2">
        <span v-if="entry.transition.label" class="text-grey-6">{{ entry.transition.label }} </span>
        <span v-if="entry.transition.from" class="stage-name">{{ entry.transition.from }}</span>
        <span v-if="entry.transition.from" class="text-grey-5"> &rarr; </span>
        <span class="stage-name">{{ entry.transition.to }}</span>
      </div>
      <!-- Default description -->
      <div v-else class="text-body2">{{ entry.description }}</div>
      <div v-if="activityLabel(entry.type)" class="text-caption text-grey-5 q-mt-xs">
        {{ activityLabel(entry.type) }}
      </div>
    </q-timeline-entry>

    <div v-if="activities.length === 0" class="text-grey-6 text-center q-pa-lg">
      <q-icon name="history" size="40px" color="grey-4" />
      <div class="q-mt-sm">No activity yet.</div>
    </div>
  </q-timeline>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type ActivityItem = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userName?: string;
  user?: { firstName: string; lastName: string };
  metadata?: Record<string, unknown>;
};

const props = defineProps<{ activities: ActivityItem[] }>();

interface Transition { label: string; from: string; to: string }
interface EnrichedEntry extends ActivityItem {
  name: string;
  transition: Transition | null;
}

const enrichedActivities = computed<EnrichedEntry[]>(() =>
  props.activities.map((a) => ({
    ...a,
    name: a.userName ?? (a.user ? `${a.user.firstName} ${a.user.lastName}` : ''),
    transition: isStageChange(a.type) ? parseTransition(a) : null,
  })),
);

function parseTransition(item: ActivityItem): Transition | null {
  const meta = item.metadata as Record<string, string> | null;
  if (meta?.fromStage && meta?.toStage) {
    return { label: '', from: stageName(meta.fromStage), to: stageName(meta.toStage) };
  }
  if (meta?.previousStage && meta?.newStage) {
    return { label: 'Auto: ', from: stageName(meta.previousStage), to: stageName(meta.newStage) };
  }
  if (meta?.stage) {
    return { label: 'Started at ', from: '', to: stageName(meta.stage) };
  }
  const match = item.description.match(/from\s+(\S+)\s+to\s+(\S+)/i);
  if (match) {
    return { label: '', from: stageName(match[1]), to: stageName(match[2]) };
  }
  return null;
}

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
  SITE_ANNOTATION: 'edit_location_alt',
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
  SITE_ANNOTATION: 'cyan-7',
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

const STAGE_NAMES: Record<string, string> = {
  NEW_LEAD: 'New Lead',
  ALREADY_CALLED: 'Already Called',
  CONNECTED: 'Connected',
  REQUEST_DESIGN: 'Request Design',
  DESIGN_IN_PROGRESS: 'Design In Progress',
  DESIGN_READY: 'Design Ready',
  PENDING_SIGNATURE: 'Pending Signature',
  SIT: 'SIT',
  WON: 'Won',
  LOST: 'Lost',
  SITE_AUDIT: 'Site Audit',
  PROGRESS_REVIEW: 'Progress Review',
  NTP: 'NTP',
  ENGINEERING: 'Engineering',
  PERMIT_AND_ICE: 'Permit & ICE',
  FINAL_APPROVAL: 'Final Approval',
  INSTALL_READY: 'Install Ready',
  INSTALL: 'Install',
  COMMISSION: 'Commission',
  SITE_COMPLETE: 'Site Complete',
  INITIAL_SUBMISSION_AND_INSPECTION: 'Initial Submission & Inspection',
  WAITING_FOR_PTO: 'Waiting For PTO',
  FINAL_SUBMISSION: 'Final Submission',
  CUSTOMER_SUCCESS: 'Customer Success',
  FIN_TICKETS_OPEN: 'Tickets Open',
  FIN_IN_PROGRESS: 'In Progress',
  FIN_POST_INITIAL_NURTURE: 'Post Initial Nurture',
  FIN_TICKETS_CLOSED: 'Tickets Closed',
  MAINT_TICKETS_OPEN: 'Tickets Open',
  MAINT_IN_PROGRESS: 'In Progress',
  MAINT_POST_INSTALL_NURTURE: 'Post Install Nurture',
  MAINT_TICKETS_CLOSED: 'Tickets Closed',
};

function stageName(raw: string) {
  return STAGE_NAMES[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isStageChange(type: string) {
  return type === 'STAGE_CHANGE' || type === 'stage_change';
}

function stageTransition(item: (typeof props.activities)[number]) {
  const meta = item.metadata as Record<string, string> | null;
  if (meta?.fromStage && meta?.toStage) {
    return { label: '', from: stageName(meta.fromStage), to: stageName(meta.toStage) };
  }
  if (meta?.previousStage && meta?.newStage) {
    return { label: 'Auto-transitioned: ', from: stageName(meta.previousStage), to: stageName(meta.newStage) };
  }
  if (meta?.stage) {
    return { label: 'Started at ', from: '', to: stageName(meta.stage) };
  }
  // Fallback: parse from description "Stage changed from X to Y"
  const match = item.description.match(/from\s+(\S+)\s+to\s+(\S+)/i);
  if (match) {
    return { label: '', from: stageName(match[1]), to: stageName(match[2]) };
  }
  return null;
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

.stage-name {
  font-weight: 700;
  color: #1A1A2E;
}
</style>
