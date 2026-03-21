<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold col">Users</h5>
    </div>

    <q-input
      v-model="search"
      dense
      outlined
      placeholder="Search users..."
      class="q-mb-md filter-input"
      @update:model-value="debouncedSearch"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
    </q-input>

    <q-table
      :rows="filteredUsers"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :loading="loading"
      class="rounded-borders"
      :pagination="{ rowsPerPage: 20 }"
    >
      <template #body-cell-role="props">
        <q-td :props="props">
          <q-select
            :model-value="props.row.role"
            :options="roleOptions"
            emit-value
            map-options
            dense
            borderless
            class="role-select"
            @update:model-value="(val: string) => updateRole(props.row.id, val)"
          />
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props">
          <q-toggle
            :model-value="props.row.active"
            color="primary"
            @update:model-value="(val: boolean) => toggleStatus(props.row.id, val)"
          />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/boot/axios';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  active: boolean;
}

const users = ref<ManagedUser[]>([]);
const loading = ref(false);
const search = ref('');

const roleOptions = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Setter', value: 'SETTER' },
  { label: 'Closer', value: 'CLOSER' },
];

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const },
  { name: 'role', label: 'Role', field: 'role', align: 'center' as const },
  { name: 'team', label: 'Team', field: 'team', align: 'left' as const },
  { name: 'status', label: 'Active', field: 'active', align: 'center' as const },
];

const filteredUsers = computed(() => {
  if (!search.value) return users.value;
  const q = search.value.toLowerCase();
  return users.value.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  );
});

onMounted(async () => {
  loading.value = true;
  try {
    const { data } = await api.get<ManagedUser[]>('/admin/users');
    users.value = data;
  } catch {
    // Empty
  } finally {
    loading.value = false;
  }
});

let searchTimeout: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    // Filtering is client-side via computed
  }, 200);
}

async function updateRole(userId: string, role: string) {
  try {
    await api.patch(`/admin/users/${userId}`, { role });
    const user = users.value.find((u) => u.id === userId);
    if (user) user.role = role;
  } catch {
    // Handle error
  }
}

async function toggleStatus(userId: string, active: boolean) {
  try {
    await api.patch(`/admin/users/${userId}`, { active });
    const user = users.value.find((u) => u.id === userId);
    if (user) user.active = active;
  } catch {
    // Handle error
  }
}
</script>

<style lang="scss" scoped>
.filter-input {
  max-width: 360px;
  :deep(.q-field__control) {
    border-radius: 10px;
  }
}
.role-select {
  min-width: 120px;
}
</style>
