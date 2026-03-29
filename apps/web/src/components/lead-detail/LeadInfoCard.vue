<template>
  <div>
    <!-- Back link -->
    <a class="back-link q-mb-sm inline-block cursor-pointer" @click="$router.back()">
      <q-icon name="chevron_left" size="18px" />
      <span>Back</span>
    </a>

    <!-- Lead Header Card -->
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
          <q-btn flat dense no-caps icon="sticky_note_2" label="Note" size="sm" color="grey-7" class="action-item" @click="emit('quickAction', 'note')" />
          <q-btn flat dense no-caps icon="email" label="Email" size="sm" color="grey-7" class="action-item" @click="emit('quickAction', 'email')" />
          <q-btn flat dense no-caps icon="phone" label="Call" size="sm" color="grey-7" class="action-item" @click="emit('quickAction', 'call')" />
          <q-btn flat dense no-caps icon="event" label="Schedule" size="sm" color="grey-7" class="action-item" @click="showScheduleDialog = true" />
          <q-separator vertical class="q-mx-xs" style="height: 20px" />
          <q-btn flat dense round icon="more_horiz" size="sm" color="grey-7">
            <q-menu>
              <q-list dense style="min-width: 180px">
                <q-item clickable v-close-popup @click="showChangeOrderDialog = true">
                  <q-item-section avatar><q-icon name="description" color="orange-8" size="18px" /></q-item-section>
                  <q-item-section>Change Order</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="showCapDialog = true">
                  <q-item-section avatar><q-icon name="verified" color="purple" size="18px" /></q-item-section>
                  <q-item-section>Generate CAP</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="emit('quickAction', 'email')">
                  <q-item-section avatar><q-icon name="forward_to_inbox" size="18px" /></q-item-section>
                  <q-item-section>Send Email</q-item-section>
                </q-item>
                <q-separator />
                <q-item v-if="lead.status !== 'LOST'" clickable v-close-popup @click="showLostDialog = true">
                  <q-item-section avatar><q-icon name="cancel" color="red" size="18px" /></q-item-section>
                  <q-item-section class="text-red">Mark as Lost</q-item-section>
                </q-item>
                <q-item v-if="lead.status !== 'CANCELLED'" clickable v-close-popup @click="showCancelledDialog = true">
                  <q-item-section avatar><q-icon name="block" color="grey-6" size="18px" /></q-item-section>
                  <q-item-section class="text-grey-7">Mark as Cancelled</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>

        <!-- Change Order Dialog -->
        <q-dialog v-model="showChangeOrderDialog" persistent>
          <q-card style="min-width: 420px; border-radius: 16px">
            <q-card-section><div class="text-h6 text-weight-bold">Generate Change Order</div></q-card-section>
            <q-card-section class="q-gutter-md q-pt-none">
              <q-input v-model="changeOrderNote" label="Changes (one per line)" type="textarea" outlined autogrow />
              <q-input v-model="changeOrderNotes" label="Additional notes" outlined dense />
            </q-card-section>
            <q-card-actions align="right" class="q-pa-md">
              <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
              <q-btn unelevated no-caps label="Generate PDF" color="orange-8" :loading="generatingDoc" @click="generateChangeOrder" style="border-radius: 10px" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- CAP Dialog -->
        <q-dialog v-model="showCapDialog" persistent>
          <q-card style="min-width: 420px; border-radius: 16px">
            <q-card-section><div class="text-h6 text-weight-bold">Generate CAP</div></q-card-section>
            <q-card-section class="q-gutter-md q-pt-none">
              <q-option-group v-model="capMode" :options="[{ label: 'Send for e-signature (ZapSign)', value: 'approval' }, { label: 'Send informative email', value: 'informative' }]" color="primary" />
              <q-input v-model="capSystemSize" label="System Size (kW)" outlined dense />
              <q-input v-model="capMonthlyPayment" label="Monthly Payment" outlined dense />
            </q-card-section>
            <q-card-actions align="right" class="q-pa-md">
              <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
              <q-btn unelevated no-caps label="Generate CAP" color="purple" :loading="generatingDoc" @click="generateCAP" style="border-radius: 10px" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Mark as Lost Dialog -->
        <q-dialog v-model="showLostDialog" persistent>
          <q-card style="min-width: 420px; border-radius: 16px">
            <q-card-section><div class="text-h6 text-weight-bold">Mark as Lost</div></q-card-section>
            <q-card-section class="q-pt-none">
              <q-input v-model="lostReason" label="Reason for losing this lead" type="textarea" outlined autogrow />
            </q-card-section>
            <q-card-actions align="right" class="q-pa-md">
              <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
              <q-btn unelevated no-caps label="Mark as Lost" color="red" :loading="markingStatus" @click="markAsLost" style="border-radius: 10px" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Mark as Cancelled Dialog -->
        <q-dialog v-model="showCancelledDialog" persistent>
          <q-card style="min-width: 420px; border-radius: 16px">
            <q-card-section><div class="text-h6 text-weight-bold">Mark as Cancelled</div></q-card-section>
            <q-card-section class="q-pt-none">
              <q-input v-model="cancelledReason" label="Reason for cancellation" type="textarea" outlined autogrow />
            </q-card-section>
            <q-card-actions align="right" class="q-pa-md">
              <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
              <q-btn unelevated no-caps label="Mark as Cancelled" color="grey-7" :loading="markingStatus" @click="markAsCancelled" style="border-radius: 10px" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Schedule Dialog -->
        <q-dialog v-model="showScheduleDialog" persistent>
          <q-card style="min-width: 420px; border-radius: 16px">
            <q-card-section><div class="text-h6 text-weight-bold">Schedule Appointment</div></q-card-section>
            <q-card-section class="q-gutter-md q-pt-none">
              <q-select v-model="scheduleType" :options="['SITE_AUDIT', 'INSTALLATION']" label="Type" outlined dense />
              <q-input v-model="scheduleDate" label="Date & Time" type="datetime-local" outlined dense />
              <q-input v-model="scheduleDuration" label="Duration (minutes)" type="number" outlined dense />
              <q-input v-model="scheduleNotes" label="Notes" outlined dense />
            </q-card-section>
            <q-card-actions align="right" class="q-pa-md">
              <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
              <q-btn unelevated no-caps label="Book Appointment" color="blue" :loading="scheduling" @click="bookAppointment" style="border-radius: 10px" />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </q-card-section>
    </q-card>

    <!-- About this deal Card -->
    <q-card flat class="sidebar-card">
      <q-expansion-item
        default-opened
        header-class="about-header"
        expand-icon-class="text-grey-6"
      >
        <template #header>
          <q-item-section>
            <span class="section-title">About this deal</span>
          </q-item-section>
        </template>

        <q-card-section class="q-pt-none">
          <div class="about-fields">
            <div class="field-row">
              <div class="field-label">Deal Stage</div>
              <q-select
                v-model="localStage"
                :options="stageOptions"
                emit-value
                map-options
                dense
                borderless
                class="field-select"
                @update:model-value="onStageChange"
              />
            </div>

            <div class="field-row">
              <div class="field-label">Source</div>
              <div class="field-value">{{ formatSource(lead.source) || '--' }}</div>
            </div>

            <div class="field-row">
              <div class="field-label">Monthly Bill</div>
              <div class="field-value">
                {{ lead.property?.monthlyBill ? '$' + lead.property.monthlyBill : '--' }}
              </div>
            </div>

            <div class="field-row">
              <div class="field-label">System Size</div>
              <div class="field-value">{{ lead.kw ? lead.kw + ' kW' : '--' }}</div>
            </div>

            <div class="field-row">
              <div class="field-label">EPC</div>
              <div class="field-value">{{ lead.epc ? '$' + lead.epc : '--' }}</div>
            </div>

            <div class="field-row">
              <div class="field-label">Financier</div>
              <div class="field-value">{{ lead.financier || '--' }}</div>
            </div>

            <q-separator class="q-my-sm" />

            <!-- Owner -->
            <div class="field-row">
              <div class="field-label">Lead Owner</div>
              <q-select
                v-model="selectedOwner"
                :options="filteredUsers('owner')"
                option-value="id"
                option-label="label"
                emit-value
                map-options
                dense
                borderless
                use-input
                input-debounce="200"
                class="field-select"
                :loading="loadingUsers"
                @filter="(val: string, update: (fn: () => void) => void) => filterUsers(val, update, 'owner')"
                @update:model-value="onOwnerChange"
              >
                <template #no-option>
                  <q-item><q-item-section class="text-grey-5">No users found</q-item-section></q-item>
                </template>
                <template #selected-item="scope">
                  <div class="row items-center no-wrap" style="gap: 6px">
                    <q-avatar size="18px" color="primary" text-color="white" style="font-size: 9px">
                      {{ scope.opt?.label?.charAt(0) || '?' }}
                    </q-avatar>
                    <span class="text-caption">{{ scope.opt?.label || 'Unassigned' }}</span>
                  </div>
                </template>
              </q-select>
            </div>

            <!-- Project Manager -->
            <div class="field-row">
              <div class="field-label">Project Manager</div>
              <q-select
                v-model="selectedPM"
                :options="filteredUsers('pm')"
                option-value="id"
                option-label="label"
                emit-value
                map-options
                dense
                borderless
                use-input
                clearable
                input-debounce="200"
                class="field-select"
                :loading="loadingUsers"
                @filter="(val: string, update: (fn: () => void) => void) => filterUsers(val, update, 'pm')"
                @update:model-value="onPMChange"
              >
                <template #no-option>
                  <q-item><q-item-section class="text-grey-5">No users found</q-item-section></q-item>
                </template>
                <template #selected-item="scope">
                  <div v-if="scope.opt" class="row items-center no-wrap" style="gap: 6px">
                    <q-avatar size="18px" color="orange-8" text-color="white" style="font-size: 9px">
                      {{ scope.opt?.label?.charAt(0) || '?' }}
                    </q-avatar>
                    <span class="text-caption">{{ scope.opt?.label }}</span>
                  </div>
                  <span v-else class="text-caption text-grey-5">Not assigned</span>
                </template>
              </q-select>
            </div>

            <q-separator class="q-my-sm" />

            <div class="field-row">
              <div class="field-label">Score</div>
              <div class="field-value row items-center q-gutter-x-xs no-wrap">
                <span>{{ lead.leadScore?.total ?? '--' }}</span>
                <q-badge
                  v-if="lead.leadScore?.tier"
                  :style="{ backgroundColor: tierColor(lead.leadScore.tier) }"
                  text-color="white"
                  class="tier-badge"
                >
                  {{ lead.leadScore.tier }}
                </q-badge>
              </div>
            </div>

            <div class="field-row">
              <div class="field-label">Created</div>
              <div class="field-value">{{ formatDate(lead.createdAt) }}</div>
            </div>

            <div class="field-row">
              <div class="field-label">Last updated</div>
              <div class="field-value">{{ formatDate(lead.updatedAt) }}</div>
            </div>
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import { titleCase } from '@/composables/useLeadFormatting';
import { useLeadFormatting } from '@/composables/useLeadFormatting';

