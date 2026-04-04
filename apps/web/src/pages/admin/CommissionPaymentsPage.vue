<template>
  <q-page class="q-pa-md page-bg">
    <h5 class="q-my-none text-weight-bold q-mb-md">Commission Payments</h5>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="error" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Retry" @click="fetchPayments" />
      </template>
    </q-banner>

    <template v-else>
      <!-- Summary cards -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <div class="text-caption text-grey-6 text-uppercase" style="letter-spacing: 0.04em">Total Pending</div>
            <div class="text-h5 text-weight-bold text-orange q-mt-xs">${{ totalPending.toLocaleString() }}</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <div class="text-caption text-grey-6 text-uppercase" style="letter-spacing: 0.04em">Total Approved</div>
            <div class="text-h5 text-weight-bold text-blue q-mt-xs">${{ totalApproved.toLocaleString() }}</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <div class="text-caption text-grey-6 text-uppercase" style="letter-spacing: 0.04em">Total Paid</div>
            <div class="text-h5 text-weight-bold text-green q-mt-xs">${{ totalPaid.toLocaleString() }}</div>
          </q-card>
        </div>
      </div>

      <!-- Payments table -->
      <q-table
        :rows="payments"
        :columns="columns"
        row-key="id"
        flat
        bordered
        class="rounded-card"
        :pagination="{ rowsPerPage: 20 }"
      >
        <template #body-cell-type="props">
          <q-td :props="props">
            <q-badge :color="tierColor(props.row.type)" :label="props.row.type" />
            <q-badge v-if="props.row.isAdvance" color="amber-8" label="ADV" class="q-ml-xs" />
          </q-td>
        </template>

        <template #body-cell-amount="props">
          <q-td :props="props">
            <span class="text-weight-bold">${{ (props.row.amount ?? 0).toLocaleString() }}</span>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="props.row.status" />
          </q-td>
        </template>

        <template #body-cell-createdAt="props">
          <q-td :props="props">
            {{ props.row.createdAt ? new Date(props.row.createdAt).toLocaleDateString() : '' }}
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="row no-wrap q-gutter-xs">
              <q-btn
                v-if="props.row.status === 'PENDING'"
                flat
                dense
                size="sm"
                label="Approve"
                color="blue"
                no-caps
                @click="changeStatus(props.row.id, 'approve')"
              />
              <q-btn
                v-if="props.row.status === 'APPROVED'"
                flat
                dense
                size="sm"
                label="Pay"
                color="green"
                no-caps
                @click="changeStatus(props.row.id, 'pay')"
              />
              <q-btn
                v-if="props.row.status === 'PENDING' || props.row.status === 'APPROVED'"
                flat
                dense
                size="sm"
                label="Cancel"
                color="grey"
                no-caps
                @click="changeStatus(props.row.id, 'cancel')"
              />
            </div>
          </q-td>
        </template>

        <template #no-data>
          <div class="text-grey-5 q-pa-md text-center full-width">No commission payments found.</div>
        </template>
      </q-table>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

interface RawPayment {
  id: string;
  type: string;
  amount: number | string;
  status: string;
  isAdvance?: boolean;
  createdAt: string;
  lead?: { id?: string; currentStage?: string; customer?: { firstName?: string; lastName?: string } };
  user?: { id?: string; firstName?: string; lastName?: string; email?: string };
}

interface Payment {
  id: string;
  leadName: string;
  repName: string;
  type: string;
  amount: number;
  status: string;
  isAdvance: boolean;
  createdAt: string;
}

const $q = useQuasar();
const loading = ref(false);
const error = ref<string | null>(null);
const payments = ref<Payment[]>([]);

const totalPending = computed(() =>
  payments.value.filter((p) => p.status === 'PENDING').reduce((s, p) => s + (p.amount ?? 0), 0),
);
const totalApproved = computed(() =>
  payments.value.filter((p) => p.status === 'APPROVED').reduce((s, p) => s + (p.amount ?? 0), 0),
);
const totalPaid = computed(() =>
  payments.value.filter((p) => p.status === 'PAID').reduce((s, p) => s + (p.amount ?? 0), 0),
);

const columns = [
  { name: 'leadName', label: 'Lead', field: 'leadName', align: 'left' as const, sortable: true },
  { name: 'repName', label: 'Rep', field: 'repName', align: 'left' as const, sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' as const, sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center' as const, sortable: true },
  { name: 'createdAt', label: 'Created', field: 'createdAt', align: 'left' as const, sortable: true },
  { name: 'actions', label: 'Actions', field: 'id', align: 'center' as const },
];

function statusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: 'orange',
    APPROVED: 'blue',
    PAID: 'green',
    CANCELLED: 'grey',
  };
  return map[status] ?? 'grey';
}

function tierColor(type: string) {
  const map: Record<string, string> = {
    M1: 'primary',
    M2: 'purple',
    M3: 'indigo',
  };
  return map[type] ?? 'grey';
}

async function fetchPayments() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get<RawPayment[]>('/commissions/payments');
    const raw = Array.isArray(data) ? data : (data as { data?: RawPayment[] }).data ?? [];
    payments.value = raw.map((p) => ({
      id: p.id,
      leadName: p.lead?.customer
        ? `${p.lead.customer.firstName ?? ''} ${p.lead.customer.lastName ?? ''}`.trim()
        : '—',
      repName: p.user
        ? `${p.user.firstName ?? ''} ${p.user.lastName ?? ''}`.trim()
        : '—',
      type: p.type,
      amount: Number(p.amount) || 0,
      status: p.status,
      isAdvance: p.isAdvance ?? false,
      createdAt: p.createdAt,
    }));
  } catch {
    error.value = 'Failed to load commission payments. Please try again.';
    payments.value = [];
  } finally {
    loading.value = false;
  }
}

async function changeStatus(id: string, action: 'approve' | 'pay' | 'cancel') {
  try {
    await api.patch(`/commissions/payments/${id}/${action}`);
    $q.notify({ type: 'positive', message: `Payment ${action}d successfully` });
    await fetchPayments();
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: { message?: string } } };
    $q.notify({
      type: 'negative',
      message: axErr?.response?.data?.message ?? `Failed to ${action} payment`,
    });
  }
}

onMounted(() => {
  fetchPayments();
});
</script>

<style lang="scss" scoped>
.page-bg {
  background: #F8FAFB;
}
.rounded-card {
  border-radius: 12px;
  border-color: #E5E7EB;
}
</style>
