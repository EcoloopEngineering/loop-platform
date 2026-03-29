<template>
  <q-page class="q-pa-md" style="background: #F8FAFB; min-height: 100vh">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold">My Leads</h5>
      <q-badge v-if="filteredLeads.length" color="grey-3" text-color="grey-7" class="q-ml-sm" style="font-size: 12px">
        {{ filteredLeads.length }}
      </q-badge>
      <q-space />
      <q-btn unelevated no-caps color="primary" icon="add" label="New Lead" @click="$router.push('/leads/new')" style="border-radius: 10px" />
    </div>

    <!-- Search -->
    <q-input
      v-model="search"
      dense
      outlined
      placeholder="Search by name, email, or phone..."
      class="q-mb-md"
      style="max-width: 400px"
      @update:model-value="onSearch"
    >
      <template #prepend><q-icon name="search" /></template>
      <template v-if="search" #append>
        <q-icon name="close" class="cursor-pointer" @click="search = ''" />
      </template>
    </q-input>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredLeads.length === 0" class="text-center q-pa-xl">
      <q-icon name="person_search" size="64px" color="grey-4" />
      <div class="text-grey-6 q-mt-md" style="font-size: 16px">No leads found</div>
      <div class="text-grey-5 q-mt-xs" style="font-size: 13px">
        {{ search ? 'Try a different search' : 'Create your first lead to get started' }}
      </div>
      <q-btn
        v-if="!search"
        unelevated
        no-caps
        color="primary"
        icon="add"
        label="Create Lead"
        class="q-mt-md"
        style="border-radius: 10px"
        @click="$router.push('/leads/new')"
      />
    </div>

    <!-- Leads list -->
    <q-card v-else flat class="leads-card">
      <q-table
        :rows="filteredLeads"
        :columns="columns"
        row-key="id"
        flat
        :pagination="{ rowsPerPage: 15 }"
        :rows-per-page-options="[10, 15, 25, 50]"
        class="leads-table"
        @row-click="onRowClick"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap" style="gap: 10px">
              <UserAvatar :name="titleCase(props.row.name)" size="32px" />
              <div>
                <div class="text-weight-bold text-primary cursor-pointer">{{ titleCase(props.row.name) }}</div>
                <div class="text-caption text-grey-5">{{ props.row.email }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-stage="props">
          <q-td :props="props">
            <q-badge
              :style="{ background: stageColor(props.row.stage) }"
              text-color="white"
              style="border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 600"
            >
              {{ formatStage(props.row.stage) }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-score="props">
          <q-td :props="props">
            <div class="row items-center no-wrap" style="gap: 6px">
              <q-linear-progress
                :value="props.row.score / 100"
                :color="props.row.score >= 70 ? 'positive' : props.row.score >= 40 ? 'warning' : 'grey-5'"
                track-color="grey-3"
                rounded
                style="width: 40px; height: 5px"
              />
              <span class="text-caption text-weight-medium">{{ props.row.score }}</span>
            </div>
          </q-td>
        </template>

        <template #body-cell-source="props">
          <q-td :props="props">
            <q-chip dense size="sm" color="grey-2" text-color="grey-8">
              {{ formatSource(props.row.source) }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-created="props">
          <q-td :props="props">
            <span class="text-caption text-grey-6">{{ timeAgo(props.row.createdAt) }}</span>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/boot/axios';
import { titleCase } from '@/utils/format';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { useLeadFormatting } from '@/composables/useLeadFormatting';

const { stageColor, formatStage, formatSource, timeAgo } = useLeadFormatting();

const router = useRouter();
const loading = ref(true);
const search = ref('');
const leads = ref<any[]>([]);
const currentUserId = ref<string | null>(null);

const columns = [
  { name: 'name', label: 'Lead Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'stage', label: 'Stage', field: 'stage', align: 'left' as const, sortable: true },
  { name: 'score', label: 'Score', field: 'score', align: 'left' as const, sortable: true },
  { name: 'source', label: 'Source', field: 'source', align: 'left' as const, sortable: true },
  { name: 'created', label: 'Created', field: 'createdAt', align: 'left' as const, sortable: true },
];

// Only show leads belonging to the current user
const myLeads = computed(() => {
  const uid = currentUserId.value;
  if (!uid) return [];

  return leads.value.filter((l: any) => {
    if (l.createdById === uid) return true;
    if (l.assignments?.some((a: any) => a.userId === uid)) return true;
    if (l.projectManagerId === uid) return true;
    return false;
  });
});

const filteredLeads = computed(() => {
  let result = myLeads.value.map((l: any) => ({
    id: l.id,
    name: `${l.customer?.firstName ?? ''} ${l.customer?.lastName ?? ''}`.trim() || 'Unknown',
    email: l.customer?.email ?? '--',
    phone: l.customer?.phone ?? '--',
    stage: l.currentStage,
    score: Number(l.score?.totalScore ?? 0),
    source: l.source,
    createdAt: l.createdAt,
  }));

  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(
      (l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.phone.includes(q),
    );
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

onMounted(async () => {
  try {
    const { data: me } = await api.get('/auth/me');
    currentUserId.value = me.id;
  } catch { /* ignore */ }

  try {
    const { data } = await api.get('/leads', { params: { limit: 100 } });
    leads.value = Array.isArray(data) ? data : data.data ?? [];
  } catch { /* ignore */ }

  loading.value = false;
});

function onSearch() { /* reactive via computed */ }

function onRowClick(_evt: Event, row: any) {
  router.push(`/leads/${row.id}`);
}

</script>

<style lang="scss" scoped>
.leads-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.leads-table {
  :deep(thead th) {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #6B7280;
    letter-spacing: 0.04em;
    border-bottom: 2px solid #E5E7EB;
  }

  :deep(tbody tr) {
    cursor: pointer;
    transition: background 150ms;
    &:hover { background: #F9FAFB; }
    td {
      font-size: 13px;
      border-bottom: 1px solid #F3F4F6;
      padding: 10px 16px;
    }
  }
}
</style>