interface LeadData {
  [key: string]: unknown;
  currentStage: string;
  status?: string;
  source?: string;
  kw?: number;
  epc?: number;
  financier?: string;
  createdAt?: string;
  updatedAt?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  property?: {
    monthlyBill?: number;
  };
  leadScore?: {
    total?: number;
    tier?: string;
  };
  assignments?: Array<{
    isPrimary: boolean;
    userId: string;
    user?: { firstName: string; lastName: string; email: string };
  }>;
  projectManagerId?: string;
  projectManager?: { id: string; firstName: string; lastName: string; email: string };
}

interface UserOption {
  id: string;
  label: string;
  email: string;
  role: string;
}

const props = defineProps<{
  lead: LeadData;
  leadId: string;
}>();

const emit = defineEmits<{
  (e: 'quickAction', type: string): void;
  (e: 'stageChanged', stage: string): void;
  (e: 'fileAdded', file: { id: string; name: string; url: string; size?: number; createdAt?: string }): void;
  (e: 'statusChanged', status: string): void;
  (e: 'refresh'): void;
}>();

const $q = useQuasar();
const { stageColor, formatStage, formatSource, tierColor } = useLeadFormatting();

// ---- Stage ----
const CLOSER_STAGES = [
  { label: 'New Lead', value: 'NEW_LEAD' },
  { label: 'Already Called', value: 'ALREADY_CALLED' },
  { label: 'Connected', value: 'CONNECTED' },
  { label: 'Request Design', value: 'REQUEST_DESIGN' },
  { label: 'Design In Progress', value: 'DESIGN_IN_PROGRESS' },
  { label: 'Design Ready', value: 'DESIGN_READY' },
  { label: 'Won', value: 'WON' },
];

