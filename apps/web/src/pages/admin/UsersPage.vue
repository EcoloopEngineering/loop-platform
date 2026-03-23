<template>
  <q-page class="q-pa-md" style="background: #F8FAFB">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold">Users</h5>
      <q-space />
      <q-btn unelevated no-caps color="primary" icon="person_add" label="Create User" style="border-radius: 10px" @click="showCreateDialog = true" />
    </div>

    <!-- Tabs -->
    <q-tabs v-model="activeTab" dense no-caps active-color="primary" indicator-color="primary" class="q-mb-md" align="left">
      <q-tab name="employees" icon="badge" :label="`Employees (${employees.length})`" />
      <q-tab name="partners" icon="handshake" :label="`Partners (${partners.length})`" />
    </q-tabs>

    <!-- Search -->
    <q-input v-model="search" dense outlined placeholder="Search by name or email..." class="q-mb-md search-input">
      <template #prepend><q-icon name="search" /></template>
      <template #append><q-icon v-if="search" name="close" class="cursor-pointer" @click="search = ''" /></template>
    </q-input>

    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Employees Tab -->
    <q-tab-panels v-else v-model="activeTab" animated>
      <q-tab-panel name="employees" class="q-pa-none">
        <q-card flat class="table-card">
          <q-table
            :rows="filteredEmployees"
            :columns="employeeColumns"
            row-key="id"
            flat
            :pagination="{ rowsPerPage: 20 }"
            class="users-table"
          >
            <template #body-cell-name="props">
              <q-td :props="props">
                <div class="row items-center no-wrap" style="gap: 10px">
                  <q-avatar size="32px" color="primary" text-color="white" style="font-size: 12px">
                    {{ props.row.initials }}
                  </q-avatar>
                  <div>
                    <div class="text-weight-medium">{{ props.row.name }}</div>
                    <div class="text-caption text-grey-5">{{ props.row.nickname || '' }}</div>
                  </div>
                </div>
              </q-td>
            </template>

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
                  @update:model-value="(val: string) => updateUser(props.row.id, { role: val })"
                />
              </q-td>
            </template>

            <template #body-cell-status="props">
              <q-td :props="props">
                <q-toggle
                  :model-value="props.row.isActive"
                  color="primary"
                  @update:model-value="(val: boolean) => updateUser(props.row.id, { isActive: val })"
                />
              </q-td>
            </template>

            <template #body-cell-actions="props">
              <q-td :props="props" auto-width>
                <q-btn flat dense round icon="more_vert" size="sm" color="grey-6">
                  <q-menu>
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup @click="editUser(props.row)">
                        <q-item-section avatar><q-icon name="edit" size="18px" /></q-item-section>
                        <q-item-section>Edit</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup @click="resetPassword(props.row)">
                        <q-item-section avatar><q-icon name="lock_reset" size="18px" /></q-item-section>
                        <q-item-section>Reset Password</q-item-section>
                      </q-item>
                      <q-separator />
                      <q-item clickable v-close-popup @click="deactivateUser(props.row)">
                        <q-item-section avatar><q-icon name="block" size="18px" color="negative" /></q-item-section>
                        <q-item-section class="text-negative">Deactivate</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- Partners Tab -->
      <q-tab-panel name="partners" class="q-pa-none">
        <q-card flat class="table-card">
          <q-table
            :rows="filteredPartners"
            :columns="partnerColumns"
            row-key="id"
            flat
            :pagination="{ rowsPerPage: 20 }"
            class="users-table"
          >
            <template #body-cell-name="props">
              <q-td :props="props">
                <div class="row items-center no-wrap" style="gap: 10px">
                  <q-avatar size="32px" color="orange-7" text-color="white" style="font-size: 12px">
                    {{ props.row.initials }}
                  </q-avatar>
                  <div>
                    <div class="text-weight-medium">{{ props.row.name }}</div>
                  </div>
                </div>
              </q-td>
            </template>

            <template #body-cell-referredBy="props">
              <q-td :props="props">
                <div v-if="props.row.referredBy" class="row items-center no-wrap" style="gap: 6px">
                  <q-avatar size="20px" color="primary" text-color="white" style="font-size: 9px">
                    {{ props.row.referredBy.charAt(0) }}
                  </q-avatar>
                  <span class="text-caption">{{ props.row.referredBy }}</span>
                </div>
                <span v-else class="text-grey-4">--</span>
              </q-td>
            </template>

            <template #body-cell-leads="props">
              <q-td :props="props">
                <q-badge :color="props.row.leadCount > 0 ? 'primary' : 'grey-4'" :label="props.row.leadCount" />
              </q-td>
            </template>

            <template #body-cell-status="props">
              <q-td :props="props">
                <q-toggle
                  :model-value="props.row.isActive"
                  color="primary"
                  @update:model-value="(val: boolean) => updateUser(props.row.id, { isActive: val })"
                />
              </q-td>
            </template>

            <template #body-cell-actions="props">
              <q-td :props="props" auto-width>
                <q-btn flat dense round icon="more_vert" size="sm" color="grey-6">
                  <q-menu>
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup @click="editUser(props.row)">
                        <q-item-section avatar><q-icon name="edit" size="18px" /></q-item-section>
                        <q-item-section>Edit</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Create User Dialog -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 16px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Create User</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="newUser.firstName" label="First Name" outlined dense />
            </div>
            <div class="col-6">
              <q-input v-model="newUser.lastName" label="Last Name" outlined dense />
            </div>
          </div>
          <q-input v-model="newUser.email" label="Email" type="email" outlined dense />
          <q-input v-model="newUser.phone" label="Phone (optional)" outlined dense />
          <q-select
            v-model="newUser.role"
            :options="roleOptions"
            label="Role"
            emit-value
            map-options
            outlined
            dense
          />
          <q-input v-model="newUser.password" label="Temporary Password" type="password" outlined dense hint="User can change this after first login" />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
          <q-btn unelevated no-caps label="Create User" color="primary" :loading="creating" @click="createUser" style="border-radius: 10px" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit User Dialog -->
    <q-dialog v-model="showEditDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 16px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Edit User</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="editForm.firstName" label="First Name" outlined dense />
            </div>
            <div class="col-6">
              <q-input v-model="editForm.lastName" label="Last Name" outlined dense />
            </div>
          </div>
          <q-input v-model="editForm.email" label="Email" outlined dense disable />
          <q-input v-model="editForm.phone" label="Phone" outlined dense />
          <q-select
            v-model="editForm.role"
            :options="roleOptions"
            label="Role"
            emit-value
            map-options
            outlined
            dense
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
          <q-btn unelevated no-caps label="Save Changes" color="primary" :loading="saving" @click="saveEdit" style="border-radius: 10px" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

