<template>
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
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

const $q = useQuasar();

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

interface CommissionPayload {
  commission?: { m1?: number; m2?: number; m3?: number };
}

function loadData(data: CommissionPayload) {
  if (data?.commission) {
    commission.m1 = data.commission.m1 ?? commission.m1;
    commission.m2 = data.commission.m2 ?? commission.m2;
    commission.m3 = data.commission.m3 ?? commission.m3;
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
</style>
