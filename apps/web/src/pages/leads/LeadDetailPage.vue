<template>
  <q-page class="lead-detail-page">
    <!-- Loading -->
    <div v-if="leadStore.loading && !lead" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="error" class="bg-negative text-white q-ma-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

    <!-- Not found -->
    <div v-else-if="!lead" class="text-grey-6 text-center q-pa-xl">
      Lead not found.
    </div>

    <!-- Main content -->
    <template v-else>
      <!-- HEADER — always full width -->
      <div class="lead-header">
        <div class="row items-center q-mb-xs">
          <a class="back-link cursor-pointer q-mr-sm" @click="$router.back()" tabindex="0" @keyup.enter="$router.back()">
            <q-icon name="chevron_left" size="20px" />
          </a>
          <h1 class="lead-name">
            {{ titleCase((lead.customer?.firstName ?? '') + ' ' + (lead.customer?.lastName ?? '')) }}
          </h1>
        </div>
        <div class="row items-center q-gutter-x-sm q-mb-sm">
          <q-badge :style="{ backgroundColor: stageColor(lead.currentStage) }" class="stage-badge" text-color="white">
            {{ formatStage(lead.currentStage) }}
          </q-badge>
          <q-badge v-if="lead.status === 'LOST'" color="red" text-color="white" class="stage-badge">LOST</q-badge>
          <q-badge v-if="lead.status === 'CANCELLED'" color="grey-6" text-color="white" class="stage-badge">CANCELLED</q-badge>
          <q-badge v-if="lead.source" outline color="grey-6" class="source-badge">{{ formatSource(lead.source) }}</q-badge>
        </div>
        <div class="action-bar">
          <q-btn flat dense no-caps icon="sticky_note_2" label="Note" size="sm" color="grey-7" class="action-btn" @click="onQuickAction('note')" />
          <q-btn flat dense no-caps icon="email" label="Email" size="sm" color="grey-7" class="action-btn" @click="onQuickAction('email')" />
          <q-btn flat dense no-caps icon="phone" label="Call" size="sm" color="grey-7" class="action-btn" @click="onQuickAction('call')" />
          <q-btn flat dense no-caps icon="event" label="Schedule" size="sm" color="grey-7" class="action-btn" @click="dialogs?.openSchedule()" />
          <q-separator vertical class="q-mx-xs" style="height: 20px" />
          <LeadQuickActions
            :lead-status="lead.status"
            @change-order="dialogs?.openChangeOrder()"
            @generate-cap="dialogs?.openCap()"
            @send-email="onQuickAction('email')"
            @mark-lost="dialogs?.openLost()"
            @mark-cancelled="dialogs?.openCancelled()"
          />
        </div>
      </div>

      <!-- BODY — 2 columns on desktop, stacked on mobile -->
      <div class="lead-body">
        <!-- SIDEBAR (desktop only — hidden on mobile, content goes into Details tab) -->
        <aside class="lead-sidebar gt-sm">
          <LeadDealInfo :lead="lead" :lead-id="id" @stage-changed="onStageChange" />
          <LeadAssignmentsSection :lead="lead" :lead-id="id" />
          <LeadAppointmentsSection :lead="lead" :lead-id="id" :appointments="appointments" />
        </aside>

        <!-- MAIN — tabs -->
        <div class="lead-main">
          <div class="main-card">
            <q-tabs v-model="activeTab" dense active-color="primary" indicator-color="primary" no-caps class="main-tabs" narrow-indicator mobile-arrows outside-arrows align="left">
              <q-tab name="activity" label="Activity" />
              <q-tab name="notes" label="Notes" />
              <q-tab name="tasks" label="Tasks" />
              <q-tab name="files" label="Files" />
              <q-tab name="commission" label="Commission" />
              <q-tab name="sitemap" label="Site Map" />
              <q-tab name="details" label="Details" class="lt-md" />
            </q-tabs>
            <q-separator />
            <q-tab-panels v-model="activeTab" animated class="main-panels">
              <q-tab-panel name="activity">
                <LeadTimeline :activities="activities" />
              </q-tab-panel>
              <q-tab-panel name="notes">
                <LeadNotesContent :lead-id="id" :notes="notes" @note-added="onNoteAdded" @note-updated="onNoteUpdated" @note-deleted="onNoteDeleted" />
              </q-tab-panel>
              <q-tab-panel name="tasks">
                <LeadTasksContent :tasks="leadTasks" @complete-task="completeTask" @task-updated="fetchLeadTasks" />
              </q-tab-panel>
              <q-tab-panel name="files">
                <LeadDocumentsContent :lead-id="id" :documents="files" @file-added="onFileAdded" @file-deleted="onFileDeleted" />
              </q-tab-panel>
              <q-tab-panel name="commission">
                <LeadCommissionContent :lines="commissionLines" :total="commissionTotal" />
              </q-tab-panel>
              <q-tab-panel name="sitemap">
                <LeadSiteMapSection :lead-id="id" :lead="(lead as Record<string, unknown>)" />
              </q-tab-panel>
              <!-- Details tab — mobile only, shows sidebar content -->
              <q-tab-panel name="details">
                <LeadDealInfo :lead="lead" :lead-id="id" @stage-changed="onStageChange" />
                <LeadAssignmentsSection :lead="lead" :lead-id="id" />
                <LeadAppointmentsSection :lead="lead" :lead-id="id" :appointments="appointments" />
              </q-tab-panel>
            </q-tab-panels>
          </div>
        </div>
      </div>

      <!-- Dialogs -->
      <LeadDialogs
        ref="dialogs"
        :lead-id="id"
        @file-added="(file) => onFileAdded(file)"
        @status-changed="onStatusChanged"
        @refresh="loadExtras"
      />
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useLeadStore } from '@/stores/lead.store';
import { useLeadApi } from '@/composables/useLeadApi';
import { api } from '@/boot/axios';
import { titleCase, useLeadFormatting } from '@/composables/useLeadFormatting';
import LeadTimeline from '@/components/lead/LeadTimeline.vue';
import LeadDealInfo from '@/components/lead-detail/LeadDealInfo.vue';
import LeadAssignmentsSection from '@/components/lead-detail/LeadAssignmentsSection.vue';
import LeadNotesContent from '@/components/lead-detail/LeadNotesSection.vue';
import LeadDocumentsContent from '@/components/lead-detail/LeadDocumentsSection.vue';
import LeadAppointmentsSection from '@/components/lead-detail/LeadAppointmentsSection.vue';
import LeadTasksContent from '@/components/lead-detail/LeadTasksSection.vue';
import LeadCommissionContent from '@/components/lead-detail/LeadCommissionSection.vue';
import LeadQuickActions from '@/components/lead-detail/LeadQuickActions.vue';
import LeadDialogs from '@/components/lead-detail/LeadDialogs.vue';
import LeadSiteMapSection from '@/components/lead-detail/LeadSiteMapSection.vue';

