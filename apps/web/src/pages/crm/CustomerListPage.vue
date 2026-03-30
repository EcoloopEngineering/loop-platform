<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold col">Customers</h5>
    </div>

    <q-banner v-if="customerStore.error" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ customerStore.error }}
      <template #action><q-btn flat label="Retry" @click="loadCustomers" /></template>
    </q-banner>

    <q-input
      v-model="search"
      dense
      outlined
      placeholder="Search customers..."
      class="q-mb-md filter-input"
      @update:model-value="debouncedSearch"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
    </q-input>

    <q-table
      :rows="customerStore.customers"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :loading="customerStore.loading"
      :pagination="pagination"
      class="rounded-borders"
      @request="onRequest"
      @row-click="onRowClick"
    >
      <template #body-cell-name="props">
        <q-td :props="props">
          <div class="row items-center no-wrap" style="gap: 10px">
            <UserAvatar :name="titleCase(props.row.name)" size="32px" />
            <span class="text-weight-bold cursor-pointer text-primary">
              {{ titleCase(props.row.name) }}
            </span>
          </div>
        </q-td>
      </template>

      <template #body-cell-createdAt="props">
        <q-td :props="props">
          {{ formatDate(props.row.createdAt) }}
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCustomerStore } from '@/stores/customer.store';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { titleCase } from '@/composables/useLeadFormatting';

const customerStore = useCustomerStore();
const router = useRouter();
const search = ref('');

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' as const },
  { name: 'leadsCount', label: 'Leads', field: 'leadsCount', align: 'center' as const, sortable: true },
  { name: 'createdAt', label: 'Created', field: 'createdAt', align: 'left' as const, sortable: true },
];

const pagination = ref({
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0,
});

onMounted(async () => {
  await loadCustomers();
});

async function loadCustomers() {
  await customerStore.fetchCustomers({
    page: pagination.value.page,
    limit: pagination.value.rowsPerPage,
    search: search.value || undefined,
  });
  pagination.value.rowsNumber = customerStore.total;
}

let searchTimeout: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1;
    loadCustomers();
  }, 300);
}

function onRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  loadCustomers();
}

function onRowClick(_evt: Event, row: { id: string }) {
  router.push(`/crm/customers/${row.id}`);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
</script>

<style lang="scss" scoped>
.filter-input {
  max-width: 360px;
  :deep(.q-field__control) {
    border-radius: 10px;
  }
}
</style>
