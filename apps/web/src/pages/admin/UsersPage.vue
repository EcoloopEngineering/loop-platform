<template>
  <q-page class="q-pa-md page-bg">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold">Users</h5>
      <q-space />
      <q-btn unelevated no-caps color="primary" icon="person_add" label="Create User" class="radius-10" aria-label="Create a new user" @click="showCreateDialog = true" />
    </div>

    <!-- Tabs -->
    <q-tabs v-model="activeTab" dense no-caps active-color="primary" indicator-color="primary" class="q-mb-md" align="left">
      <q-tab name="employees" icon="badge" :label="`Employees (${employees.length})`" />
      <q-tab name="partners" icon="handshake" :label="`Partners (${partners.length})`" />
    </q-tabs>

    <!-- Search -->
    <q-input v-model="search" dense outlined placeholder="Search by name or email..." class="q-mb-md search-input" aria-label="Search users by name or email">
      <template #prepend><q-icon name="search" aria-hidden="true" /></template>
      <template #append><q-icon v-if="search" name="close" class="cursor-pointer" role="button" aria-label="Clear search" @click="search = ''" /></template>
    </q-input>

    <!-- Pending Approval Banner -->
    <q-banner v-if="!loading && pendingUsers.length" class="bg-amber-1 q-mb-md" rounded>
      <template #avatar><q-icon name="pending_actions" color="amber-8" /></template>
      <strong>{{ pendingUsers.length }} user{{ pendingUsers.length > 1 ? 's' : '' }} pending approval</strong>
    </q-banner>

    <!-- Pending Users Table -->
    <q-card v-if="!loading && pendingUsers.length" flat class="table-card q-mb-lg">
      <q-card-section class="q-pb-none">
        <div class="text-subtitle1 text-weight-bold">Pending Approval</div>
      </q-card-section>
      <q-table
        :rows="pendingUsers"
        :columns="pendingColumns"
        row-key="id"
        flat
        :pagination="{ rowsPerPage: 10 }"
        class="users-table"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap gap-md">
              <UserAvatar :user-id="props.row.id" :name="titleCase(props.row.name)" size="36px" color="amber-7" />
              <div>
                <div class="text-weight-medium">{{ titleCase(props.row.name) }}</div>
                <div class="text-caption text-grey-5">{{ props.row.email }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-registeredAt="props">
          <q-td :props="props">
            {{ formatDate(props.row.createdAt) }}
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" auto-width>
            <div class="row no-wrap gap-xs">
              <q-btn
                unelevated
                no-caps
                dense
                color="primary"
                icon="check"
                label="Approve"
                size="sm"
                class="radius-10"
                aria-label="Approve user"
                @click="openApproveDialog(props.row)"
              />
              <q-btn
                flat
                no-caps
                dense
                color="negative"
                icon="close"
                label="Reject"
                size="sm"
                aria-label="Reject user"
                @click="confirmReject(props.row)"
              />
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="error" class="bg-negative text-white q-ma-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

    <!-- Empty -->
    <div v-else-if="allUsers.length === 0" class="text-center q-pa-xl text-grey-5">
      <q-icon name="group" size="48px" class="q-mb-md" />
      <div>No users found</div>
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
                <div class="row items-center no-wrap gap-md">
                  <UserAvatar :user-id="props.row.id" :name="titleCase(props.row.name)" size="36px" />
                  <div>
                    <div class="text-weight-medium">{{ titleCase(props.row.name) }}</div>
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
                  aria-label="Change user role"
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
                <q-btn flat dense round icon="more_vert" size="sm" color="grey-6" aria-label="User actions menu">
                  <q-menu>
                    <q-list dense class="menu-sm">
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
                <div class="row items-center no-wrap gap-md">
                  <UserAvatar :user-id="props.row.id" :name="titleCase(props.row.name)" size="36px" color="orange-7" />
                  <div>
                    <div class="text-weight-medium">{{ titleCase(props.row.name) }}</div>
                  </div>
                </div>
              </q-td>
            </template>

            <template #body-cell-referredBy="props">
              <q-td :props="props">
                <div v-if="props.row.referredBy" class="row items-center no-wrap gap-xs">
                  <q-avatar size="26px" color="primary" text-color="white" class="avatar-text-md">
                    {{ props.row.referredBy.charAt(0) }}
                  </q-avatar>
                  <span class="text-caption">{{ titleCase(props.row.referredBy) }}</span>
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
                <q-btn flat dense round icon="more_vert" size="sm" color="grey-6" aria-label="Partner actions menu">
                  <q-menu>
                    <q-list dense class="menu-sm">
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
    <q-dialog v-model="showCreateDialog" persistent @keyup.esc="showCreateDialog = false" aria-label="Create user dialog">
      <q-card class="dialog-card">
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
          <q-input v-model="newUser.phone" label="Phone (optional)" outlined dense mask="(###) ###-####" unmasked-value />
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
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup aria-label="Cancel user creation" />
          <q-btn unelevated no-caps label="Create User" color="primary" :loading="creating" @click="createUser" class="radius-10" aria-label="Confirm create user" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Approve User Dialog -->
    <q-dialog v-model="showApproveDialog" @keyup.esc="showApproveDialog = false" aria-label="Approve user dialog">
      <q-card style="min-width: 380px" class="dialog-card">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Approve User</div>
        </q-card-section>

        <q-card-section>
          <p class="q-mb-md">
            Approve <strong>{{ approveTarget?.firstName }} {{ approveTarget?.lastName }}</strong>
            ({{ approveTarget?.email }})?
          </p>
          <q-select
            v-model="approveRole"
            :options="allRoleOptions"
            label="Assign Role"
            emit-value
            map-options
            outlined
            dense
            aria-label="Select role for user approval"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup aria-label="Cancel approval" />
          <q-btn
            unelevated
            no-caps
            label="Approve"
            color="primary"
            :loading="approving"
            class="radius-10"
            aria-label="Confirm user approval"
            @click="approveUser"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit User Dialog -->
    <q-dialog v-model="showEditDialog" persistent @keyup.esc="showEditDialog = false" aria-label="Edit user dialog">
      <q-card class="dialog-card">
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
          <q-input v-model="editForm.phone" label="Phone" outlined dense mask="(###) ###-####" unmasked-value />
          <q-select
            v-model="editForm.role"
            :options="editRoleOptions"
            label="Role"
            emit-value
            map-options
            outlined
            dense
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup aria-label="Cancel editing user" />
          <q-btn unelevated no-caps label="Save Changes" color="primary" :loading="saving" @click="saveEdit" class="radius-10" aria-label="Save user changes" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import { titleCase } from '@/composables/useLeadFormatting';
import UserAvatar from '@/components/common/UserAvatar.vue';

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
  referredBy?: string;
  leadCount: number;
  createdAt: string;
}

