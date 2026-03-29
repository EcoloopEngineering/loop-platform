<template>
  <!-- Notification Preferences -->
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

  <!-- General Preferences -->
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

  <!-- API & Webhooks -->
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

  <!-- Danger Zone -->
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
          @click="emit('resetPipeline')"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import { API_BASE, API_URL } from '@/config/api';

const emit = defineEmits<{
  (e: 'resetPipeline'): void;
}>();

const $q = useQuasar();

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

// --- General Preferences ---
const preferences = reactive({
  darkMode: localStorage.getItem('darkMode') === '1',
  compactView: false,
  autoAssign: true,
});

// --- API & Webhooks ---
const apiBaseUrl = API_BASE;
const swaggerUrl = `${API_URL}/api/docs`;
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

// --- Save Preferences ---
async function savePreferences() {
  try {
    await api.put('/settings/preferences', { ...preferences });
    $q.notify({ type: 'positive', message: 'Preferences saved.', timeout: 1000 });
  } catch { /* ignore */ }
}

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
  api.put('/users/me', { darkMode: val }).catch(() => {});
});

// --- Compact view ---
watch(() => preferences.compactView, (val) => {
  document.body.classList.toggle('compact-view', val);
  localStorage.setItem('compactView', val ? '1' : '0');
  api.put('/users/me', { compactView: val }).catch(() => {});
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

function loadData(data: any) {
  if (data?.preferences) {
    preferences.compactView = data.preferences.compactView ?? preferences.compactView;
    preferences.autoAssign = data.preferences.autoAssign ?? preferences.autoAssign;
  }
  if (data?.notifications) {
    for (const e of notificationEvents) {
      if (data.notifications[e.key] !== undefined) e.enabled = data.notifications[e.key];
    }
    if (data.notifications.emailChannel !== undefined) channels.email = data.notifications.emailChannel;
    if (data.notifications.pushChannel !== undefined) channels.push = data.notifications.pushChannel;
  }
}

defineExpose({ loadData });
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

.danger-card {
  border-color: #FCA5A5;
}

.danger-title {
  color: #DC2626;
}
</style>
