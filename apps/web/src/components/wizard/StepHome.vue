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

    <!-- Address Autocomplete -->
    <div class="address-autocomplete q-mb-sm">
      <q-input
        v-model="addressQuery"
        label="Address *"
        placeholder="Start typing an address..."
        outlined
        dense
        debounce="300"
        class="e-input"
        @update:model-value="onAddressInput"
        @focus="showSuggestions = true"
      >
        <template #prepend>
          <q-icon name="location_on" color="grey-6" />
        </template>
        <template #append>
          <q-spinner-dots v-if="geo.searching.value" size="18px" color="primary" />
          <q-icon v-else-if="addressSelected" name="check_circle" color="positive" />
        </template>
      </q-input>

      <q-list v-if="showSuggestions && geo.suggestions.value.length > 0" class="suggestions-list" bordered>
        <q-item
          v-for="suggestion in geo.suggestions.value"
          :key="suggestion.full"
          clickable
          v-ripple
          @click="selectAddress(suggestion)"
          class="suggestion-item"
        >
          <q-item-section avatar>
            <q-icon name="place" color="primary" size="20px" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ suggestion.street }}</q-item-label>
            <q-item-label caption>{{ suggestion.city }}, {{ suggestion.state }} {{ suggestion.zip }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-5">
        <e-input
          v-model="home.city"
          label="City"
          placeholder="City"
        />
      </div>
      <div class="col-3">
        <q-select
          v-model="home.state"
          :options="usStates"
          label="State"
          outlined
          dense
          emit-value
          map-options
          class="e-input"
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

    <!-- Tree Removal -->
    <e-tri-toggle
      label="Tree Removal"
      class="q-mb-md"
      :model-value="home.treeRemoval"
      @update:model-value="home.treeRemoval = $event"
    />

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
        <e-tri-toggle
          label="Pool / Hot Tub"
          :model-value="home.hasPool"
          @update:model-value="home.hasPool = $event"
        />
      </div>
      <div class="col-6">
        <e-tri-toggle
          label="Electric Vehicle"
          :model-value="home.hasEV"
          @update:model-value="home.hasEV = $event"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RoofCondition, PropertyType } from '@loop/shared';
import EInput from '@/components/common/EInput.vue';
import ETriToggle from '@/components/common/ETriToggle.vue';
import { useGeolocation, type ParsedAddress } from '@/composables/useGeolocation';
import type { HomeData } from '@/composables/useLeadWizard';

const geo = useGeolocation();

const props = defineProps<{
  home: HomeData;
}>();

const addressQuery = ref(props.home.streetAddress || '');
const showSuggestions = ref(false);
const addressSelected = ref(!!props.home.streetAddress);

function onAddressInput(query: string | number | null) {
  if (typeof query !== 'string') return;
  addressSelected.value = false;
  geo.searchAddress(query);
  showSuggestions.value = true;
}

function selectAddress(suggestion: ParsedAddress) {
  props.home.streetAddress = suggestion.street;
  props.home.city = suggestion.city;
  props.home.state = suggestion.state;
  props.home.zip = suggestion.zip;
  addressQuery.value = suggestion.street;
  addressSelected.value = true;
  showSuggestions.value = false;
  geo.clearSuggestions();
}

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

const usStates = [
  { label: 'AL', value: 'AL' }, { label: 'AK', value: 'AK' }, { label: 'AZ', value: 'AZ' },
  { label: 'AR', value: 'AR' }, { label: 'CA', value: 'CA' }, { label: 'CO', value: 'CO' },
  { label: 'CT', value: 'CT' }, { label: 'DE', value: 'DE' }, { label: 'FL', value: 'FL' },
  { label: 'GA', value: 'GA' }, { label: 'HI', value: 'HI' }, { label: 'ID', value: 'ID' },
  { label: 'IL', value: 'IL' }, { label: 'IN', value: 'IN' }, { label: 'IA', value: 'IA' },
  { label: 'KS', value: 'KS' }, { label: 'KY', value: 'KY' }, { label: 'LA', value: 'LA' },
  { label: 'ME', value: 'ME' }, { label: 'MD', value: 'MD' }, { label: 'MA', value: 'MA' },
  { label: 'MI', value: 'MI' }, { label: 'MN', value: 'MN' }, { label: 'MS', value: 'MS' },
  { label: 'MO', value: 'MO' }, { label: 'MT', value: 'MT' }, { label: 'NE', value: 'NE' },
  { label: 'NV', value: 'NV' }, { label: 'NH', value: 'NH' }, { label: 'NJ', value: 'NJ' },
  { label: 'NM', value: 'NM' }, { label: 'NY', value: 'NY' }, { label: 'NC', value: 'NC' },
  { label: 'ND', value: 'ND' }, { label: 'OH', value: 'OH' }, { label: 'OK', value: 'OK' },
  { label: 'OR', value: 'OR' }, { label: 'PA', value: 'PA' }, { label: 'RI', value: 'RI' },
  { label: 'SC', value: 'SC' }, { label: 'SD', value: 'SD' }, { label: 'TN', value: 'TN' },
  { label: 'TX', value: 'TX' }, { label: 'UT', value: 'UT' }, { label: 'VT', value: 'VT' },
  { label: 'VA', value: 'VA' }, { label: 'WA', value: 'WA' }, { label: 'WV', value: 'WV' },
  { label: 'WI', value: 'WI' }, { label: 'WY', value: 'WY' }, { label: 'DC', value: 'DC' },
  { label: 'PR', value: 'PR' },
];
</script>

<style lang="scss" scoped>
.e-input {
  :deep(.q-field__control) {
    border-radius: 12px;
  }
}

.address-autocomplete {
  position: relative;
}

.suggestions-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  max-height: 240px;
  overflow-y: auto;
}

.suggestion-item {
  min-height: 44px;
  padding: 6px 12px;
  transition: background 0.1s;

  &:hover {
    background: #F0FDFA;
  }
}
</style>