const PM_STAGES = [
  { label: 'Site Audit', value: 'SITE_AUDIT' },
  { label: 'Progress Review', value: 'PROGRESS_REVIEW' },
  { label: 'NTP', value: 'NTP' },
  { label: 'Engineering', value: 'ENGINEERING' },
  { label: 'Permit & ICE', value: 'PERMIT_AND_ICE' },
  { label: 'Final Approval', value: 'FINAL_APPROVAL' },
  { label: 'Install Ready', value: 'INSTALL_READY' },
  { label: 'Install', value: 'INSTALL' },
  { label: 'Commission', value: 'COMMISSION' },
  { label: 'Site Complete', value: 'SITE_COMPLETE' },
  { label: 'Initial Submission & Inspection', value: 'INITIAL_SUBMISSION_AND_INSPECTION' },
  { label: 'Waiting For PTO', value: 'WAITING_FOR_PTO' },
  { label: 'Final Submission', value: 'FINAL_SUBMISSION' },
  { label: 'Customer Success', value: 'CUSTOMER_SUCCESS' },
];

const FINANCE_STAGES = [
  { label: 'Tickets Open', value: 'FIN_TICKETS_OPEN' },
  { label: 'In Progress', value: 'FIN_IN_PROGRESS' },
  { label: 'Post Initial Nurture', value: 'FIN_POST_INITIAL_NURTURE' },
  { label: 'Tickets Closed', value: 'FIN_TICKETS_CLOSED' },
];

