<template>
  <q-page class="q-pa-md" style="background: #F8FAFB">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold">Pipeline</h5>
      <q-space />
      <q-btn-toggle
        v-model="viewMode"
        flat
        no-caps
        rounded
        toggle-color="primary"
        :options="[
          { label: 'List', value: 'list', icon: 'view_list' },
          { label: 'Board', value: 'board', icon: 'view_kanban' },
        ]"
        class="q-mr-sm"
      />
      <q-btn unelevated no-caps color="primary" icon="add" label="New Lead" @click="$router.push('/leads/new')" style="border-radius: 10px" />
    </div>

    <!-- Pipeline type tabs -->
    <q-tabs
      v-model="pipelineTab"
      dense
      no-caps
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="q-mb-md pipeline-tabs"
      @update:model-value="onPipelineTabChange"
    >
      <q-tab name="closer" label="Closer" />
      <q-tab name="pm" label="PM" />
      <q-tab name="finance" label="Finance" />
      <q-tab name="maintenance" label="Maintenance" />
    </q-tabs>

    <PipelineFilters
      :source-options="sourceOptions"
      :user-options="userOptions"
      @change="onFilterChange"
    />

    <!-- Board View -->
    <PipelineBoard
      v-if="viewMode === 'board'"
      :stages="filteredStages"
      :loading="pipelineStore.loading"
      @stage-change="onStageChange"
    />

    <!-- List View -->
    <div v-else>
      <div v-if="pipelineStore.loading" class="text-center q-pa-xl">
        <q-spinner-dots color="primary" size="40px" />
      </div>

      <div v-else-if="allLeads.length === 0" class="text-center q-pa-xl text-grey-5">
        No leads found.
      </div>

      <q-card v-else flat class="list-card">
        <q-table
          :rows="allLeads"
          :columns="columns"
          row-key="id"
          flat
          :pagination="{ rowsPerPage: 25 }"
          :rows-per-page-options="[10, 25, 50]"
          class="lead-table"
          @row-click="onRowClick"
        >
          <template #body-cell-name="props">
            <q-td :props="props">
              <span class="text-weight-bold text-primary cursor-pointer">{{ titleCase(props.row.customerName) }}</span>
            </q-td>
          </template>

          <template #body-cell-stage="props">
            <q-td :props="props">
              <q-badge
                :style="{ background: stageColor(props.row.stage) }"
                text-color="white"
                class="stage-badge"
              >
                {{ formatStage(props.row.stage) }}
              </q-badge>
            </q-td>
          </template>

          <template #body-cell-score="props">
            <q-td :props="props">
              <div class="row items-center no-wrap" style="gap: 6px">
                <q-linear-progress
                  :value="props.row.leadScore / 100"
                  :color="scoreColor(props.row.leadScore)"
                  track-color="grey-3"
                  rounded
                  style="width: 50px; height: 6px"
                />
                <span class="text-caption text-weight-medium">{{ props.row.leadScore }}</span>
              </div>
            </q-td>
          </template>

          <template #body-cell-source="props">
            <q-td :props="props">
              <q-chip dense size="sm" color="grey-2" text-color="grey-8">
                {{ formatSource(props.row.leadSource) }}
              </q-chip>
            </q-td>
          </template>

          <template #body-cell-owner="props">
            <q-td :props="props">
              <div v-if="props.row.owner" class="row items-center no-wrap" style="gap: 6px">
                <UserAvatar :user-id="props.row.ownerId" :name="titleCase(props.row.owner)" size="28px" />
                <span class="text-caption">{{ titleCase(props.row.owner) }}</span>
              </div>
              <span v-else class="text-grey-4">--</span>
            </q-td>
          </template>

          <template #body-cell-pm="props">
            <q-td :props="props">
              <div v-if="props.row.projectManager" class="row items-center no-wrap" style="gap: 6px">
                <UserAvatar :user-id="props.row.pmId" :name="titleCase(props.row.projectManager)" size="28px" color="orange-8" />
                <span class="text-caption">{{ titleCase(props.row.projectManager) }}</span>
              </div>
              <span v-else class="text-grey-4">--</span>
            </q-td>
          </template>

          <template #body-cell-created="props">
            <q-td :props="props">
              <span class="text-caption text-grey-6">{{ formatDate(props.row.createdAt) }}</span>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" auto-width>
              <q-btn flat dense round icon="more_vert" size="sm" color="grey-6">
                <q-menu>
                  <q-list dense style="min-width: 150px">
                    <q-item clickable v-close-popup @click="$router.push(`/crm/leads/${props.row.id}`)">
                      <q-item-section avatar><q-icon name="visibility" size="18px" /></q-item-section>
                      <q-item-section>View Details</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="$router.push(`/crm/leads/${props.row.id}`)">
                      <q-item-section avatar><q-icon name="edit" size="18px" /></q-item-section>
                      <q-item-section>Edit Lead</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePipelineStore } from '@/stores/pipeline.store';
