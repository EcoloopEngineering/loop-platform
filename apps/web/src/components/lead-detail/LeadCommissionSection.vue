<template>
  <div>
    <div v-if="lines.length" class="commission-table">
      <q-markup-table flat bordered separator="horizontal" class="rounded-card">
        <thead>
          <tr>
            <th class="text-left">Description</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in lines" :key="line.label">
            <td>{{ line.label }}</td>
            <td class="text-right text-weight-medium">{{ line.value }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="commission-total-row">
            <td class="text-weight-bold">Total</td>
            <td class="text-right text-weight-bold text-primary text-h6">
              {{ total }}
            </td>
          </tr>
        </tfoot>
      </q-markup-table>
    </div>
    <div v-else class="text-grey-6 text-center q-pa-lg">
      No commission data available.
    </div>

    <!-- Advance Payout Section -->
    <div v-if="isAdminOrManager" class="q-mt-md">
      <div class="row items-center q-mb-sm">
        <div class="text-subtitle2 text-weight-bold">Advance Payout</div>
        <q-space />
        <q-btn
          v-if="!showAdvanceForm"
          flat dense no-caps
          icon="add"
          label="Request Advance"
          color="primary"
          size="sm"
          @click="showAdvanceForm = true"
        />
      </div>

      <!-- Existing advance payments -->
      <div v-if="advances.length" class="q-mb-sm">
        <div v-for="adv in advances" :key="adv.id" class="advance-item row items-center q-mb-xs q-pa-sm">
          <q-badge :color="tierColor(adv.type)" :label="adv.type" class="q-mr-sm" />
          <span class="text-weight-medium">${{ Number(adv.amount).toLocaleString() }}</span>
          <q-space />
          <q-badge :color="statusColor(adv.status)" :label="adv.status" outline />
          <span class="text-caption text-grey-5 q-ml-sm">{{ formatDate(adv.createdAt) }}</span>
        </div>
      </div>

      <!-- Advance form -->
      <div v-if="showAdvanceForm" class="advance-form q-pa-sm">
        <div class="row q-gutter-sm items-end">
          <q-select
            v-model="advanceType"
            :options="['M1', 'M2', 'M3']"
            label="Tier"
            outlined dense
            style="width: 100px;"
          />
          <q-input
            v-model.number="advanceAmount"
            type="number"
            label="Amount"
            prefix="$"
            outlined dense
            style="width: 160px;"
          />
          <q-btn
            unelevated no-caps color="primary" label="Submit"
            :loading="submittingAdvance"
            :disable="!advanceType || !advanceAmount || advanceAmount <= 0"
            style="border-radius: 10px;"
            @click="submitAdvance"
          />
          <q-btn flat no-caps color="grey-6" label="Cancel" @click="showAdvanceForm = false" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

interface AdvancePayment {
  id: string;
  type: string;
  amount: number;
  status: string;
  isAdvance: boolean;
  createdAt: string;
}

const props = defineProps<{
  leadId: string;
  lines: Array<{ label: string; value: string }>;
  total: string;
}>();

const $q = useQuasar();
const advances = ref<AdvancePayment[]>([]);
const showAdvanceForm = ref(false);
const advanceType = ref<string | null>(null);
const advanceAmount = ref<number>(0);
const submittingAdvance = ref(false);

const isAdminOrManager = (() => {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const role = JSON.parse(stored)?.user?.role;
      return role === 'ADMIN' || role === 'MANAGER';
    }
  } catch { /* ignore */ }
  return false;
})();

function tierColor(type: string) {
  return { M1: 'primary', M2: 'purple', M3: 'indigo' }[type] ?? 'grey';
}

function statusColor(status: string) {
  return { PENDING: 'orange', APPROVED: 'blue', PAID: 'green', CANCELLED: 'grey', ACTIVE: 'teal' }[status] ?? 'grey';
}

function formatDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
}

async function fetchAdvances() {
  try {
    const { data } = await api.get(`/leads/${props.leadId}/commission/payments`);
    advances.value = (Array.isArray(data) ? data : []).filter((p: AdvancePayment) => p.isAdvance);
  } catch {
    // silently fail — advances section is optional
  }
}

async function submitAdvance() {
  if (!advanceType.value || !advanceAmount.value) return;
  submittingAdvance.value = true;
  try {
    await api.post(`/leads/${props.leadId}/commission/advance`, {
      type: advanceType.value,
      amount: advanceAmount.value,
    });
    $q.notify({ type: 'positive', message: 'Advance payout requested' });
    showAdvanceForm.value = false;
    advanceType.value = null;
    advanceAmount.value = 0;
    await fetchAdvances();
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to request advance';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    submittingAdvance.value = false;
  }
}

onMounted(() => { fetchAdvances(); });
</script>

<style lang="scss" scoped>
.commission-total-row {
  background: #F9FAFB;
}

.rounded-card {
  border-radius: 12px;
}

.advance-item {
  background: #F9FAFB;
  border-radius: 8px;
  border: 1px solid #F3F4F6;
}

.advance-form {
  background: #F9FAFB;
  border-radius: 10px;
  border: 1px solid #E5E7EB;
}
</style>
