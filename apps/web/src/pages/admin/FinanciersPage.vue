<template>
  <q-page class="financiers-page q-pa-lg">
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="page-title q-ma-none">Financiers</h1>
        <p class="text-grey-6 q-ma-none q-mt-xs text-13">
          Manage financial institutions for solar financing
        </p>
      </div>
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="add"
        label="Add Financier"
        class="rounded-btn"
        @click="openDialog()"
      />
    </div>

    <!-- Error -->
    <q-banner v-if="error" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Retry" @click="fetchFinanciers" />
      </template>
    </q-banner>

    <q-card v-else flat class="rounded-card">
      <q-table
        :rows="financiers"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 20 }"
        no-data-label="No financiers added yet"
      >
        <template #body-cell-active="props">
          <q-td :props="props">
            <q-toggle
              :model-value="props.row.active"
              color="positive"
              dense
              @update:model-value="toggleActive(props.row)"
            />
          </q-td>
        </template>

        <template #body-cell-website="props">
          <q-td :props="props">
            <a
              v-if="props.row.website"
              :href="props.row.website.startsWith('http') ? props.row.website : 'https://' + props.row.website"
              target="_blank"
              class="text-primary no-text-decoration"
            >
              {{ props.row.website }}
            </a>
            <span v-else class="text-grey-4">--</span>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense round icon="edit" color="grey-7" size="sm" @click="openDialog(props.row)">
              <q-tooltip>Edit</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete_outline" color="red-4" size="sm" @click="confirmDelete(props.row)">
              <q-tooltip>Delete</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card class="dialog-card-lg">
        <q-card-section>
          <div class="text-h6 text-weight-bold">
            {{ editingFinancier ? 'Edit Financier' : 'Add Financier' }}
          </div>
        </q-card-section>

        <q-card-section class="q-gutter-md q-pt-none">
          <q-input v-model="form.name" label="Name *" outlined dense :rules="[v => !!v || 'Required']" />
          <q-select
            v-model="form.type"
            :options="typeOptions"
            label="Type *"
            outlined
            dense
            emit-value
            map-options
            :rules="[v => !!v || 'Required']"
          />
          <q-input v-model="form.contactEmail" label="Contact Email" outlined dense type="email" />
          <q-input v-model="form.contactPhone" label="Contact Phone" outlined dense />
          <q-input v-model="form.website" label="Website" outlined dense />
          <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" autogrow />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            no-caps
            :label="editingFinancier ? 'Save Changes' : 'Add Financier'"
            color="primary"
            :loading="saving"
            :disable="!form.name || !form.type"
            class="radius-10"
            @click="saveFinancier"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

interface Financier {
  id: string;
  name: string;
  type: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  notes: string;
  active: boolean;
}

const $q = useQuasar();
const loading = ref(false);
const error = ref<string | null>(null);
const saving = ref(false);
const financiers = ref<Financier[]>([]);
const dialogOpen = ref(false);
const editingFinancier = ref<Financier | null>(null);

const form = ref({
  name: '',
  type: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  notes: '',
});

const typeOptions = [
  { label: 'Loan', value: 'Loan' },
  { label: 'PPA', value: 'PPA' },
  { label: 'Lease', value: 'Lease' },
  { label: 'Cash', value: 'Cash' },
];

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'left' as const, sortable: true },
  { name: 'contactEmail', label: 'Contact Email', field: 'contactEmail', align: 'left' as const },
  { name: 'contactPhone', label: 'Phone', field: 'contactPhone', align: 'left' as const },
  { name: 'website', label: 'Website', field: 'website', align: 'left' as const },
  { name: 'active', label: 'Active', field: 'active', align: 'center' as const },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' as const },
];

onMounted(() => {
  fetchFinanciers();
});

async function fetchFinanciers() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get('/settings/financiers');
    financiers.value = Array.isArray(data) ? data : data.data ?? [];
  } catch {
    error.value = 'Failed to load financiers. Please try again.';
    financiers.value = [];
  } finally {
    loading.value = false;
  }
}

function openDialog(financier?: Financier) {
  if (financier) {
    editingFinancier.value = financier;
    form.value = {
      name: financier.name,
      type: financier.type,
      contactEmail: financier.contactEmail || '',
      contactPhone: financier.contactPhone || '',
      website: financier.website || '',
      notes: financier.notes || '',
    };
  } else {
    editingFinancier.value = null;
    form.value = { name: '', type: '', contactEmail: '', contactPhone: '', website: '', notes: '' };
  }
  dialogOpen.value = true;
}

async function saveFinancier() {
  if (!form.value.name || !form.value.type) return;
  saving.value = true;
  try {
    const updated = [...financiers.value];
    if (editingFinancier.value) {
      const idx = updated.findIndex((f) => f.id === editingFinancier.value!.id);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...form.value };
      }
    } else {
      updated.push({
        id: crypto.randomUUID(),
        ...form.value,
        active: true,
      });
    }
    await api.put('/settings/financiers', updated);
    financiers.value = updated;
    dialogOpen.value = false;
    $q.notify({ type: 'positive', message: editingFinancier.value ? 'Financier updated' : 'Financier added' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save financier' });
  } finally {
    saving.value = false;
  }
}

async function toggleActive(financier: Financier) {
  const updated = financiers.value.map((f) =>
    f.id === financier.id ? { ...f, active: !f.active } : f,
  );
  try {
    await api.put('/settings/financiers', updated);
    financiers.value = updated;
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update status' });
  }
}

function confirmDelete(financier: Financier) {
  $q.dialog({
    title: 'Delete Financier',
    message: `Are you sure you want to delete "${financier.name}"?`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      const updated = financiers.value.filter((f) => f.id !== financier.id);
      await api.put('/settings/financiers', updated);
      financiers.value = updated;
      $q.notify({ type: 'positive', message: 'Financier deleted' });
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to delete financier' });
    }
  });
}
</script>

<style lang="scss" scoped>
.financiers-page {
  background: #F8FAFB;
  min-height: 100vh;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A2E;
}

.rounded-card {
  border-radius: 12px;
  border: 1px solid #E5E7EB;
}

.rounded-btn {
  border-radius: 10px;
  font-weight: 600;
}

.no-text-decoration {
  text-decoration: none;
}
</style>
