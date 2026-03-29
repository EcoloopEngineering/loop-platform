<template>
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
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

const $q = useQuasar();

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

interface CompanyPayload {
  company?: { name?: string; website?: string; supportEmail?: string };
}

function loadData(data: CompanyPayload) {
  if (data?.company) {
    company.name = data.company.name ?? company.name;
    company.website = data.company.website ?? company.website;
    company.supportEmail = data.company.supportEmail ?? company.supportEmail;
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
</style>
