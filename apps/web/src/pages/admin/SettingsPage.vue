<template>
  <q-page class="settings-page q-pa-md">
    <h5 class="q-my-none text-weight-bold q-mb-lg page-title">Settings</h5>

    <q-tabs
      v-model="activeTab"
      dense
      no-caps
      active-color="primary"
      indicator-color="primary"
      class="q-mb-lg settings-tabs"
      align="left"
    >
      <q-tab name="company" label="Company" icon="business" />
      <q-tab name="pipeline" label="Pipeline" icon="account_tree" />
      <q-tab name="integrations" label="Integrations" icon="extension" />
      <q-tab name="commission" label="Commission" icon="payments" />
      <q-tab name="preferences" label="Preferences" icon="tune" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated keep-alive>
      <q-tab-panel name="company" class="q-pa-none">
        <SettingsCompanyTab ref="companyTab" />
      </q-tab-panel>

      <q-tab-panel name="pipeline" class="q-pa-none">
        <SettingsPipelineTab ref="pipelineTab" />
      </q-tab-panel>

      <q-tab-panel name="integrations" class="q-pa-none">
        <SettingsIntegrationsTab />
      </q-tab-panel>

      <q-tab-panel name="commission" class="q-pa-none">
        <SettingsCommissionTab ref="commissionTab" />
      </q-tab-panel>

      <q-tab-panel name="preferences" class="q-pa-none">
        <SettingsPreferencesTab
          ref="preferencesTab"
          @reset-pipeline="pipelineTab?.confirmResetPipeline()"
        />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/boot/axios';
import SettingsCompanyTab from '@/components/settings/SettingsCompanyTab.vue';
import SettingsPipelineTab from '@/components/settings/SettingsPipelineTab.vue';
import SettingsIntegrationsTab from '@/components/settings/SettingsIntegrationsTab.vue';
import SettingsCommissionTab from '@/components/settings/SettingsCommissionTab.vue';
import SettingsPreferencesTab from '@/components/settings/SettingsPreferencesTab.vue';

const activeTab = ref('company');

const companyTab = ref<InstanceType<typeof SettingsCompanyTab>>();
const pipelineTab = ref<InstanceType<typeof SettingsPipelineTab>>();
const commissionTab = ref<InstanceType<typeof SettingsCommissionTab>>();
const preferencesTab = ref<InstanceType<typeof SettingsPreferencesTab>>();

onMounted(async () => {
  pipelineTab.value?.loadPipelineStages();

  try {
    const { data } = await api.get('/settings');
    companyTab.value?.loadData(data);
    commissionTab.value?.loadData(data);
    preferencesTab.value?.loadData(data);
  } catch {
    // Use defaults
  }
});
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  max-width: 100%;

  .settings-tabs {
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    overflow: hidden;
  }
}

:global(.body--dark) .settings-tabs {
  border-color: #333;
}
</style>