import PipelineBoard from '@/components/pipeline/PipelineBoard.vue';
import PipelineFilters from '@/components/pipeline/PipelineFilters.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { titleCase } from '@/utils/format';
import type { PipelineFilterValues } from '@/components/pipeline/PipelineFilters.vue';

const router = useRouter();
const pipelineStore = usePipelineStore();
const viewMode = ref('list');
const pipelineTab = ref('closer');

const PIPELINE_IDS: Record<string, string> = {
  closer: '00000000-0000-0000-0000-000000000001',
  pm: '00000000-0000-0000-0000-000000000002',
  finance: '00000000-0000-0000-0000-000000000003',
  maintenance: '00000000-0000-0000-0000-000000000004',
};

const activeFilters = ref<PipelineFilterValues>({
  search: '',
  source: null,
  assignedTo: null,
  dateFrom: null,
  dateTo: null,
});

const stages = computed(() => pipelineStore.pipelineData?.stages ?? []);

// All leads flat from all stages
const rawLeads = computed(() =>
  stages.value.flatMap((s) =>
    s.leads.map((l) => ({ ...l, stageName: s.name, stageColor: s.color })),
  ),
);

// Client-side filtered leads
const allLeads = computed(() => {
  let result = rawLeads.value;
  const f = activeFilters.value;

  // Search by name
  if (f.search) {
    const q = f.search.toLowerCase();
    result = result.filter((l) =>
      l.customerName.toLowerCase().includes(q)
      || (l.owner ?? '').toLowerCase().includes(q)
      || (l.projectManager ?? '').toLowerCase().includes(q),
    );
  }

  // Filter by source
  if (f.source) {
    result = result.filter((l) => l.leadSource === f.source);
  }

  // Filter by assigned to
  if (f.assignedTo) {
    result = result.filter((l) => l.owner || l.assignedTo);
  }

  // Filter by date range
  if (f.dateFrom) {
    const from = new Date(f.dateFrom).getTime();
    result = result.filter((l) => new Date(l.createdAt).getTime() >= from);
  }
  if (f.dateTo) {
    const to = new Date(f.dateTo).getTime() + 86400000; // include full day
    result = result.filter((l) => new Date(l.createdAt).getTime() <= to);
  }

  return result;
});

// Filtered stages for board view
const filteredStages = computed(() => {
  const f = activeFilters.value;
  const hasFilter = f.search || f.source || f.assignedTo || f.dateFrom || f.dateTo;
  if (!hasFilter) return stages.value;

  return stages.value.map((s) => ({
    ...s,
    leads: s.leads.filter((l) => {
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!l.customerName.toLowerCase().includes(q)
          && !(l.owner ?? '').toLowerCase().includes(q)) return false;
      }
      if (f.source && l.leadSource !== f.source) return false;
      if (f.dateFrom && new Date(l.createdAt).getTime() < new Date(f.dateFrom).getTime()) return false;
      if (f.dateTo && new Date(l.createdAt).getTime() > new Date(f.dateTo).getTime() + 86400000) return false;
      return true;
    }),
  }));
});

const columns = [
  { name: 'name', label: 'Lead Name', field: 'customerName', align: 'left' as const, sortable: true },
  { name: 'stage', label: 'Deal Stage', field: 'stage', align: 'left' as const, sortable: true },
  { name: 'score', label: 'Score', field: 'leadScore', align: 'left' as const, sortable: true },
  { name: 'source', label: 'Source', field: 'leadSource', align: 'left' as const, sortable: true },
  { name: 'owner', label: 'Owner', field: 'owner', align: 'left' as const, sortable: true },
  { name: 'pm', label: 'Project Manager', field: 'projectManager', align: 'left' as const, sortable: true },
  { name: 'created', label: 'Created', field: 'createdAt', align: 'left' as const, sortable: true },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];