const allUsers = ref<UserRow[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const activeTab = ref('employees');

const employeeRoleOptions = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Manager (PM)', value: 'MANAGER' },
  { label: 'Sales Rep', value: 'SALES_REP' },
];

const partnerRoleOptions = [
  { label: 'Sales Rep', value: 'SALES_REP' },
  { label: 'Referral', value: 'REFERRAL' },
];

const roleOptions = computed(() => {
  if (activeTab.value === 'partners') return partnerRoleOptions;
  return employeeRoleOptions;
});

const pendingUsers = computed(() => allUsers.value.filter((u) => !u.isActive));
const activeUsers = computed(() => allUsers.value.filter((u) => u.isActive));
const employees = computed(() => activeUsers.value.filter((u) => u.email.endsWith('@ecoloop.us')));
const partners = computed(() => activeUsers.value.filter((u) => !u.email.endsWith('@ecoloop.us')));

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

const pendingColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const },
  { name: 'registeredAt', label: 'Registered', field: 'createdAt', align: 'left' as const, sortable: true },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];

const allRoleOptions = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Manager (PM)', value: 'MANAGER' },
  { label: 'Sales Rep', value: 'SALES_REP' },
  { label: 'Referral', value: 'REFERRAL' },
];

// ---- Approve User ----
const showApproveDialog = ref(false);
const approving = ref(false);
const approveTarget = ref<UserRow | null>(null);
const approveRole = ref('SALES_REP');

