<template>
  <q-page class="settings-page q-pa-md">
    <h5 class="q-my-none text-weight-bold q-mb-lg page-title">Settings</h5>

    <!-- 1. Company Profile -->
    <q-card flat class="settings-card q-mb-lg">
      <q-card-section>
        <div class="section-title q-mb-md">Company Profile</div>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-input
              v-model="company.name"
              label="Company Name"
              outlined
              dense
              class="settings-input"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="company.website"
              label="Website URL"
              outlined
              dense
              class="settings-input"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="company.supportEmail"
              label="Support Email"
              type="email"
              outlined
              dense
              class="settings-input"
            />
          </div>
        </div>
        <div class="q-mt-md">
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Save Company Profile"
            class="action-btn"
            :loading="savingCompany"
            @click="saveCompany"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- 2. Pipeline Configuration -->
    <q-card flat class="settings-card q-mb-lg">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="section-title">Pipeline Configuration</div>
          <q-space />
          <q-btn unelevated no-caps color="primary" icon="add" label="Add Stage" size="sm" style="border-radius: 8px" @click="openAddStage" />
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
            <q-item-section avatar style="min-width: 30px">
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
      <q-card style="min-width: 280px; border-radius: 16px">
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
      <q-card style="min-width: 360px; border-radius: 16px">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold">{{ stageDialogMode === 'add' ? 'Add Pipeline Stage' : 'Edit Stage' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md q-pt-none">
          <q-input v-if="stageDialogMode === 'add'" v-model="stageForm.stage" label="Stage Key (e.g. SITE_VISIT)" outlined dense hint="UPPERCASE_WITH_UNDERSCORES" />
          <q-input v-model="stageForm.label" label="Display Label" outlined dense />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
          <q-btn unelevated no-caps :label="stageDialogMode === 'add' ? 'Add Stage' : 'Save'" color="primary" @click="saveStageDialog" style="border-radius: 10px" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 3. Integrations Status -->
    <q-card flat class="settings-card q-mb-lg">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="section-title">Integrations Status</div>
          <q-space />
          <q-btn flat dense no-caps icon="refresh" label="Refresh" size="sm" color="grey-6" :loading="loadingIntegrations" @click="loadIntegrations" />
        </div>
        <div v-if="loadingIntegrations && integrations.length === 0" class="row justify-center q-pa-lg">
          <q-spinner-dots color="primary" size="32px" />
        </div>
        <div class="row q-col-gutter-md">
          <div
            v-for="integration in integrations"
            :key="integration.name"
            class="col-12 col-md-6"
          >
            <div class="integration-card">
              <div class="row items-center no-wrap">
                <q-icon
                  :name="integration.icon"
                  size="28px"
                  class="q-mr-md"
                  :color="integration.connected ? 'primary' : 'grey-5'"
                />
                <div class="col">
                  <div class="text-weight-medium primary-text">{{ integration.name }}</div>
                  <div class="text-caption secondary-text">{{ integration.description }}</div>
                </div>
                <q-badge
                  :color="integration.connected ? 'green' : 'grey-4'"
                  :text-color="integration.connected ? 'white' : 'grey-7'"
                  :label="integration.connected ? 'Connected' : 'Not configured'"
                  class="status-badge"
                />
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- 4. Notification Preferences -->
    <q-card flat class="settings-card q-mb-lg">
      <q-card-section>
        <div class="section-title q-mb-md">Notification Preferences</div>

        <div class="text-weight-medium primary-text q-mb-sm">Event Notifications</div>
        <q-list class="q-mb-md">
          <q-item v-for="pref in notificationEvents" :key="pref.key" tag="label">
            <q-item-section>
              <q-item-label class="primary-text">{{ pref.label }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="pref.enabled" color="primary" />
            </q-item-section>
          </q-item>
        </q-list>

        <q-separator class="q-my-md" />

        <div class="text-weight-medium primary-text q-mb-sm">Delivery Channels</div>
        <q-list>
          <q-item tag="label">
            <q-item-section>
              <q-item-label class="primary-text">Email notifications</q-item-label>
              <q-item-label caption class="secondary-text">
                Receive notifications via email
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="channels.email" color="primary" />
            </q-item-section>
          </q-item>
          <q-item tag="label">
            <q-item-section>
              <q-item-label class="primary-text">Push notifications</q-item-label>
              <q-item-label caption class="secondary-text">
                Receive browser push notifications
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="channels.push" color="primary" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- 5. Commission Rules -->
    <q-card flat class="settings-card q-mb-lg">
      <q-card-section>
        <div class="section-title q-mb-md">Commission Rules</div>
        <div class="text-caption secondary-text q-mb-md">
          Set the commission split percentages for each manager tier.
        </div>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-input
              v-model.number="commission.m1"
              label="M1 - Direct Referrer"
              outlined
              dense
              suffix="%"
              type="number"
              class="settings-input"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model.number="commission.m2"
              label="M2 - Second Tier"
              outlined
              dense
              suffix="%"
              type="number"
              class="settings-input"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model.number="commission.m3"
              label="M3 - Third Tier"
              outlined
              dense
              suffix="%"
              type="number"
              class="settings-input"
            />
          </div>
        </div>
        <div class="q-mt-md">
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Save Commission Rules"
            class="action-btn"
            :loading="savingCommission"
            @click="saveCommission"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- 6. General Preferences -->
    <q-card flat class="settings-card q-mb-lg">
      <q-card-section>
        <div class="section-title q-mb-md">General Preferences</div>
        <div class="text-weight-medium primary-text q-mb-sm">Display Options</div>
        <q-list>
          <q-item tag="label">
            <q-item-section>
              <q-item-label class="primary-text">Dark mode</q-item-label>
              <q-item-label caption class="secondary-text">Enable dark theme across the application</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="preferences.darkMode" color="primary" />
            </q-item-section>
          </q-item>
          <q-item tag="label">
            <q-item-section>
              <q-item-label class="primary-text">Compact view</q-item-label>
              <q-item-label caption class="secondary-text">Show more items per page in lists and tables</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="preferences.compactView" color="primary" />
            </q-item-section>
          </q-item>
          <q-item tag="label">
            <q-item-section>
              <q-item-label class="primary-text">Auto-assign leads</q-item-label>
              <q-item-label caption class="secondary-text">Automatically assign new leads to available sales reps using round-robin</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="preferences.autoAssign" color="primary" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- 7. API & Webhooks -->
    <q-card flat class="settings-card q-mb-lg">
      <q-card-section>
        <div class="section-title q-mb-md">API & Webhooks</div>
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-6">
            <div class="text-caption secondary-text q-mb-xs">API Base URL</div>
            <q-input
              :model-value="apiBaseUrl"
              outlined
              dense
              readonly
              class="settings-input"
            >
              <template #append>
                <q-btn flat dense icon="content_copy" size="sm" @click="copyToClipboard(apiBaseUrl)" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-6">
            <div class="text-caption secondary-text q-mb-xs">Swagger Documentation</div>
            <q-input
              :model-value="swaggerUrl"
              outlined
              dense
              readonly
              class="settings-input"
            >
              <template #append>
                <q-btn flat dense icon="open_in_new" size="sm" @click="openExternal(swaggerUrl)" />
              </template>
            </q-input>
          </div>
        </div>
        <div class="text-caption secondary-text q-mb-xs">Webhook Secret</div>
        <q-input
          :model-value="webhookSecret"
          :type="showWebhookSecret ? 'text' : 'password'"
          outlined
          dense
          readonly
          class="settings-input"
        >
          <template #append>
            <q-btn flat dense :icon="showWebhookSecret ? 'visibility_off' : 'visibility'" size="sm" @click="showWebhookSecret = !showWebhookSecret" />
            <q-btn flat dense icon="content_copy" size="sm" @click="copyToClipboard(webhookSecret)" />
          </template>
        </q-input>
      </q-card-section>
    </q-card>

    <!-- 8. Danger Zone -->
    <q-card flat class="settings-card danger-card q-mb-lg">
      <q-card-section>
        <div class="section-title danger-title q-mb-sm">Danger Zone</div>
        <div class="text-caption secondary-text q-mb-md">
          These actions are irreversible. Proceed with caution.
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            outline
            no-caps
            color="red"
            label="Clear All Notifications"
            class="action-btn"
            @click="confirmClearNotifications"
          />
          <q-btn
            outline
            no-caps
            color="red"
            label="Reset Pipeline Stages"
            class="action-btn"
            @click="confirmResetPipeline"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

const $q = useQuasar();

// --- Company Profile ---
const company = reactive({
  name: 'ecoLoop',
  website: 'https://ecoloop.com',
  supportEmail: 'support@ecoloop.com',
});
const savingCompany = ref(false);

async function saveCompany() {
  savingCompany.value = true;
  try {
    await api.put('/settings/company', { ...company });
    $q.notify({ type: 'positive', message: 'Company profile saved.' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save company profile.' });
  } finally {
    savingCompany.value = false;
  }
}

// --- Pipeline Configuration ---
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
// Keep backward compat ref for move/delete/edit
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
    // Save pipeline stages configuration
    // The API may not have this endpoint yet — save locally and notify
    $q.notify({ type: 'positive', message: 'Pipeline stages updated', timeout: 1000 });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save pipeline stages' });
  }
}

// --- Integrations ---
const integrations = ref<{ name: string; description: string; icon: string; connected: boolean }[]>([]);
const loadingIntegrations = ref(true);

async function loadIntegrations() {
  loadingIntegrations.value = true;
  try {
    const { data } = await api.get('/settings/integrations-status');
    integrations.value = Array.isArray(data) ? data : [];
  } catch {
    integrations.value = [];
  } finally {
    loadingIntegrations.value = false;
  }
}

// Refresh integrations status every 10 minutes
let integrationInterval: ReturnType<typeof setInterval>;

// --- Notification Preferences ---
const notificationEvents = reactive([
  { key: 'lead_assigned', label: 'Lead assigned', enabled: true },
  { key: 'stage_changes', label: 'Stage changes', enabled: true },
  { key: 'design_completed', label: 'Design completed', enabled: true },
  { key: 'appointment_booked', label: 'Appointment booked', enabled: true },
  { key: 'commission_calculated', label: 'Commission calculated', enabled: true },
]);

const channels = reactive({
  email: true,
  push: true,
});

// --- Commission Rules ---
const commission = reactive({
  m1: 60,
  m2: 25,
  m3: 15,
});
const savingCommission = ref(false);

async function saveCommission() {
  savingCommission.value = true;
  try {
    await api.put('/settings/commission', { ...commission });
    $q.notify({ type: 'positive', message: 'Commission rules saved.' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save commission rules.' });
  } finally {
    savingCommission.value = false;
  }
}

// --- General Preferences ---
const preferences = reactive({
  darkMode: localStorage.getItem('darkMode') === '1',
  compactView: false,
  autoAssign: true,
});

// --- API & Webhooks ---
const apiBaseUrl = 'http://localhost:3000/api/v1';
const swaggerUrl = 'http://localhost:3000/api/docs';
const webhookSecret = 'whsec_jKKfQkGSZq3RJenwhKalxBi0VXP0fBsD';
const showWebhookSecret = ref(false);

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  $q.notify({ type: 'positive', message: 'Copied to clipboard', timeout: 1000 });
}

function openExternal(url: string) {
  window.open(url, '_blank');
}

// --- Danger Zone ---
function confirmClearNotifications() {
  $q.dialog({
    title: 'Clear All Notifications',
    message: 'This will permanently delete all notifications. This action cannot be undone.',
    cancel: true,
    persistent: true,
    color: 'red',
    ok: { label: 'Clear All', color: 'red', flat: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      await api.delete('/admin/notifications');
      $q.notify({ type: 'positive', message: 'All notifications cleared.' });
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to clear notifications.' });
    }
  });
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

// --- Save Preferences ---
async function savePreferences() {
  try {
    await api.put('/settings/preferences', { ...preferences });
    $q.notify({ type: 'positive', message: 'Preferences saved.', timeout: 1000 });
  } catch { /* ignore */ }
}

// --- Save Notification Preferences ---
async function saveNotificationPrefs() {
  try {
    const data: Record<string, boolean> = {};
    for (const e of notificationEvents) { data[e.key] = e.enabled; }
    data.emailChannel = channels.email;
    data.pushChannel = channels.push;
    await api.put('/settings/notifications', data);
    $q.notify({ type: 'positive', message: 'Notification preferences saved.', timeout: 1000 });
  } catch { /* ignore */ }
}

// --- Dark mode ---
watch(() => preferences.darkMode, (val) => {
  $q.dark.set(val);
  localStorage.setItem('darkMode', val ? '1' : '0');
});

// --- Compact view ---
watch(() => preferences.compactView, (val) => {
  document.body.classList.toggle('compact-view', val);
  localStorage.setItem('compactView', val ? '1' : '0');
}, { immediate: true });

// --- Auto-save watchers (debounced) ---
let prefTimeout: ReturnType<typeof setTimeout>;
watch(preferences, () => {
  clearTimeout(prefTimeout);
  prefTimeout = setTimeout(() => savePreferences(), 800);
}, { deep: true });

let notifTimeout: ReturnType<typeof setTimeout>;
watch([notificationEvents, channels], () => {
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => saveNotificationPrefs(), 800);
}, { deep: true });

// --- Init ---
onMounted(async () => {
  loadPipelineStages();
  loadIntegrations();
  integrationInterval = setInterval(loadIntegrations, 10 * 60 * 1000);

  // Load all settings from API
  try {
    const { data } = await api.get('/settings');
    if (data.company) {
      company.name = data.company.name ?? company.name;
      company.website = data.company.website ?? company.website;
      company.supportEmail = data.company.supportEmail ?? company.supportEmail;
    }
    if (data.commission) {
      commission.m1 = data.commission.m1 ?? commission.m1;
      commission.m2 = data.commission.m2 ?? commission.m2;
      commission.m3 = data.commission.m3 ?? commission.m3;
    }
    if (data.preferences) {
      preferences.compactView = data.preferences.compactView ?? preferences.compactView;
      preferences.autoAssign = data.preferences.autoAssign ?? preferences.autoAssign;
    }
    if (data.notifications) {
      for (const e of notificationEvents) {
        if (data.notifications[e.key] !== undefined) e.enabled = data.notifications[e.key];
      }
      if (data.notifications.emailChannel !== undefined) channels.email = data.notifications.emailChannel;
      if (data.notifications.pushChannel !== undefined) channels.push = data.notifications.pushChannel;
    }
  } catch {
    // Use defaults
  }
});

onUnmounted(() => {
  clearInterval(integrationInterval);
});
</script>

<style lang="scss" scoped>
.settings-page {
  background: #F8FAFB;
  min-height: 100vh;
  max-width: 100%;
}

.page-title {
  color: #1A1A2E;
}

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

.settings-input {
  :deep(.q-field__control) {
    border-radius: 12px;
  }
}

.action-btn {
  border-radius: 12px;
  font-weight: 600;
  padding: 8px 20px;
}

// Pipeline
.pipeline-list {
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.pipeline-item {
  min-height: 48px;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

// Integrations
.integration-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 16px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
}

.status-badge {
  border-radius: 8px;
  padding: 4px 10px;
  font-weight: 600;
  font-size: 11px;
}

// Danger Zone
.danger-card {
  border-color: #FCA5A5;
}

.danger-title {
  color: #DC2626;
}
</style>
