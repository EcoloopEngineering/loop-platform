<template>
  <q-page class="lead-detail-page">
    <!-- Loading state -->
    <div v-if="leadStore.loading && !lead" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Not found -->
    <div v-else-if="!lead" class="text-grey-6 text-center q-pa-xl">
      Lead not found.
    </div>

    <!-- Main layout -->
    <div v-else class="row q-col-gutter-md">
      <!-- LEFT SIDEBAR -->
      <div class="col-12 col-md-3">
        <LeadInfoCard
          :lead="lead"
          :lead-id="id"
          @quick-action="onQuickAction"
          @stage-changed="onStageChange"
          @file-added="onFileAdded"
          @status-changed="onStatusChanged"
          @refresh="loadExtras"
        />
      </div>

      <!-- CENTER COLUMN -->
      <div class="col-12 col-md-6">
        <div class="center-card">
          <q-tabs v-model="activeTab" dense align="left" active-color="primary" indicator-color="primary" no-caps class="center-tabs">
            <q-tab name="activity" label="Activity" />
            <q-tab name="notes" label="Notes" />
            <q-tab name="tasks" label="Tasks" />
            <q-tab name="files" label="Files" />
            <q-tab name="commission" label="Commission" />
          </q-tabs>
          <q-separator />
          <q-tab-panels v-model="activeTab" animated class="center-panels">
            <LeadTimelineSection :activities="activities" />
            <LeadNotesSection :lead-id="id" :notes="notes" @note-added="onNoteAdded" @note-updated="onNoteUpdated" @note-deleted="onNoteDeleted" />
            <LeadTasksSection :tasks="leadTasks" @complete-task="completeTask" />
            <LeadDocumentsSection :lead-id="id" :documents="files" @file-added="onFileAdded" @file-deleted="onFileDeleted" />
            <LeadCommissionSection :lines="commissionLines" :total="commissionTotal" />
          </q-tab-panels>
        </div>
      </div>

      <!-- RIGHT SIDEBAR -->
      <div class="col-12 col-md-3 right-sidebar">
        <LeadAssignmentsSection :lead="lead" :lead-id="id" />
        <LeadAppointmentsSection :lead="lead" :lead-id="id" :appointments="appointments" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useLeadStore } from '@/stores/lead.store';
import { api } from '@/boot/axios';
import LeadInfoCard from '@/components/lead-detail/LeadInfoCard.vue';
import LeadTimelineSection from '@/components/lead-detail/LeadTimelineSection.vue';
import LeadAssignmentsSection from '@/components/lead-detail/LeadAssignmentsSection.vue';
import LeadNotesSection from '@/components/lead-detail/LeadNotesSection.vue';
import LeadDocumentsSection from '@/components/lead-detail/LeadDocumentsSection.vue';
import LeadAppointmentsSection from '@/components/lead-detail/LeadAppointmentsSection.vue';
import LeadTasksSection from '@/components/lead-detail/LeadTasksSection.vue';
import LeadCommissionSection from '@/components/lead-detail/LeadCommissionSection.vue';

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userName?: string;
  user?: { firstName: string; lastName: string };
  metadata?: { editedAt?: string; action?: string };
}

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

const lead = computed(() => leadStore.currentLead as Record<string, unknown> | null);
const activeTab = ref('activity');
const activities = ref<Activity[]>([]);
const notes = ref<NoteItem[]>([]);
const files = ref<FileItem[]>([]);
const leadTasks = ref<Array<{ id: string; title: string; status: string; dueDate?: string; assignee?: { firstName: string; lastName: string }; subtasks?: Array<{ id: string; title: string; status: string }> }>>([]);
const commissionLines = ref<{ label: string; value: string }[]>([]);
const commissionTotal = ref('$0');

const appointments = computed(() => {
  const raw = ((lead.value as Record<string, unknown> | null)?.appointments ?? []) as Array<Record<string, unknown>>;
  return raw.sort((a, b) => new Date(b.scheduledAt as string).getTime() - new Date(a.scheduledAt as string).getTime());
});

onMounted(async () => {
  await leadStore.fetchLead(props.id);
  loadExtras();
});

async function loadExtras() {
  const [timelineRes, docsRes, commRes] = await Promise.all([
    api.get<Activity[]>(`/leads/${props.id}/timeline`).catch(() => ({ data: [] as Activity[] })),
    api.get<FileItem[]>(`/leads/${props.id}/documents`).catch(() => ({ data: [] as FileItem[] })),
    api.get(`/leads/${props.id}/commissions`).catch(() => ({ data: [] })),
  ]);
  activities.value = Array.isArray(timelineRes.data) ? timelineRes.data : [];
  files.value = Array.isArray(docsRes.data) ? docsRes.data : [];
  notes.value = activities.value
    .filter((a) => a.type === 'NOTE_ADDED' && a.description !== '[deleted]' && !a.metadata?.action)
    .map((a) => ({
      id: a.id,
      body: a.description,
      userName: a.userName ?? (a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown'),
      createdAt: a.createdAt,
      editedAt: a.metadata?.editedAt,
    }));
  const commData = commRes.data as Record<string, unknown>;
  commissionLines.value = (commData?.lines ?? []) as { label: string; value: string }[];
  commissionTotal.value = (commData?.total as string) ?? '$0';
  fetchLeadTasks();
}

async function fetchLeadTasks() {
  try {
    const { data } = await api.get('/tasks', { params: { leadId: props.id } });
    leadTasks.value = Array.isArray(data) ? data : ((data as Record<string, unknown>).data ?? []) as typeof leadTasks.value;
  } catch { leadTasks.value = []; }
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
    await leadStore.changeStage(props.id, newStage);
    $q.notify({ type: 'positive', message: 'Stage updated' });
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
  padding: 24px;
  min-height: 100vh;
}

.center-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.center-tabs :deep(.q-tab) {
  font-weight: 600;
  font-size: 13px;
}

.center-panels {
  min-height: 400px;
  :deep(.q-tab-panel) { padding: 20px; }
}

.right-sidebar {
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding-bottom: 24px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
}
</style>