import type { Activity } from '@/types/api';

interface NoteItem {
  id: string;
  body: string;
  userName: string;
  createdAt: string;
  editedAt?: string;
}

interface FileItem {
  id: string;
  name: string;
  url: string;
  size?: number;
  createdAt?: string;
}

const props = defineProps<{ id: string }>();
const $q = useQuasar();
const leadStore = useLeadStore();
const leadApi = useLeadApi();
const { stageColor, formatStage, formatSource } = useLeadFormatting();

const lead = computed(() => leadStore.currentLead as Record<string, unknown> | null);
const error = ref<string | null>(null);
const activeTab = ref('activity');
const activities = ref<Activity[]>([]);
const notes = ref<NoteItem[]>([]);
const files = ref<FileItem[]>([]);
const leadTasks = ref<Array<{ id: string; title: string; status: string; dueDate?: string; assignee?: { firstName: string; lastName: string }; subtasks?: Array<{ id: string; title: string; status: string }> }>>([]);
const commissionLines = ref<{ label: string; value: string }[]>([]);
const commissionTotal = ref('$0');
const dialogs = ref<InstanceType<typeof LeadDialogs> | null>(null);

const appointments = computed(() => {
  const raw = ((lead.value as Record<string, unknown> | null)?.appointments ?? []) as Array<Record<string, unknown>>;
  return raw.sort((a, b) => new Date(b.scheduledAt as string).getTime() - new Date(a.scheduledAt as string).getTime());
});

async function loadData() {
  error.value = null;
  try {
    await leadStore.fetchLead(props.id);
    await loadExtras();
  } catch {
    error.value = 'Failed to load lead details. Please try again.';
  }
}

onMounted(() => { loadData(); });

