<template>
  <div>
    <!-- System & Pricing -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">System & Pricing</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-for="field in systemPricingFields" :key="field.key" class="field-row">
            <div class="field-label">{{ field.label }}</div>
            <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
              {{ field.value || '--' }}
            </div>
            <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Financing -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Financing</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-for="field in financingFields" :key="field.key" class="field-row">
            <div class="field-label">{{ field.label }}</div>
            <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
              {{ field.value || '--' }}
            </div>
            <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Site Audit -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Site Audit</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-for="field in siteAuditFields" :key="field.key" class="field-row">
            <div class="field-label">{{ field.label }}</div>
            <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
              {{ field.value || '--' }}
            </div>
            <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Quotes & Upgrades -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Quotes & Upgrades</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-for="field in quotesUpgradesFields" :key="field.key" class="field-row">
            <div class="field-label">{{ field.label }}</div>
            <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
              {{ field.value || '--' }}
            </div>
            <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Change Order -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Change Order</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-for="field in changeOrderFields" :key="field.key" class="field-row">
            <div class="field-label">{{ field.label }}</div>
            <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
              {{ field.value || '--' }}
            </div>
            <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Engineering -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Engineering</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-for="field in engineeringFields" :key="field.key" class="field-row">
            <div class="field-label">{{ field.label }}</div>
            <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
              {{ field.value || '--' }}
            </div>
            <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Install -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Install</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-for="field in installFields" :key="field.key" class="field-row">
            <div class="field-label">{{ field.label }}</div>
            <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
              {{ field.value || '--' }}
            </div>
            <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- PTO & Activation -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">PTO & Activation</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-for="field in ptoActivationFields" :key="field.key" class="field-row">
            <div class="field-label">{{ field.label }}</div>
            <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
              {{ field.value || '--' }}
            </div>
            <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Appointments -->
    <q-card v-if="appointments.length > 0" flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Appointments</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-for="appt in appointments" :key="appt.id" class="sidebar-field">
            <div class="row items-center no-wrap q-mb-xs gap-sm">
              <q-icon
                :name="appt.type === 'SITE_AUDIT' ? 'home_work' : 'solar_power'"
                :color="apptStatusColor(appt.status)"
                size="20px"
              />
              <div class="col">
                <div class="text-weight-medium text-13">
                  {{ appt.type === 'SITE_AUDIT' ? 'Site Audit' : 'Installation' }}
                </div>
                <div class="text-caption text-grey-6">
                  {{ formatDateTime(appt.scheduledAt) }}
                </div>
              </div>
              <q-badge
                :color="apptStatusColor(appt.status)"
                text-color="white"
                class="badge-pill-sm"
              >
                {{ appt.status }}
              </q-badge>
            </div>
            <div class="text-caption text-grey-5 ml-avatar">
              Duration: {{ appt.duration }}min
              <span v-if="appt.notes"> · {{ appt.notes }}</span>
            </div>
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { api } from '@/boot/axios';

interface Appointment {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  duration: number;
  notes?: string;
}

interface LeadData {
  [key: string]: unknown;
  kw?: number;
  epc?: number;
  financier?: string;
  metadata?: Record<string, string>;
  appointments?: Appointment[];
}

const props = defineProps<{
  lead: LeadData;
  leadId: string;
  appointments: Appointment[];
}>();

// ---- Inline edit ----
const editingField = ref<string | null>(null);
const editValue = ref('');

function startEdit(key: string, currentValue: string) {
  editingField.value = key;
  editValue.value = currentValue || '';
}

async function saveField(key: string) {
  editingField.value = null;
  const val = editValue.value.trim();
  const directFields = ['kw', 'epc', 'financier', 'systemSize'];

  try {
    if (directFields.includes(key)) {
      await api.put(`/leads/${props.leadId}`, { [key]: val || null });
    } else {
      await api.patch(`/leads/${props.leadId}/metadata`, { [key]: val || null });
    }
    // Update local state
    if (directFields.includes(key)) {
      (props.lead as Record<string, unknown>)[key] = val || null;
    } else {
      const meta = (props.lead.metadata ?? {}) as Record<string, string | null>;
      meta[key] = val || null;
      (props.lead as Record<string, unknown>).metadata = meta;
    }
  } catch {
    // Silently fail - value will revert on next load
  }
}

function getMetaField(key: string): string {
  return (props.lead.metadata as Record<string, string> | undefined)?.[key] ?? '';
}

// ---- Field definitions ----
const systemPricingFields = computed(() => [
  { key: 'kw', label: 'System Size (kW)', value: props.lead.kw ? String(props.lead.kw) : '' },
  { key: 'epc', label: 'EPC', value: props.lead.epc ? String(props.lead.epc) : '' },
  { key: 'contractCost', label: 'Contract Cost', value: getMetaField('contractCost') },
  { key: 'solarRate', label: 'Solar Rate', value: getMetaField('solarRate') },
  { key: 'escalator', label: 'Escalator', value: getMetaField('escalator') },
  { key: 'monthlyPayment', label: 'Monthly Payment', value: getMetaField('monthlyPayment') },
  { key: 'systemProduction', label: 'System Production', value: getMetaField('systemProduction') },
  { key: 'customerUsage', label: 'Customer Usage', value: getMetaField('customerUsage') },
  { key: 'calculatedOffset', label: 'Calculated Offset', value: getMetaField('calculatedOffset') },
]);