const $q = useQuasar();

interface UserRow {
  id: string;
  name: string;
  initials: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  nickname?: string;
  isActive: boolean;
  teamName?: string;
  referredBy?: string;
  leadCount: number;
  createdAt: string;
}

const allUsers = ref<UserRow[]>([]);
const loading = ref(true);
const search = ref('');
const activeTab = ref('employees');

const roleOptions = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Manager (PM)', value: 'MANAGER' },
  { label: 'Sales Rep', value: 'SALES_REP' },
  { label: 'Referral', value: 'REFERRAL' },
];

const employees = computed(() => allUsers.value.filter((u) => u.email.endsWith('@ecoloop.us')));
const partners = computed(() => allUsers.value.filter((u) => !u.email.endsWith('@ecoloop.us')));

const filteredEmployees = computed(() => filterBySearch(employees.value));
const filteredPartners = computed(() => filterBySearch(partners.value));

function filterBySearch(list: UserRow[]) {
  if (!search.value) return list;
  const q = search.value.toLowerCase();
  return list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
}

const employeeColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' as const },
  { name: 'role', label: 'Role', field: 'role', align: 'left' as const },
  { name: 'team', label: 'Team', field: 'teamName', align: 'left' as const },
  { name: 'status', label: 'Active', field: 'isActive', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];

const partnerColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' as const },
  { name: 'referredBy', label: 'Invited By', field: 'referredBy', align: 'left' as const },
  { name: 'leads', label: 'Leads', field: 'leadCount', align: 'center' as const, sortable: true },
  { name: 'status', label: 'Active', field: 'isActive', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];

