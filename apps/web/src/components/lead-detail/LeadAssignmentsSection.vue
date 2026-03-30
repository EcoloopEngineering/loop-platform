<template>
  <div>
    <!-- Attribution -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item default-opened header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Attribution</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div v-if="lead.createdBy" class="sidebar-field">
            <div class="sidebar-field-label">Created by</div>
            <div class="sidebar-field-value row items-center no-wrap gap-xs">
              <q-avatar size="26px" :color="isExternalCreator ? 'orange-6' : 'primary'" text-color="white" class="avatar-text-md">
                {{ lead.createdBy.firstName?.charAt(0) }}
              </q-avatar>
              <span>{{ titleCase(lead.createdBy.firstName + ' ' + lead.createdBy.lastName) }}</span>
              <q-badge v-if="isExternalCreator" color="orange-2" text-color="orange-9" dense class="text-10">Partner</q-badge>
              <q-badge v-else color="blue-1" text-color="blue-8" dense class="text-10">Employee</q-badge>
            </div>
            <div class="text-caption text-grey-5 ml-avatar">{{ lead.createdBy.email }}</div>
          </div>
          <div v-if="referredBy" class="sidebar-field">
            <div class="sidebar-field-label">Referred by</div>
            <div class="sidebar-field-value row items-center no-wrap gap-xs">
              <q-avatar size="26px" color="primary" text-color="white" class="avatar-text-md">
                {{ referredBy.firstName?.charAt(0) }}
              </q-avatar>
              <span>{{ titleCase(referredBy.firstName + ' ' + referredBy.lastName) }}</span>
              <q-badge color="green-1" text-color="green-8" dense class="text-10">Rep</q-badge>
            </div>
            <div class="text-caption text-grey-5 ml-avatar">{{ referredBy.email }}</div>
          </div>
          <div v-if="!lead.createdBy && !referredBy" class="text-grey-5 text-caption">No attribution data</div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Contact -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item default-opened header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Contact</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div class="field-row">
            <div class="field-label">Name</div>
            <div class="field-value">{{ titleCase((lead.customer?.firstName ?? '') + ' ' + (lead.customer?.lastName ?? '')) || '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Email</div>
            <div class="field-value">
              <a v-if="lead.customer?.email" :href="'mailto:' + lead.customer.email" class="field-link">{{ lead.customer.email }}</a>
              <span v-else>--</span>
            </div>
          </div>
          <div class="field-row">
            <div class="field-label">Phone</div>
            <div class="field-value">
              <a v-if="lead.customer?.phone" :href="'tel:' + lead.customer.phone" class="field-link">{{ lead.customer.phone }}</a>
              <span v-else>--</span>
            </div>
          </div>
          <div class="field-row">
            <div class="field-label">Source</div>
            <div class="field-value">{{ formatSource(lead.customer?.source) || '--' }}</div>
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Property -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item default-opened header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Property</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div class="field-row">
            <div class="field-label">Address</div>
            <div class="field-value">{{ lead.property?.streetAddress || '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">City</div>
            <div class="field-value">{{ lead.property?.city || '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">State</div>
            <div class="field-value">{{ lead.property?.state || '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">ZIP</div>
            <div class="field-value">{{ lead.property?.zip || '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Property Type</div>
            <div class="field-value">{{ lead.property?.propertyType || '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Roof Condition</div>
            <div class="field-value">{{ lead.property?.roofCondition || '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Electrical Service</div>
            <div class="field-value">{{ lead.property?.electricalService || '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Has Pool</div>
            <div class="field-value">{{ lead.property?.hasPool ? 'Yes' : 'No' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Has EV</div>
            <div class="field-value">{{ lead.property?.hasEV ? 'Yes' : 'No' }}</div>
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Energy -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Energy</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <div class="field-row">
            <div class="field-label">Monthly Bill</div>
            <div class="field-value">{{ lead.property?.monthlyBill ? '$' + lead.property.monthlyBill : '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Annual kWh</div>
            <div class="field-value">{{ lead.property?.annualKwhUsage ? lead.property.annualKwhUsage.toLocaleString() + ' kWh' : '--' }}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Utility Provider</div>
            <div class="field-value">{{ lead.property?.utilityProvider || '--' }}</div>
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Design -->
    <q-card flat class="sidebar-section-card q-mb-sm">
      <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
        <template #header>
          <q-item-section><span class="section-title">Design</span></q-item-section>
        </template>
        <q-card-section class="q-pt-none section-body">
          <template v-if="designRequests.length > 0">
            <div v-for="dr in designRequests" :key="dr.id">
              <div class="field-row">
                <div class="field-label">Aurora Link</div>
                <div class="field-value">
                  <a v-if="dr.auroraProjectUrl" :href="dr.auroraProjectUrl" target="_blank" class="field-link">Open Aurora</a>
                  <span v-else>--</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-label">Design Type</div>
                <div class="field-value">{{ dr.designType === 'AI_DESIGN' ? 'AI Design' : 'Manual' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Status</div>
                <div class="field-value">
                  <q-badge :color="designStatusColor(dr.status)" text-color="white" class="badge-pill-sm">
                    {{ formatDesignStatus(dr.status) }}
                  </q-badge>
                </div>
              </div>
              <div class="field-row">
                <div class="field-label">Notes</div>
                <div class="field-value">{{ dr.notes || '--' }}</div>
              </div>
            </div>
          </template>
          <div v-else class="text-grey-5 text-caption">No design requests</div>
        </q-card-section>
      </q-expansion-item>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { titleCase } from '@/composables/useLeadFormatting';
import { useLeadFormatting } from '@/composables/useLeadFormatting';

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface DesignRequest {
  id: string;
  auroraProjectUrl?: string;
  designType: string;
  status: string;
  notes?: string;
}

interface LeadData {
  [key: string]: unknown;
  createdBy?: UserInfo & { firstName?: string };
  createdById?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    source?: string;
  };
  property?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
    propertyType?: string;
    roofCondition?: string;
    electricalService?: string;
    hasPool?: boolean;
    hasEV?: boolean;
    monthlyBill?: number;
    annualKwhUsage?: number;
    utilityProvider?: string;
  };
  assignments?: Array<{
    isPrimary: boolean;
    userId: string;
    user?: UserInfo;
  }>;
  designRequests?: DesignRequest[];
}

const props = defineProps<{
  lead: LeadData;
  leadId: string;
}>();

const { formatSource } = useLeadFormatting();

const isExternalCreator = computed(() => {
  const email = props.lead.createdBy?.email ?? '';
  return email && !email.endsWith('@ecoloop.us');
});

const referredBy = computed(() => {
  if (!isExternalCreator.value) return null;
  const assignments = props.lead.assignments ?? [];
  const primary = assignments.find((a) => a.isPrimary);
  if (primary?.user && primary.userId !== props.lead.createdById) {
    return primary.user;
  }
  return null;
});

const designRequests = computed(() => {
  return props.lead.designRequests ?? [];
});

function designStatusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: 'orange',
    IN_PROGRESS: 'blue',
    COMPLETED: 'positive',
    FAILED: 'negative',
  };
  return map[status] ?? 'grey';
}

function formatDesignStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
  };
  return map[status] ?? status;
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

.sidebar-field-label {
  font-size: 11px;
  color: #9CA3AF;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 2px;
}

.sidebar-field-value {
  font-size: 13px;
  color: #1A1A2E;
  font-weight: 500;
  word-break: break-word;
  overflow-wrap: break-word;
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

.field-link {
  color: #4F46E5;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