function openApproveDialog(user: UserRow) {
  approveTarget.value = user;
  approveRole.value = user.email.endsWith('@ecoloop.us') ? 'SALES_REP' : 'REFERRAL';
  showApproveDialog.value = true;
}

async function approveUser() {
  if (!approveTarget.value) return;
  approving.value = true;
  try {
    await api.patch(`/users/${approveTarget.value.id}/approve`, { role: approveRole.value });
    $q.notify({ type: 'positive', message: `${approveTarget.value.firstName} ${approveTarget.value.lastName} approved` });
    showApproveDialog.value = false;
    approveTarget.value = null;
    await loadData();
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: { message?: string } } };
    $q.notify({ type: 'negative', message: axErr?.response?.data?.message || 'Failed to approve user' });
  } finally {
    approving.value = false;
  }
}

// ---- Reject User ----
function confirmReject(user: UserRow) {
  $q.dialog({
    title: 'Reject User',
    message: `Are you sure you want to reject ${user.firstName} ${user.lastName} (${user.email})? This will permanently delete their account.`,
    cancel: true,
    ok: { label: 'Reject', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      await api.delete(`/users/${user.id}/reject`);
      $q.notify({ type: 'positive', message: 'User rejected and removed' });
      await loadData();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } } };
      $q.notify({ type: 'negative', message: axErr?.response?.data?.message || 'Failed to reject user' });
    }
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get('/users');
    const list = Array.isArray(data) ? data : data.data ?? [];
    interface RawUser {
      id: string; firstName: string; lastName: string; email: string;
      phone?: string; role: string; nickname?: string; isActive: boolean; createdAt: string;
      referralsReceived?: Array<{ inviter: { firstName: string; lastName: string } }>;
      _count?: { leadAssignments?: number };
    }
    allUsers.value = (list as RawUser[]).map((u) => ({
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
      referredBy: u.referralsReceived?.[0]?.inviter
        ? `${u.referralsReceived[0].inviter.firstName} ${u.referralsReceived[0].inviter.lastName}`
        : undefined,
      leadCount: u._count?.leadAssignments ?? 0,
      createdAt: u.createdAt,
    }));
  } catch {
    error.value = 'Failed to load users. Please try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => { loadData(); });

// ---- Update User ----
async function updateUser(userId: string, updates: Record<string, string | boolean>) {
  try {
    // Role changes use dedicated admin endpoint
    if (updates.role) {
      await api.patch(`/users/${userId}/role`, { role: updates.role });
    } else {
      await api.put(`/users/${userId}`, updates);
    }
    const user = allUsers.value.find((u) => u.id === userId);
    if (user) Object.assign(user, updates);
    $q.notify({ type: 'positive', message: 'User updated' });
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: { message?: string } } };
    $q.notify({ type: 'negative', message: axErr?.response?.data?.message || 'Failed to update user' });
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
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: { message?: string } } };
    $q.notify({ type: 'negative', message: axErr?.response?.data?.message || 'Failed to create user' });
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

const editRoleOptions = computed(() => {
  return editForm.email.endsWith('@ecoloop.us') ? employeeRoleOptions : partnerRoleOptions;
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
    // Update profile fields
    await api.put(`/users/${editForm.id}`, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      phone: editForm.phone,
    });
    // Update role separately via admin endpoint
    const currentRole = allUsers.value.find(u => u.id === editForm.id)?.role;
    if (editForm.role && editForm.role !== currentRole) {
      await api.patch(`/users/${editForm.id}/role`, { role: editForm.role });
    }
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