onMounted(async () => {
  try {
    const { data } = await api.get('/users');
    const list = Array.isArray(data) ? data : data.data ?? [];
    allUsers.value = list.map((u: any) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      initials: `${u.firstName?.charAt(0) ?? ''}${u.lastName?.charAt(0) ?? ''}`.toUpperCase(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone ?? '',
      role: u.role,
      nickname: u.nickname,
      isActive: u.isActive,
      teamName: u.team?.name ?? '--',
      referredBy: u.referralsReceived?.[0]?.inviter
        ? `${u.referralsReceived[0].inviter.firstName} ${u.referralsReceived[0].inviter.lastName}`
        : undefined,
      leadCount: u._count?.leadAssignments ?? 0,
      createdAt: u.createdAt,
    }));
  } catch {
    // fallback
  } finally {
    loading.value = false;
  }
});

// ---- Update User ----
async function updateUser(userId: string, updates: Record<string, any>) {
  try {
    await api.put(`/users/${userId}`, updates);
    const user = allUsers.value.find((u) => u.id === userId);
    if (user) Object.assign(user, updates);
    $q.notify({ type: 'positive', message: 'User updated' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update user' });
  }
}

// ---- Create User Dialog ----
const showCreateDialog = ref(false);
const creating = ref(false);
const newUser = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'SALES_REP',
  password: '',
});

async function createUser() {
  if (!newUser.firstName || !newUser.email) {
    $q.notify({ type: 'warning', message: 'Name and email are required' });
    return;
  }
  creating.value = true;
  try {
    await api.post('/users', newUser);
    $q.notify({ type: 'positive', message: 'User created successfully' });
    showCreateDialog.value = false;
    // Reload
    location.reload();
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to create user' });
  } finally {
    creating.value = false;
  }
}

// ---- Edit User Dialog ----
const showEditDialog = ref(false);
const saving = ref(false);
const editForm = reactive({
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: '',
});

function editUser(user: UserRow) {
  editForm.id = user.id;
  editForm.firstName = user.firstName;
  editForm.lastName = user.lastName;
  editForm.email = user.email;
  editForm.phone = user.phone;
  editForm.role = user.role;
  showEditDialog.value = true;
}

async function saveEdit() {
  saving.value = true;
  try {
    await api.put(`/users/${editForm.id}`, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      phone: editForm.phone,
      role: editForm.role,
    });
    const user = allUsers.value.find((u) => u.id === editForm.id);
    if (user) {
      user.firstName = editForm.firstName;
      user.lastName = editForm.lastName;
      user.name = `${editForm.firstName} ${editForm.lastName}`;
      user.initials = `${editForm.firstName.charAt(0)}${editForm.lastName.charAt(0)}`.toUpperCase();
      user.phone = editForm.phone;
      user.role = editForm.role;
    }
    $q.notify({ type: 'positive', message: 'User updated' });
    showEditDialog.value = false;
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update user' });
  } finally {
    saving.value = false;
  }
}

function resetPassword(user: UserRow) {
  $q.dialog({
    title: 'Reset Password',
    message: `Send password reset email to ${user.email}?`,
    cancel: true,
    ok: { label: 'Send Reset', color: 'primary' },
  }).onOk(() => {
    $q.notify({ type: 'info', message: 'Password reset will be available when email service is configured.' });
  });
}

function deactivateUser(user: UserRow) {
  $q.dialog({
    title: 'Deactivate User',
    message: `Are you sure you want to deactivate ${user.name}? They will lose access to the platform.`,
    cancel: true,
    ok: { label: 'Deactivate', color: 'negative', flat: true },
  }).onOk(() => {
    updateUser(user.id, { isActive: false });
  });
}
</script>

<style lang="scss" scoped>
.search-input {
  max-width: 400px;
  :deep(.q-field__control) { border-radius: 10px; }
}

.table-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.users-table {
  :deep(thead th) {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #6B7280;
    letter-spacing: 0.04em;
    border-bottom: 2px solid #E5E7EB;
  }

  :deep(tbody tr) {
    td {
      font-size: 13px;
      border-bottom: 1px solid #F3F4F6;
      padding: 8px 16px;
    }

    &:hover { background: #F9FAFB; }
  }
}

.role-select { min-width: 130px; }
</style>
