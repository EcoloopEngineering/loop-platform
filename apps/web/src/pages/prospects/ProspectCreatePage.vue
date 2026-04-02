<template>
  <q-page class="wizard-page">
    <q-form ref="formRef" class="wizard-content q-pa-md" greedy>
      <div class="wizard-section-title q-mb-lg">New Lead</div>

      <!-- Lead Source (always first) -->
      <div class="text-subtitle2 text-weight-medium q-mb-sm">Source *</div>
      <div class="row q-gutter-sm q-mb-lg">
        <q-btn
          dense
          no-caps
          rounded
          :key="src.value"
          padding="6px 16px"
          v-for="src in leadSources"
          @click="onSourceSelect(src.value)"
          :outline="prospectData.source !== src.value"
          :color="prospectData.source === src.value ? 'teal' : 'grey-5'"
          :text-color="prospectData.source === src.value ? 'white' : 'grey-8'"
        >
          {{ src.label }}
        </q-btn>
      </div>

      <!-- Fields (shown after source is selected) -->
      <template v-if="prospectData.source">
        <!-- Door Knock: address from geolocation first -->
        <div v-if="isDoorKnock" class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium q-mb-sm">Location</div>

          <!-- Geolocation error banner -->
          <q-banner v-if="geo.error.value" dense rounded class="bg-orange-1 text-orange-9 q-mb-sm">
            <template #avatar>
              <q-icon name="warning" color="orange" />
            </template>
            {{ geo.error.value }} Please enter the address manually.
          </q-banner>

          <!-- Street Address -->
          <e-input
            ref="streetRef"
            class="q-mb-sm"
            label="Street Address"
            :disable="geo.loading.value"
            :readonly="geo.loading.value"
            v-model="manualAddress.street"
            :placeholder="geo.loading.value ? 'Detecting location...' : '123 Main St'"
          >
            <template #prepend>
              <q-icon name="location_on" color="grey-6" />
            </template>
            <template #append>
              <q-spinner-dots v-if="geo.loading.value" size="18px" color="primary" />
              <q-icon v-else-if="manualAddress.street && !geo.error.value" name="check_circle" color="positive" />
              <q-btn v-else-if="!geo.loading.value && !geo.error.value" flat round dense icon="my_location" color="primary" @click="geo.fetchCurrentPosition" />
            </template>
          </e-input>
          <div class="row q-col-gutter-sm q-mb-sm">
            <div class="col-5">
              <e-input
                label="City"
                placeholder="City"
                v-model="manualAddress.city"
                :disable="geo.loading.value"
              />
            </div>
            <div class="col-3">
              <e-input
                mask="AA"
                label="State"
                placeholder="CA"
                v-model="manualAddress.state"
                :disable="geo.loading.value"
              />
            </div>
            <div class="col-4">
              <e-input
                label="ZIP"
                mask="#####"
                placeholder="90210"
                v-model="manualAddress.zip"
                :disable="geo.loading.value"
              />
            </div>
          </div>

          <!-- Tree Removal -->
          <e-tri-toggle
            label="Tree Removal"
            :model-value="treeRemoval"
            @update:model-value="treeRemoval = $event"
          />
        </div>

        <!-- Contact fields -->
        <e-input
          class="q-mb-sm"
          label="First Name"
          placeholder="Enter first name"
          v-model="prospectData.firstName"
        />

        <e-input
          class="q-mb-sm"
          label="Last Name"
          placeholder="Enter last name"
          v-model="prospectData.lastName"
        />

        <e-input
          label="Phone"
          unmasked-value
          class="q-mb-sm"
          :rules="[phoneRule]"
          mask="(###) ###-####"
          v-model="prospectData.phone"
          placeholder="(555) 123-4567"
        >
          <template #prepend>
            <q-icon name="phone" color="grey-6" />
          </template>
        </e-input>

        <e-input
          label="Email"
          type="email"
          class="q-mb-sm"
          :rules="[emailRule]"
          v-model="prospectData.email"
          placeholder="email@example.com"
        >
          <template #prepend>
            <q-icon name="email" color="grey-6" />
          </template>
        </e-input>

        <e-input
          class="q-mb-sm"
          label="Social Link"
          v-model="prospectData.socialLink"
          placeholder="https://instagram.com/..."
        >
          <template #prepend>
            <q-icon name="link" color="grey-6" />
          </template>
        </e-input>

        <e-input
          autogrow
          class="q-mb-md"
          type="textarea"
          label="Observations"
          v-model="prospectData.notes"
          placeholder="Any relevant notes..."
        />
      </template>
    </q-form>

    <!-- Warning -->
    <div v-if="showEmptyWarning" class="q-px-md q-mb-sm">
      <q-banner dense rounded class="bg-orange-1 text-orange-9">
        <template #avatar>
          <q-icon name="warning" color="orange" />
        </template>
        Please fill in at least one field: name, phone, email, or observations.
      </q-banner>
    </div>

    <!-- Footer -->
    <div class="wizard-footer">
      <e-btn
        size="lg"
        color="primary"
        class="full-width"
        :loading="submitting"
        :disable="!canSubmitPage"
        @click="handleSubmit"
      >
        <q-icon name="check" size="18px" class="q-mr-xs" />
        Continue
      </e-btn>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { LeadSource } from '@loop/shared';
