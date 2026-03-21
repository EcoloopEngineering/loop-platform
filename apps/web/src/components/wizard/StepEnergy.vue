<template>
  <div class="step-energy q-pa-md">
    <div class="text-subtitle1 text-weight-bold q-mb-md">Energy Information</div>

    <!-- Utility bill upload -->
    <div class="text-subtitle2 text-weight-medium q-mb-sm">Utility Bills</div>
    <q-file
      v-model="energy.billFiles"
      label="Upload utility bills"
      outlined
      dense
      multiple
      use-chips
      accept=".pdf,.jpg,.jpeg,.png,.webp"
      class="q-mb-md e-input"
      counter
    >
      <template #prepend>
        <q-icon name="cloud_upload" color="teal" />
      </template>
      <template #hint>
        Accepted: PDF, JPG, PNG
      </template>
    </q-file>

    <!-- Monthly Bill -->
    <e-input
      v-model.number="energy.monthlyBill"
      label="Monthly Bill Amount *"
      placeholder="0.00"
      type="number"
      prefix="$"
      class="q-mb-sm"
      :rules="[(v: number) => (v !== null && v > 0) || 'Monthly bill is required']"
    >
      <template #prepend>
        <q-icon name="attach_money" color="grey-6" />
      </template>
    </e-input>

    <!-- Annual Usage -->
    <e-input
      v-model.number="energy.annualKwhUsage"
      label="Annual kWh Usage"
      placeholder="12000"
      type="number"
      class="q-mb-sm"
    >
      <template #append>
        <span class="text-caption text-grey-6">kWh</span>
      </template>
    </e-input>

    <!-- Utility Provider -->
    <e-input
      v-model="energy.utilityProvider"
      label="Utility Provider"
      placeholder="e.g. PG&E, SoCal Edison"
      class="q-mb-sm"
    >
      <template #prepend>
        <q-icon name="business" color="grey-6" />
      </template>
    </e-input>
  </div>
</template>

<script setup lang="ts">
import EInput from '@/components/common/EInput.vue';
import type { EnergyData } from '@/composables/useLeadWizard';

defineProps<{
  energy: EnergyData;
}>();
</script>

<style lang="scss" scoped>
.e-input {
  :deep(.q-field__control) {
    border-radius: 12px;
  }
}
</style>