const financingFields = computed(() => [
  { key: 'preferredFinancing', label: 'Preferred Financing', value: getMetaField('preferredFinancing') },
  { key: 'financier', label: 'Financier', value: props.lead.financier ? String(props.lead.financier) : '' },
  { key: 'ntpApproval', label: 'NTP Approval', value: getMetaField('ntpApproval') },
  { key: 'm1Payment', label: 'M1 Payment', value: getMetaField('m1Payment') },
  { key: 'm2Payment', label: 'M2 Payment', value: getMetaField('m2Payment') },
  { key: 'm3Approval', label: 'M3 Approval', value: getMetaField('m3Approval') },
]);

const siteAuditFields = computed(() => {
  const auditAppt = props.appointments.find((a) => a.type === 'SITE_AUDIT');
  return [
    { key: 'siteAuditDate', label: 'Site Audit Date', value: auditAppt ? formatDateTime(auditAppt.scheduledAt) : getMetaField('siteAuditDate') },
    { key: 'siteAuditInstructions', label: 'Instructions', value: getMetaField('siteAuditInstructions') },
    { key: 'siteAuditStatus', label: 'Status', value: auditAppt ? auditAppt.status : getMetaField('siteAuditStatus') },
    { key: 'surveyReview', label: 'Survey Review', value: getMetaField('surveyReview') },
    { key: 'roofType', label: 'Roof Type', value: getMetaField('roofType') },
  ];
});

const quotesUpgradesFields = computed(() => [
  { key: 'electricalQuote', label: 'Electrical Quote', value: getMetaField('electricalQuote') },
  { key: 'electricalDescription', label: 'Electrical Description', value: getMetaField('electricalDescription') },
  { key: 'roofQuote', label: 'Roof Quote', value: getMetaField('roofQuote') },
  { key: 'roofDescription', label: 'Roof Description', value: getMetaField('roofDescription') },
  { key: 'treeQuote', label: 'Tree Quote', value: getMetaField('treeQuote') },
  { key: 'treeDescription', label: 'Tree Description', value: getMetaField('treeDescription') },
  { key: 'structuralQuote', label: 'Structural Quote', value: getMetaField('structuralQuote') },
  { key: 'structuralDescription', label: 'Structural Description', value: getMetaField('structuralDescription') },
  { key: 'upgradeQuoteTotal', label: 'Upgrade Quote Total', value: getMetaField('upgradeQuoteTotal') },
  { key: 'repApprovals', label: 'Rep Approvals', value: getMetaField('repApprovals') },
]);

const changeOrderFields = computed(() => [
  { key: 'coType', label: 'Type', value: getMetaField('coType') },
  { key: 'coNewSystemSize', label: 'New System Size', value: getMetaField('coNewSystemSize') },
  { key: 'coNewEpc', label: 'New EPC', value: getMetaField('coNewEpc') },
  { key: 'coNewMonthlyPayment', label: 'New Monthly Payment', value: getMetaField('coNewMonthlyPayment') },
  { key: 'coNewEscalator', label: 'New Escalator', value: getMetaField('coNewEscalator') },
  { key: 'coNewOffset', label: 'New Offset', value: getMetaField('coNewOffset') },
  { key: 'coTreeRemoval', label: 'Tree Removal', value: getMetaField('coTreeRemoval') },
  { key: 'coNotes', label: 'Notes', value: getMetaField('coNotes') },
  { key: 'coStatus', label: 'Status', value: getMetaField('coStatus') },
]);

const engineeringFields = computed(() => [
  { key: 'finalDesignStatus', label: 'Final Design Status', value: getMetaField('finalDesignStatus') },
  { key: 'electricalReview', label: 'Electrical Review', value: getMetaField('electricalReview') },
  { key: 'permitStatus', label: 'Permit Status', value: getMetaField('permitStatus') },
  { key: 'icxStatus', label: 'ICX Status', value: getMetaField('icxStatus') },
]);

const installFields = computed(() => {
  const installAppt = props.appointments.find((a) => a.type === 'INSTALLATION');
  return [
    { key: 'installStatus', label: 'Install Status', value: getMetaField('installStatus') },
    { key: 'installVisitDate', label: 'Visit Date', value: installAppt ? formatDateTime(installAppt.scheduledAt) : getMetaField('installVisitDate') },
    { key: 'submissionStatus', label: 'Submission Status', value: getMetaField('submissionStatus') },
    { key: 'rejectionDetails', label: 'Rejection Details', value: getMetaField('rejectionDetails') },
  ];
});

const ptoActivationFields = computed(() => [
  { key: 'ptoStatus', label: 'PTO Status', value: getMetaField('ptoStatus') },
  { key: 'systemActivation', label: 'System Activation', value: getMetaField('systemActivation') },
  { key: 'ptoM3Approval', label: 'M3 Approval', value: getMetaField('ptoM3Approval') },
]);

function apptStatusColor(status: string) {
  const map: Record<string, string> = { PENDING: 'orange', CONFIRMED: 'blue', COMPLETED: 'positive', CANCELLED: 'grey-5', RESCHEDULED: 'purple' };
  return map[status] ?? 'grey';
}

function formatDateTime(iso: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style lang="scss" scoped>
.sidebar-section-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  box-shadow: none;

  :deep(.q-expansion-item) {
    .q-item {
      padding: 10px 16px;
      min-height: 40px;
    }
  }
}

.section-header {
  padding: 8px 0;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #1A1A2E;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-body {
  padding: 0 16px 12px;
}

.sidebar-field {
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
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

  &.editable {
    cursor: pointer;
    border-radius: 4px;
    padding: 1px 4px;
    margin: -1px -4px;
    transition: background 0.15s;

    &:hover {
      background: #F3F4F6;
    }
  }
}

.inline-edit {
  max-width: 160px;
  margin-left: auto;

  :deep(.q-field__control) {
    min-height: 24px;
  }

  :deep(input) {
    font-size: 13px;
    font-weight: 600;
    padding: 0;
    text-align: right;
  }
}
</style>