const MAINTENANCE_STAGES = [
  { label: 'Tickets Open', value: 'MAINT_TICKETS_OPEN' },
  { label: 'In Progress', value: 'MAINT_IN_PROGRESS' },
  { label: 'Post Install Nurture', value: 'MAINT_POST_INSTALL_NURTURE' },
  { label: 'Tickets Closed', value: 'MAINT_TICKETS_CLOSED' },
];

const localStage = ref(props.lead.currentStage);

watch(() => props.lead.currentStage, (val) => {
  localStage.value = val;
});

const stageOptions = computed(() => {
  const stage = props.lead.currentStage ?? '';
  if (PM_STAGES.some((s) => s.value === stage)) return PM_STAGES;
  if (FINANCE_STAGES.some((s) => s.value === stage)) return FINANCE_STAGES;
  if (MAINTENANCE_STAGES.some((s) => s.value === stage)) return MAINTENANCE_STAGES;
  return CLOSER_STAGES;
});

function onStageChange(newStage: string) {
  emit('stageChanged', newStage);
}

// ---- Owner & PM ----
const allUsers = ref<UserOption[]>([]);
const loadingUsers = ref(false);
const selectedOwner = ref<string | null>(null);
const selectedPM = ref<string | null>(null);
const ownerFilteredUsers = ref<UserOption[]>([]);
const pmFilteredUsers = ref<UserOption[]>([]);