async function loadExtras() {
  try {
    const [timelineData, docsData, commData] = await Promise.all([
      leadApi.fetchTimeline(props.id),
      leadApi.fetchDocuments(props.id),
      leadApi.fetchCommissions(props.id),
    ]);
    activities.value = timelineData as (typeof activities.value);
    files.value = docsData as FileItem[];
    notes.value = activities.value
      .filter((a) => a.type === 'NOTE_ADDED' && a.description !== '[deleted]' && !a.metadata?.action)
      .map((a) => ({
        id: a.id,
        body: a.description,
        userName: a.userName ?? (a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown'),
        createdAt: a.createdAt,
        editedAt: a.metadata?.editedAt,
      }));
    commissionLines.value = commData.lines;
    commissionTotal.value = commData.total;
    fetchLeadTasks();
  } catch {
    // safety net
  }
}

async function fetchLeadTasks() {
  leadTasks.value = await leadApi.fetchTasks(props.id) as typeof leadTasks.value;
}

async function completeTask(taskId: string) {
  try {
    await api.patch(`/tasks/${taskId}/complete`);
    $q.notify({ type: 'positive', message: 'Task completed!' });
    await fetchLeadTasks();
    await loadExtras();
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed';
    $q.notify({ type: 'negative', message: msg });
  }
}

function onQuickAction(type: string) {
  if (type === 'note') {
    activeTab.value = 'notes';
  } else if (type === 'email') {
    const email = (lead.value as Record<string, Record<string, string>> | null)?.customer?.email;
    if (email) window.open('mailto:' + email);
  } else if (type === 'call') {
    const phone = (lead.value as Record<string, Record<string, string>> | null)?.customer?.phone;
    if (phone) window.open('tel:' + phone);
  }
}

async function onStageChange(newStage: string) {
  try {
    const oldTaskCount = leadTasks.value.length;
    await leadStore.changeStage(props.id, newStage);
    await leadStore.fetchLead(props.id);
    await new Promise((r) => setTimeout(r, 1500));
    await fetchLeadTasks();
    await loadExtras();

    const newTaskCount = leadTasks.value.filter((t) => t.status !== 'COMPLETED').length;
    const created = newTaskCount - oldTaskCount;

    if (created > 0) {
      $q.notify({ type: 'positive', message: `Stage updated — ${created} new task${created > 1 ? 's' : ''} auto-created`, icon: 'task_alt', timeout: 4000 });
      activeTab.value = 'tasks';
    } else {
      $q.notify({ type: 'positive', message: 'Stage updated' });
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update stage' });
  }
}

function onStatusChanged(status: string) {
  if (lead.value) (lead.value as Record<string, unknown>).status = status;
}

function onFileAdded(file: FileItem) { files.value.unshift(file); }
function onFileDeleted(fileId: string) { files.value = files.value.filter((f) => f.id !== fileId); }
function onNoteAdded(note: NoteItem) { notes.value.unshift(note); }
function onNoteUpdated(note: NoteItem) {
  const idx = notes.value.findIndex((n) => n.id === note.id);
  if (idx !== -1) notes.value[idx] = note;
}
function onNoteDeleted(noteId: string) { notes.value = notes.value.filter((n) => n.id !== noteId); }
</script>

<style lang="scss" scoped>
.lead-detail-page {
  background: #F8FAFB;
  padding: 16px;
  min-height: 100vh;

  @media (min-width: 1024px) {
    padding: 24px;
  }
}

// ─── Header ──────────────────────────────────────────
.lead-header {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.back-link {
  color: #6B7280;
  transition: color 0.15s;
  &:hover { color: #1A1A2E; }
}

.lead-name {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A2E;
  margin: 0;
  line-height: 1.3;

  @media (min-width: 600px) {
    font-size: 24px;
  }
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
  flex-wrap: wrap;
  gap: 2px;
  padding-top: 10px;
  border-top: 1px solid #F3F4F6;
  margin-top: 8px;
}

.action-btn {
  border-radius: 8px;
  font-size: 12px;
  padding: 4px 8px;
  min-height: 32px;
  &:hover { background: #F3F4F6; color: #00897B !important; }
}

// ─── Body layout ─────────────────────────────────────
.lead-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

// Sidebar — only visible on md+ (>= 1024px)
.lead-sidebar {
  width: 300px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding-bottom: 16px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
}

// Main content — fills remaining space
.lead-main {
  flex: 1;
  min-width: 0;
}

.main-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.main-tabs {
  :deep(.q-tab) {
    font-weight: 600;
    font-size: 13px;
    padding: 0 10px;
    min-width: unset;
  }
}

.main-panels {
  min-height: 300px;
  :deep(.q-tab-panel) { padding: 16px; }

  @media (min-width: 600px) {
    min-height: 400px;
    :deep(.q-tab-panel) { padding: 20px; }
  }
}

// ─── Quasar responsive helpers ───────────────────────
// .gt-sm = display only when screen >= 1024 (md breakpoint)
// .lt-md = display only when screen < 1024
</style>