const sourceOptions = [
  { label: 'Door Knock', value: 'DOOR_KNOCK' },
  { label: 'Cold Call', value: 'COLD_CALL' },
  { label: 'Referral', value: 'REFERRAL' },
  { label: 'Event', value: 'EVENT' },
  { label: 'Website', value: 'WEBSITE' },
  { label: 'Public Form', value: 'PUBLIC_FORM' },
];

const userOptions = [{ label: 'Me', value: 'me' }];

onMounted(() => {
  pipelineStore.fetchPipelineView({ pipelineId: PIPELINE_IDS[pipelineTab.value] });
});

function onPipelineTabChange(tab: string) {
  pipelineStore.fetchPipelineView({ pipelineId: PIPELINE_IDS[tab] });
}

let debounceTimer: ReturnType<typeof setTimeout>;

function onFilterChange(filters: PipelineFilterValues) {
  activeFilters.value = { ...filters };

  // Server-side search with debounce for better results
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pipelineStore.fetchPipelineView({
      pipelineId: PIPELINE_IDS[pipelineTab.value],
      search: filters.search || undefined,
      source: filters.source ?? undefined,
      dateFrom: filters.dateFrom ?? undefined,
      dateTo: filters.dateTo ?? undefined,
    });
  }, 300);
}

async function onStageChange(payload: { leadId: string; toStage: string }) {
  const lead = stages.value.flatMap((s) => s.leads).find((l) => l.id === payload.leadId);
  const fromStage = lead?.stage;
  if (fromStage) {
    await pipelineStore.moveLeadStage(payload.leadId, fromStage, payload.toStage);
  }
}

function onRowClick(_evt: Event, row: any) {
  router.push(`/crm/leads/${row.id}`);
}

const STAGE_COLORS: Record<string, string> = {
  // Closer
  NEW_LEAD: '#4CAF50', ALREADY_CALLED: '#8BC34A', CONNECTED: '#2196F3',
  REQUEST_DESIGN: '#03A9F4', DESIGN_IN_PROGRESS: '#FF9800', DESIGN_READY: '#9C27B0', WON: '#00897B',
  // PM
  SITE_AUDIT: '#FF5722', PROGRESS_REVIEW: '#E91E63', NTP: '#9C27B0', ENGINEERING: '#3F51B5',
  PERMIT_AND_ICE: '#2196F3', FINAL_APPROVAL: '#00BCD4', INSTALL_READY: '#009688', INSTALL: '#4CAF50',
  COMMISSION: '#8BC34A', SITE_COMPLETE: '#CDDC39', INITIAL_SUBMISSION_AND_INSPECTION: '#FFC107',
  WAITING_FOR_PTO: '#FF9800', FINAL_SUBMISSION: '#FF5722', CUSTOMER_SUCCESS: '#4CAF50',
  // Finance
  FIN_TICKETS_OPEN: '#2196F3', FIN_IN_PROGRESS: '#FF9800', FIN_POST_INITIAL_NURTURE: '#9C27B0', FIN_TICKETS_CLOSED: '#4CAF50',
  // Maintenance
  MAINT_TICKETS_OPEN: '#2196F3', MAINT_IN_PROGRESS: '#FF9800', MAINT_POST_INSTALL_NURTURE: '#9C27B0', MAINT_TICKETS_CLOSED: '#4CAF50',
};

function stageColor(stage: string) {
  return STAGE_COLORS[stage] || '#6B7280';
}

function formatStage(stage: string) {
  return (stage || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSource(s: string) {
  return (s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function scoreColor(score: number) {
  if (score >= 70) return 'positive';
  if (score >= 40) return 'warning';
  return 'grey-5';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
</script>

<style lang="scss" scoped>
.list-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.lead-table {
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
    transition: background 0.15s;

    &:hover {
      background: #F9FAFB;
    }

    td {
      font-size: 13px;
      border-bottom: 1px solid #F3F4F6;
      padding: 10px 16px;
    }
  }
}

.stage-badge {
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
}

.pipeline-tabs {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  overflow: hidden;
}
</style>