function filteredUsers(which: string) {
  return which === 'owner' ? ownerFilteredUsers.value : pmFilteredUsers.value;
}

async function loadUsers() {
  if (allUsers.value.length > 0) return;
  loadingUsers.value = true;
  try {
    const { data } = await api.get('/users');
    const list = Array.isArray(data) ? data : (data as Record<string, unknown>).data ?? [];
    allUsers.value = (list as Array<Record<string, string>>).map((u) => ({
      id: u.id,
      label: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
    }));
  } catch { /* ignore */ }
  finally { loadingUsers.value = false; }
}

function filterUsers(val: string, update: (fn: () => void) => void, which: string) {
  loadUsers().then(() => {
    update(() => {
      const needle = (val || '').toLowerCase();
      const filtered = allUsers.value.filter(
        (u) => u.label.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle),
      );
      if (which === 'owner') ownerFilteredUsers.value = filtered;
      else pmFilteredUsers.value = filtered;
    });
  });
}

async function onOwnerChange(userId: string | null) {
  if (!userId) return;
  try {
    await api.post(`/leads/${props.leadId}/assign`, {
      userId,
      splitPct: 100,
      isPrimary: true,
    });
    $q.notify({ type: 'positive', message: 'Lead owner updated' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update owner' });
  }
}

async function onPMChange(pmId: string | null) {
  try {
    await api.post(`/leads/${props.leadId}/assign-pm`, { projectManagerId: pmId ?? null });
    $q.notify({ type: 'positive', message: pmId ? 'Project Manager assigned' : 'Project Manager removed' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update Project Manager' });
  }
}

// Initialize owner/PM from lead data
function initAssignments() {
  const assignments = props.lead.assignments ?? [];
  const primary = assignments.find((a) => a.isPrimary);
  if (primary) {
    selectedOwner.value = primary.userId;
    if (primary.user && !allUsers.value.find((u) => u.id === primary.userId)) {
      allUsers.value.push({
        id: primary.userId,
        label: `${primary.user.firstName} ${primary.user.lastName}`,
        email: primary.user.email,
        role: '',
      });
    }
  }
  selectedPM.value = props.lead.projectManagerId ?? null;
  if (selectedPM.value && props.lead.projectManager) {
    const pm = props.lead.projectManager;
    if (!allUsers.value.find((u) => u.id === selectedPM.value)) {
      allUsers.value.push({
        id: pm.id,
        label: `${pm.firstName} ${pm.lastName}`,
        email: pm.email,
        role: '',
      });
    }
  }
  ownerFilteredUsers.value = [...allUsers.value];
  pmFilteredUsers.value = [...allUsers.value];
}

// Run init immediately and also watch for lead changes
initAssignments();
loadUsers();

watch(() => props.lead.assignments, () => initAssignments(), { deep: true });

// ---- Change Order ----
const showChangeOrderDialog = ref(false);
const changeOrderNote = ref('');
const changeOrderNotes = ref('');
const generatingDoc = ref(false);

async function generateChangeOrder() {
  generatingDoc.value = true;
  try {
    const changes = changeOrderNote.value.split('\n').filter((l) => l.trim());
    const { data } = await api.post(`/leads/${props.leadId}/change-order`, {
      changes,
      notes: changeOrderNotes.value || undefined,
    });
    emit('fileAdded', { id: data.id, name: data.name, url: data.url, size: data.size, createdAt: new Date().toISOString() });
    showChangeOrderDialog.value = false;
    changeOrderNote.value = '';
    changeOrderNotes.value = '';
    $q.notify({ type: 'positive', message: 'Change Order generated' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to generate Change Order' });
  } finally {
    generatingDoc.value = false;
  }
}

// ---- CAP ----
const showCapDialog = ref(false);
const capMode = ref('approval');
const capSystemSize = ref('');
const capMonthlyPayment = ref('');

async function generateCAP() {
  generatingDoc.value = true;
  try {
    const { data } = await api.post(`/leads/${props.leadId}/cap`, {
      mode: capMode.value,
      systemSize: capSystemSize.value || undefined,
      monthlyPayment: capMonthlyPayment.value || undefined,
    });
    emit('fileAdded', { id: data.id, name: data.name, url: data.url, size: data.size, createdAt: new Date().toISOString() });
    showCapDialog.value = false;
    const msg = data.zapSign ? 'CAP sent for e-signature via ZapSign' : 'CAP generated and emailed';
    $q.notify({ type: 'positive', message: msg });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to generate CAP' });
  } finally {
    generatingDoc.value = false;
  }
}

// ---- Mark as Lost / Cancelled ----
const showLostDialog = ref(false);
const showCancelledDialog = ref(false);
const lostReason = ref('');
const cancelledReason = ref('');
const markingStatus = ref(false);

async function markAsLost() {
  markingStatus.value = true;
  try {
    await api.patch(`/leads/${props.leadId}/lost`, { reason: lostReason.value || undefined });
    emit('statusChanged', 'LOST');
    showLostDialog.value = false;
    lostReason.value = '';
    $q.notify({ type: 'positive', message: 'Lead marked as lost' });
    emit('refresh');
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to mark as lost' });
  } finally {
    markingStatus.value = false;
  }
}

async function markAsCancelled() {
  markingStatus.value = true;
  try {
    await api.patch(`/leads/${props.leadId}/cancel`, { reason: cancelledReason.value || undefined });
    emit('statusChanged', 'CANCELLED');
    showCancelledDialog.value = false;
    cancelledReason.value = '';
    $q.notify({ type: 'positive', message: 'Lead marked as cancelled' });
    emit('refresh');
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to mark as cancelled' });
  } finally {
    markingStatus.value = false;
  }
}

// ---- Scheduling ----
const showScheduleDialog = ref(false);
const scheduleType = ref('SITE_AUDIT');
const scheduleDate = ref('');
const scheduleDuration = ref(60);
const scheduleNotes = ref('');
const scheduling = ref(false);

async function bookAppointment() {
  if (!scheduleDate.value) {
    $q.notify({ type: 'warning', message: 'Please select a date and time' });
    return;
  }
  scheduling.value = true;
  try {
    await api.post(`/leads/${props.leadId}/appointments`, {
      type: scheduleType.value,
      scheduledAt: new Date(scheduleDate.value).toISOString(),
      duration: scheduleDuration.value,
      notes: scheduleNotes.value || undefined,
    });
    showScheduleDialog.value = false;
    scheduleDate.value = '';
    scheduleNotes.value = '';
    $q.notify({ type: 'positive', message: 'Appointment booked (synced with Jobber)' });
    emit('refresh');
  } catch (err: unknown) {
    const message = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Failed to book appointment';
    $q.notify({ type: 'negative', message });
  } finally {
    scheduling.value = false;
  }
}

// ---- Formatting ----
function formatDate(iso?: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
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

.tier-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
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

.about-header {
  padding: 8px 0;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #1A1A2E;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.about-fields {
  padding: 0 0 8px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #F3F4F6;

  &:last-child {
    border-bottom: none;
  }
}

.field-label {
  font-size: 13px;
  color: #6B7280;
  font-weight: 500;
  flex-shrink: 0;
  min-width: 100px;
}

.field-value {
  font-size: 13px;
  color: #1A1A2E;
  font-weight: 500;
  text-align: right;
}

.field-select {
  max-width: 160px;

  :deep(.q-field__control) {
    min-height: 28px;
  }

  :deep(.q-field__native) {
    font-size: 13px;
    color: #1A1A2E;
    font-weight: 500;
    padding: 0;
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

.inline-block {
  display: inline-block;
}
</style>
