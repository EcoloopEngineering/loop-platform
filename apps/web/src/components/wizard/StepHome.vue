<template>
  <div class="step-home q-pa-md">
    <div class="text-subtitle1 text-weight-bold q-mb-md">Home Details</div>

    <!-- Property Type -->
    <div class="text-subtitle2 text-weight-medium q-mb-sm">Property Type</div>
    <q-option-group
      v-model="home.propertyType"
      :options="propertyTypes"
      color="teal"
      inline
      class="q-mb-md"
    />

    <!-- Address -->
    <e-input
      v-model="home.streetAddress"
      label="Address *"
      placeholder="123 Main Street"
      class="q-mb-sm"
      :rules="[(v: string) => !!v?.trim() || 'Address is required']"
    >
      <template #prepend>
        <q-icon name="location_on" color="grey-6" />
      </template>
    </e-input>

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-5">
        <e-input
          v-model="home.city"
          label="City"
          placeholder="City"
        />
      </div>
      <div class="col-3">
        <e-input
          v-model="home.state"
          label="State"
          placeholder="CA"
        />
      </div>
      <div class="col-4">
        <e-input
          v-model="home.zip"
          label="ZIP"
          placeholder="90210"
          mask="#####"
        />
      </div>
    </div>

    <!-- Roof Condition -->
    <div class="text-subtitle2 text-weight-medium q-mb-sm">Roof Condition</div>
    <div class="row q-gutter-sm q-mb-md">
      <q-btn
        v-for="rc in roofConditions"
        :key="rc.value"
        :outline="home.roofCondition !== rc.value"
        :color="home.roofCondition === rc.value ? 'teal' : 'grey-5'"
        :text-color="home.roofCondition === rc.value ? 'white' : 'grey-8'"
        no-caps
        rounded
        dense
        padding="6px 14px"
        @click="home.roofCondition = rc.value"
      >
        {{ rc.label }}
      </q-btn>
    </div>

    <!-- Electrical Service -->
    <q-select
      v-model="home.electricalService"
      :options="electricalOptions"
      label="Electrical Service"
      outlined
      dense
      class="q-mb-md e-input"
    />

    <!-- Toggles -->
    <div class="row q-col-gutter-md q-mb-sm">
      <div class="col-6">
        <q-toggle
          v-model="home.hasPool"
          label="Pool / Hot Tub"
          color="teal"
        />
      </div>
      <div class="col-6">
        <q-toggle
          v-model="home.hasEV"
          label="Electric Vehicle"
          color="teal"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RoofCondition, PropertyType } from '@loop/shared';
import EInput from '@/components/common/EInput.vue';
import type { HomeData } from '@/composables/useLeadWizard';

defineProps<{
  home: HomeData;
}>();

const propertyTypes = [
  { label: 'Residential', value: PropertyType.RESIDENTIAL },
  { label: 'Commercial', value: PropertyType.COMMERCIAL },
];

const roofConditions = [
  { value: RoofCondition.GOOD, label: 'Good <5 yrs' },
  { value: RoofCondition.FAIR, label: 'Fair 5-15 yrs' },
  { value: RoofCondition.POOR, label: 'Poor >15 yrs' },
  { value: RoofCondition.UNKNOWN, label: 'Unknown' },
];

const electricalOptions = ['100A', '200A', '400A'];
</script>

<style lang="scss" scoped>
.e-input {
  :deep(.q-field__control) {
    border-radius: 12px;
  }
}
</style>
