<template>
  <q-card flat class="settings-card q-mb-lg">
    <q-card-section>
      <div class="row items-center q-mb-md">
        <div class="section-title">Pipeline Configuration</div>
        <q-space />
        <q-btn unelevated no-caps color="primary" icon="add" label="Add Stage" size="sm" class="radius-md" @click="openAddStage" />
      </div>

      <q-tabs v-model="activePipelineTab" dense no-caps active-color="primary" indicator-color="primary" class="q-mb-md" align="left">
        <q-tab name="closer" label="Closer" />
        <q-tab name="pm" label="Project Manager" />
        <q-tab name="finance" label="Finance" />
        <q-tab name="maintenance" label="Maintenance" />
      </q-tabs>

      <div v-if="loadingPipeline" class="row justify-center q-pa-lg">
        <q-spinner-dots color="primary" size="32px" />
      </div>
      <div v-else-if="activePipelineStages.length === 0" class="text-secondary-color text-body2">
        No pipeline stages configured.
      </div>
      <q-list v-else separator class="pipeline-list">
        <q-item v-for="(stage, i) in activePipelineStages" :key="stage.stage" class="pipeline-item">
          <q-item-section avatar class="pipeline-order-col">
            <div class="text-caption text-grey-5 text-weight-bold">#{{ stage.order ?? (i + 1) }}</div>
          </q-item-section>
          <q-item-section avatar>
            <q-btn round flat size="sm" :style="{ color: stage.color || '#6B7280' }" icon="circle" @click="pickColor(stage)">
              <q-tooltip>Change color</q-tooltip>
            </q-btn>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium primary-text">
              {{ stage.label }}
            </q-item-label>
            <q-item-label caption class="secondary-text">
              {{ stage.stage }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row items-center q-gutter-xs">
              <q-btn flat round dense icon="arrow_upward" size="xs" color="grey-5" :disable="i === 0" @click="moveStage(i, -1)">
                <q-tooltip>Move up</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="arrow_downward" size="xs" color="grey-5" :disable="i === activePipelineStages.length - 1" @click="moveStage(i, 1)">
                <q-tooltip>Move down</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="edit" size="xs" color="grey-6" @click="editStage(stage)">
                <q-tooltip>Edit label</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="delete_outline" size="xs" color="red-4" @click="deleteStage(stage)">
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>

  <!-- Color Picker Dialog -->
  <q-dialog v-model="showColorPicker">
    <q-card class="dialog-card-sm">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold">Pick a color</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="row q-gutter-sm justify-center">
          <q-btn
            v-for="c in colorPalette"
            :key="c"
            round
            unelevated
            size="sm"
            :style="{ background: c, border: colorEditTarget?.color === c ? '3px solid #1A1A2E' : 'none' }"
            @click="applyColor(c)"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>

  <!-- Add/Edit Stage Dialog -->
  <q-dialog v-model="showStageDialog" persistent>
    <q-card class="dialog-card">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold">{{ stageDialogMode === 'add' ? 'Add Pipeline Stage' : 'Edit Stage' }}</div>
      </q-card-section>
      <q-card-section class="q-gutter-md q-pt-none">
        <q-input v-if="stageDialogMode === 'add'" v-model="stageForm.stage" label="Stage Key (e.g. SITE_VISIT)" outlined dense hint="UPPERCASE_WITH_UNDERSCORES" />
        <q-input v-model="stageForm.label" label="Display Label" outlined dense />
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
        <q-btn unelevated no-caps :label="stageDialogMode === 'add' ? 'Add Stage' : 'Save'" color="primary" @click="saveStageDialog" class="radius-10" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

const $q = useQuasar();

interface PipelineStage {
  stage: string;
  label: string;
  order: number;
  color: string;
}

const allPipelineStages = ref<Record<string, PipelineStage[]>>({
  closer: [],
  pm: [],
  finance: [],
  maintenance: [],
});
const activePipelineTab = ref('closer');
const loadingPipeline = ref(false);

const activePipelineStages = computed(() => allPipelineStages.value[activePipelineTab.value] ?? []);
const pipelineStages = computed({
  get: () => allPipelineStages.value[activePipelineTab.value] ?? [],
  set: (val) => { allPipelineStages.value[activePipelineTab.value] = val; },
});

async function loadPipelineStages() {
  loadingPipeline.value = true;
  try {
    const { data } = await api.get('/pipeline/stages');
    allPipelineStages.value = {
      closer: data.closer ?? [],
      pm: data.pm ?? data.projectManager ?? [],
      finance: data.finance ?? [],
      maintenance: data.maintenance ?? [],
    };
  } catch {
    // Silently fail
  } finally {
    loadingPipeline.value = false;
  }
}

onMounted(() => loadPipelineStages());

// Color picker
const showColorPicker = ref(false);
const colorEditTarget = ref<PipelineStage | null>(null);
const colorPalette = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
  '#00897B', '#607D8B', '#E91E63', '#3F51B5', '#009688',
  '#FF5722', '#795548', '#CDDC39', '#00BCD4', '#FFC107',
  '#8BC34A', '#673AB7', '#EF4444', '#1A1A2E', '#6B7280',
];

