<template>
  <q-page class="q-pa-md page-bg">
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
        aria-label="Switch between list and board view"
      />
      <q-btn unelevated no-caps color="primary" icon="add" label="New Lead" @click="$router.push('/leads/new')" class="radius-10" aria-label="Create a new lead" />
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
      <q-tab name="closer" label="Closer" aria-label="Closer pipeline" />
      <q-tab name="pm" label="PM" aria-label="Project Manager pipeline" />
      <q-tab name="finance" label="Finance" aria-label="Finance pipeline" />
      <q-tab name="maintenance" label="Maintenance" aria-label="Maintenance pipeline" />
    </q-tabs>

    <PipelineFilters
      :source-options="sourceOptions"
      :user-options="userOptions"
      @change="onFilterChange"
    />

    <!-- Error -->
    <q-banner v-if="error" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

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
              <div class="row items-center no-wrap gap-xs">
                <q-linear-progress
                  :value="props.row.leadScore / 100"
                  :color="scoreColor(props.row.leadScore)"
                  track-color="grey-3"
                  rounded
                  class="score-bar-lg"
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
              <div v-if="props.row.owner" class="row items-center no-wrap gap-xs">
                <UserAvatar :user-id="props.row.ownerId" :name="titleCase(props.row.owner)" size="28px" />
                <span class="text-caption">{{ titleCase(props.row.owner) }}</span>
              </div>
              <span v-else class="text-grey-4">--</span>
            </q-td>
          </template>

          <template #body-cell-pm="props">
            <q-td :props="props">
              <div v-if="props.row.projectManager" class="row items-center no-wrap gap-xs">
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
              <q-btn flat dense round icon="more_vert" size="sm" color="grey-6" aria-label="Lead actions menu" @click.stop>
                <q-menu>
                  <q-list dense class="menu-sm">
                    <q-item clickable v-close-popup @click="router.push(`/crm/leads/${props.row.id}`)">
                      <q-item-section avatar><q-icon name="visibility" size="18px" /></q-item-section>
                      <q-item-section>View Details</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="quickStageChange(props.row.id, props.row.stage, 'advance')">
                      <q-item-section avatar><q-icon name="arrow_forward" size="18px" color="primary" /></q-item-section>
                      <q-item-section>Advance Stage</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="markLeadLost(props.row.id)">
                      <q-item-section avatar><q-icon name="thumb_down" size="18px" color="orange" /></q-item-section>
                      <q-item-section>Mark as Lost</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="deleteLead(props.row.id, props.row.customerName)">
                      <q-item-section avatar><q-icon name="delete" size="18px" color="negative" /></q-item-section>
                      <q-item-section class="text-negative">Delete Lead</q-item-section>
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
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import { usePipelineStore } from '@/stores/pipeline.store';
import PipelineBoard from '@/components/pipeline/PipelineBoard.vue';
import PipelineFilters from '@/components/pipeline/PipelineFilters.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { titleCase } from '@/composables/useLeadFormatting';
import { useLeadFormatting } from '@/composables/useLeadFormatting';
import type { PipelineFilterValues } from '@/components/pipeline/PipelineFilters.vue';
import {
  CLOSER_PIPELINE_STAGES,
  PM_PIPELINE_STAGES,
  FINANCE_PIPELINE_STAGES,
  MAINTENANCE_PIPELINE_STAGES,
} from '@loop/shared';

const { stageColor, formatStage, formatSource } = useLeadFormatting();

const $q = useQuasar();
const router = useRouter();
const pipelineStore = usePipelineStore();
const viewMode = ref('list');
const pipelineTab = ref('closer');
const error = ref<string | null>(null);
const pipelineIds = ref<Record<string, string>>({});

// Stages that belong to each pipeline tab
const PIPELINE_STAGE_SETS: Record<string, Set<string>> = {
  closer: new Set(CLOSER_PIPELINE_STAGES.map((s) => s.stage)),
  pm: new Set(PM_PIPELINE_STAGES.map((s) => s.stage)),
  finance: new Set(FINANCE_PIPELINE_STAGES.map((s) => s.stage)),
  maintenance: new Set(MAINTENANCE_PIPELINE_STAGES.map((s) => s.stage)),
};

const activeFilters = ref<PipelineFilterValues>({
  search: '',
  source: null,
  assignedTo: null,
  dateFrom: null,
  dateTo: null,
});

const allStages = computed(() => pipelineStore.pipelineData?.stages ?? []);

// Filter stages to only show those belonging to the active pipeline tab
const stages = computed(() => {
  const allowedStages = PIPELINE_STAGE_SETS[pipelineTab.value];
  if (!allowedStages) return allStages.value;
  return allStages.value.filter((s) => allowedStages.has(s.id));
});

// All leads flat from filtered stages
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

async function loadData() {
  error.value = null;
  try {
    await pipelineStore.fetchPipelineView({ pipelineId: pipelineIds.value[pipelineTab.value] || undefined });
  } catch {
    error.value = 'Failed to load pipeline data. Please try again.';
  }
}

onMounted(() => { loadData(); });

function onPipelineTabChange(tab: string) {
  pipelineStore.fetchPipelineView({ pipelineId: pipelineIds.value[tab] || undefined });
}

let debounceTimer: ReturnType<typeof setTimeout>;

function onFilterChange(filters: PipelineFilterValues) {
  activeFilters.value = { ...filters };

  // Server-side search with debounce for better results
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pipelineStore.fetchPipelineView({
      pipelineId: pipelineIds.value[pipelineTab.value] || undefined,
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
    // Refresh after backend event handlers process (auto-transition, task creation)
    setTimeout(() => loadData(), 2000);
  }
}

function onRowClick(_evt: Event, row: { id: string }) {
  router.push(`/crm/leads/${row.id}`);
}

function scoreColor(score: number) {
  if (score >= 70) return 'positive';
  if (score >= 40) return 'warning';
  return 'grey-5';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get the next stage in sequence for the current pipeline tab
function getNextStage(currentStage: string): string | null {
  const stageList = PIPELINE_STAGE_SETS[pipelineTab.value];
  if (!stageList) return null;
  const allStagesInTab = allStages.value.filter((s) => stageList.has(s.id));
  const sorted = allStagesInTab.sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === currentStage);
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1].id : null;
}

async function quickStageChange(leadId: string, currentStage: string, _action: string) {
  const next = getNextStage(currentStage);
  if (!next) {
    $q.notify({ type: 'warning', message: 'This lead is already at the last stage' });
    return;
  }
  try {
    await pipelineStore.moveLeadStage(leadId, currentStage, next);
    $q.notify({ type: 'positive', message: `Lead advanced to ${formatStage(next)}` });
    setTimeout(() => loadData(), 2000);
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to advance stage' });
  }
}

async function markLeadLost(leadId: string) {
  $q.dialog({
    title: 'Mark as Lost',
    message: 'Why was this lead lost?',
    prompt: { model: '', type: 'text', label: 'Reason' },
    cancel: true,
  }).onOk(async (reason: string) => {
    try {
      await api.patch(`/leads/${leadId}/lost`, { reason: reason || 'No reason provided' });
      $q.notify({ type: 'positive', message: 'Lead marked as lost' });
      loadData();
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to mark lead as lost' });
    }
  });
}

function deleteLead(leadId: string, customerName: string) {
  $q.dialog({
    title: 'Delete Lead',
    message: `Are you sure you want to delete "${customerName}"? This action cannot be undone.`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      await api.delete(`/leads/${leadId}`);
      $q.notify({ type: 'positive', message: 'Lead deleted' });
      loadData();
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to delete lead' });
    }
  });
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