import { reactive, ref, computed, watch, nextTick } from 'vue';
import EBtn from '@/components/common/EBtn.vue';
import EInput from '@/components/common/EInput.vue';
import ETriToggle from '@/components/common/ETriToggle.vue';
import { emailRule, phoneRule } from '@/utils/validators';
import { useProspectWizard } from '@/composables/useProspectWizard';

const {
  geo,
  canSubmit,
  submitting,
  isDoorKnock,
  prospectData,
  hasContactInfo,
  submitProspect,
} = useProspectWizard();

const treeRemoval = ref<boolean | null>(null);

const hasAddress = computed(() => !!manualAddress.street.trim());

const canSubmitPage = computed(() =>
  canSubmit.value || (prospectData.value.source !== null && hasAddress.value),
);

const formRef = ref<{ validate: () => Promise<boolean> } | null>(null);
const streetRef = ref<InstanceType<typeof EInput> | null>(null);
const showEmptyWarning = ref(false);

const manualAddress = reactive({
  zip: '',
  city: '',
  state: '',
  street: '',
});

watch(() => geo.error.value, async (err) => {
  if (err) {
    await nextTick();
    streetRef.value?.focus();
  }
});

watch(() => geo.parsedAddress.value, (addr) => {
  manualAddress.zip = addr.zip;
  manualAddress.city = addr.city;
  manualAddress.state = addr.state;
  manualAddress.street = addr.street;
});

const $q = useQuasar();
const router = useRouter();

const leadSources = [
  { value: LeadSource.DOOR_KNOCK, label: 'Door Knock' },
  { value: LeadSource.COLD_CALL, label: 'Cold Call' },
  { value: LeadSource.REFERRAL, label: 'Referral' },
  { value: LeadSource.EVENT, label: 'Event' },
];


function onSourceSelect(source: LeadSource) {
  prospectData.value.source = source;
  if (source === LeadSource.DOOR_KNOCK) {
    geo.fetchCurrentPosition();
  }
}

async function handleSubmit() {
  if (!hasContactInfo.value && !hasAddress.value) {
    showEmptyWarning.value = true;
    return;
  }
  const valid = await formRef.value?.validate();
  if (!valid) return;
  showEmptyWarning.value = false;
  try {
    const address = manualAddress.street ? {
      zip: manualAddress.zip,
      city: manualAddress.city,
      state: manualAddress.state,
      latitude: geo.lat.value ?? undefined,
      longitude: geo.lng.value ?? undefined,
      streetAddress: manualAddress.street,
    } : undefined;

    const prospect = await submitProspect(address);

    $q.dialog({
      ok: { label: 'Yes, continue', color: 'primary', unelevated: true },
      title: 'Contact saved!',
      cancel: { label: 'No, thanks', flat: true, color: 'grey' },
      message: 'Would you like to fill in the full lead details now?',
      persistent: true,
    }).onOk(
      () => {
      const query: Record<string, string> = { customerId: prospect.id };
      if (treeRemoval.value !== null) query.treeRemoval = String(treeRemoval.value);
      router.push({ path: '/leads/new/details', query });
    }).onCancel(() => {
      router.push(`/crm/customers/${prospect.id}`);
    });
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'Failed to save contact.' });
  }
}
</script>
