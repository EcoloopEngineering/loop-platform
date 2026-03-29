<template>
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '@/boot/axios';

const integrations = ref<{ name: string; description: string; icon: string; connected: boolean }[]>([]);
const loadingIntegrations = ref(true);
let integrationInterval: ReturnType<typeof setInterval>;

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

onMounted(() => {
  loadIntegrations();
  integrationInterval = setInterval(loadIntegrations, 10 * 60 * 1000);
});

onUnmounted(() => {
  clearInterval(integrationInterval);
});
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
</style>