function pickColor(stage: PipelineStage) {
  colorEditTarget.value = stage;
  showColorPicker.value = true;
}

function applyColor(color: string) {
  if (colorEditTarget.value) {
    colorEditTarget.value.color = color;
    savePipelineStages();
  }
  showColorPicker.value = false;
}

// Add/Edit Stage Dialog
const showStageDialog = ref(false);
const stageDialogMode = ref<'add' | 'edit'>('add');
const stageForm = reactive({ stage: '', label: '', editTarget: null as PipelineStage | null });

function openAddStage() {
  stageDialogMode.value = 'add';
  stageForm.stage = '';
  stageForm.label = '';
  stageForm.editTarget = null;
  showStageDialog.value = true;
}

function editStage(stage: PipelineStage) {
  stageDialogMode.value = 'edit';
  stageForm.stage = stage.stage;
  stageForm.label = stage.label;
  stageForm.editTarget = stage;
  showStageDialog.value = true;
}

function saveStageDialog() {
  if (stageDialogMode.value === 'add') {
    if (!stageForm.stage || !stageForm.label) {
      $q.notify({ type: 'warning', message: 'Stage key and label are required' });
      return;
    }
    const key = stageForm.stage.toUpperCase().replace(/\s+/g, '_');
    if (pipelineStages.value.find((s) => s.stage === key)) {
      $q.notify({ type: 'warning', message: 'Stage key already exists' });
      return;
    }
    pipelineStages.value.push({
      stage: key,
      label: stageForm.label,
      order: pipelineStages.value.length + 1,
      color: colorPalette[pipelineStages.value.length % colorPalette.length],
    });
  } else if (stageForm.editTarget) {
    stageForm.editTarget.label = stageForm.label;
  }
  savePipelineStages();
  showStageDialog.value = false;
}

function moveStage(index: number, direction: number) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= pipelineStages.value.length) return;
  const arr = [...pipelineStages.value];
  [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
  arr.forEach((s, i) => { s.order = i + 1; });
  pipelineStages.value = arr;
  savePipelineStages();
}

function deleteStage(stage: PipelineStage) {
  $q.dialog({
    title: 'Delete Stage',
    message: `Delete "${stage.label}"? Leads in this stage will need to be moved first.`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative', flat: true },
  }).onOk(() => {
    pipelineStages.value = pipelineStages.value.filter((s) => s.stage !== stage.stage);
    pipelineStages.value.forEach((s, i) => { s.order = i + 1; });
    savePipelineStages();
  });
}

async function savePipelineStages() {
  try {
    $q.notify({ type: 'positive', message: 'Pipeline stages updated', timeout: 1000 });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save pipeline stages' });
  }
}

function confirmResetPipeline() {
  $q.dialog({
    title: 'Reset Pipeline Stages',
    message: 'This will reset all pipeline stages to their default configuration. This action cannot be undone.',
    cancel: true,
    persistent: true,
    color: 'red',
    ok: { label: 'Reset', color: 'red', flat: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      await api.post('/admin/pipeline/reset');
      $q.notify({ type: 'positive', message: 'Pipeline stages reset to defaults.' });
      await loadPipelineStages();
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to reset pipeline stages.' });
    }
  });
}

defineExpose({ loadPipelineStages, confirmResetPipeline });
</script>

<style lang="scss" scoped>
.settings-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A2E;
  letter-spacing: 0.01em;
}

.primary-text {
  color: #1A1A2E;
}

.secondary-text {
  color: #6B7280;
}

.pipeline-list {
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.pipeline-order-col {
  min-width: 30px;
}

.pipeline-item {
  min-height: 48px;
}
</style>
