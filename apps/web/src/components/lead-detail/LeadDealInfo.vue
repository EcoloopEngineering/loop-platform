<template>
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
              aria-label="Change deal stage"
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
              aria-label="Change lead owner"
              @filter="(val: string, update: (fn: () => void) => void) => filterUsers(val, update, 'owner')"
              @update:model-value="onOwnerChange"
            >
              <template #no-option>
                <q-item><q-item-section class="text-grey-5">No users found</q-item-section></q-item>
              </template>
              <template #selected-item="scope">
                <div class="row items-center no-wrap gap-xs">
                  <q-avatar size="18px" color="primary" text-color="white" class="avatar-text-sm">
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
              aria-label="Change project manager"
              @filter="(val: string, update: (fn: () => void) => void) => filterUsers(val, update, 'pm')"
              @update:model-value="onPMChange"
            >
              <template #no-option>
                <q-item><q-item-section class="text-grey-5">No users found</q-item-section></q-item>
              </template>
              <template #selected-item="scope">
                <div v-if="scope.opt" class="row items-center no-wrap gap-xs">
                  <q-avatar size="18px" color="orange-8" text-color="white" class="avatar-text-sm">
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import { useLeadFormatting } from '@/composables/useLeadFormatting';
import type { Lead } from '@/types/api';

interface UserOption {
  id: string;
  label: string;
  email: string;
  role: string;
}

const props = defineProps<{
  lead: Lead;
  leadId: string;
}>();

const emit = defineEmits<{
  (e: 'stageChanged', stage: string): void;
}>();

const $q = useQuasar();
const { formatSource, tierColor } = useLeadFormatting();

// ---- Stage Options ----
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

initAssignments();
loadUsers();

watch(() => props.lead.assignments, () => initAssignments(), { deep: true });

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

.tier-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
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
