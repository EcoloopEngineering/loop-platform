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
          <div class="assignment-row">
            <div class="assignment-label">Lead Owner</div>
            <div class="assignment-value" @click="ownerEditing = true">
              <template v-if="!ownerEditing">
                <div v-if="ownerDisplay" class="row items-center no-wrap gap-xs cursor-pointer">
                  <q-avatar size="24px" color="primary" text-color="white" class="avatar-text-sm">
                    {{ ownerDisplay.charAt(0) }}
                  </q-avatar>
                  <span class="assignment-name">{{ ownerDisplay }}</span>
                  <q-icon name="expand_more" size="14px" color="grey-5" />
                </div>
                <span v-else class="text-caption text-grey-5 cursor-pointer">Click to assign</span>
              </template>
              <q-select
                v-if="ownerEditing"
                ref="ownerSelectRef"
                v-model="selectedOwner"
                :options="filteredUsers('owner')"
                option-value="id"
                option-label="label"
                emit-value
                map-options
                dense
                outlined
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                class="assignment-select"
                :loading="loadingUsers"
                placeholder="Search user..."
                @filter="(val: string, update: (fn: () => void) => void) => filterUsers(val, update, 'owner')"
                @update:model-value="(v: string | null) => { onOwnerChange(v); ownerEditing = false; }"
                @blur="ownerEditing = false"
                @keyup.escape="ownerEditing = false"
              >
                <template #no-option>
                  <q-item><q-item-section class="text-grey-5">No users found</q-item-section></q-item>
                </template>
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-avatar size="26px" color="primary" text-color="white" class="avatar-text-sm">
                        {{ scope.opt.label.charAt(0) }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
          </div>

          <!-- Project Manager -->
          <div class="assignment-row">
            <div class="assignment-label">Project Manager</div>
            <div class="assignment-value" @click="pmEditing = true">
              <template v-if="!pmEditing">
                <div v-if="pmDisplay" class="row items-center no-wrap gap-xs cursor-pointer">
                  <q-avatar size="24px" color="orange-8" text-color="white" class="avatar-text-sm">
                    {{ pmDisplay.charAt(0) }}
                  </q-avatar>
                  <span class="assignment-name">{{ pmDisplay }}</span>
                  <q-btn flat dense round icon="close" size="8px" color="grey-5" @click.stop="onPMChange(null); selectedPM = null">
                    <q-tooltip>Remove PM</q-tooltip>
                  </q-btn>
                </div>
                <span v-else class="text-caption text-grey-5 cursor-pointer">Click to assign</span>
              </template>
              <q-select
                v-if="pmEditing"
                ref="pmSelectRef"
                v-model="selectedPM"
                :options="filteredUsers('pm')"
                option-value="id"
                option-label="label"
                emit-value
                map-options
                dense
                outlined
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                class="assignment-select"
                :loading="loadingUsers"
                placeholder="Search user..."
                @filter="(val: string, update: (fn: () => void) => void) => filterUsers(val, update, 'pm')"
                @update:model-value="(v: string | null) => { onPMChange(v); pmEditing = false; }"
                @blur="pmEditing = false"
                @keyup.escape="pmEditing = false"
              >
                <template #no-option>
                  <q-item><q-item-section class="text-grey-5">No users found</q-item-section></q-item>
                </template>
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-avatar size="26px" color="orange-8" text-color="white" class="avatar-text-sm">
                        {{ scope.opt.label.charAt(0) }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
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
import { ref, computed, watch, nextTick } from 'vue';
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
const ownerEditing = ref(false);
const pmEditing = ref(false);
const ownerSelectRef = ref<InstanceType<typeof import('quasar').QSelect> | null>(null);
const pmSelectRef = ref<InstanceType<typeof import('quasar').QSelect> | null>(null);

const ownerDisplay = computed(() => {
  if (!selectedOwner.value) return '';
  const u = allUsers.value.find((u) => u.id === selectedOwner.value);
  return u?.label ?? '';
});

const pmDisplay = computed(() => {
  if (!selectedPM.value) return '';
  const u = allUsers.value.find((u) => u.id === selectedPM.value);
  return u?.label ?? '';
});

function filteredUsers(which: string) {
  return which === 'owner' ? ownerFilteredUsers.value : pmFilteredUsers.value;
}

let usersFetched = false;

async function loadUsers() {
  if (usersFetched) return;
  usersFetched = true;
  loadingUsers.value = true;
  try {
    const { data } = await api.get('/users');
    const list = Array.isArray(data) ? data : (data as Record<string, unknown>).data ?? [];
    const fetched = (list as Array<Record<string, string>>).map((u) => ({
      id: u.id,
      label: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
    }));
    // Merge: keep any pre-loaded users (from initAssignments) that weren't in the API response
    const fetchedIds = new Set(fetched.map((u) => u.id));
    const extra = allUsers.value.filter((u) => !fetchedIds.has(u.id));
    allUsers.value = [...fetched, ...extra];
  } catch {
    // If /users fails (e.g. role restriction), keep the pre-loaded users
  } finally {
    loadingUsers.value = false;
  }
}

function filterUsers(val: string, update: (fn: () => void) => void, which: string) {
  loadUsers().then(() => {
    update(() => {
      const needle = (val || '').toLowerCase();
      let pool = allUsers.value;

      // Owner and PM: only @ecoloop.us employees
      pool = pool.filter((u) => u.email.endsWith('@ecoloop.us'));

      const filtered = needle
        ? pool.filter((u) => u.label.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle))
        : pool;

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

watch(ownerEditing, (v) => { if (v) nextTick(() => ownerSelectRef.value?.showPopup()); });
watch(pmEditing, (v) => { if (v) nextTick(() => pmSelectRef.value?.showPopup()); });

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

.assignment-row {
  padding: 8px 0;
  border-bottom: 1px solid #F3F4F6;

  &:last-child {
    border-bottom: none;
  }
}

.assignment-label {
  font-size: 11px;
  color: #9CA3AF;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 4px;
}

.assignment-value {
  min-height: 32px;
  display: flex;
  align-items: center;
}

.assignment-name {
  font-size: 13px;
  color: #1A1A2E;
  font-weight: 600;
}

.assignment-select {
  width: 100%;

  :deep(.q-field__control) {
    min-height: 32px;
    border-radius: 8px;
  }

  :deep(.q-field__native) {
    font-size: 13px;
    padding: 2px 8px;
  }
}

.gap-xs {
  gap: 6px;
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
