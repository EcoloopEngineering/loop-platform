<template>
  <div class="step-contact q-pa-md">
    <div class="text-subtitle1 text-weight-bold q-mb-md">Contact Information</div>

    <e-input
      v-model="contact.firstName"
      label="First Name *"
      placeholder="Enter first name"
      class="q-mb-sm"
      :rules="[(v: string) => !!v?.trim() || 'First name is required']"
    />

    <e-input
      v-model="contact.lastName"
      label="Last Name *"
      placeholder="Enter last name"
      class="q-mb-sm"
      :rules="[(v: string) => !!v?.trim() || 'Last name is required']"
    />

    <e-input
      v-model="contact.phone"
      label="Phone *"
      placeholder="(555) 123-4567"
      mask="(###) ###-####"
      unmasked-value
      class="q-mb-sm"
      :rules="[(v: string) => (v?.replace(/\D/g, '').length ?? 0) >= 10 || 'Valid phone required']"
    >
      <template #prepend>
        <q-icon name="phone" color="grey-6" />
      </template>
    </e-input>

    <e-input
      v-model="contact.email"
      label="Email"
      placeholder="email@example.com"
      type="email"
      class="q-mb-lg"
    >
      <template #prepend>
        <q-icon name="email" color="grey-6" />
      </template>
    </e-input>

    <div class="text-subtitle2 text-weight-medium q-mb-sm">Lead Source</div>
    <div class="row q-gutter-sm">
      <q-btn
        v-for="src in leadSources"
        :key="src.value"
        :outline="contact.source !== src.value"
        :color="contact.source === src.value ? 'teal' : 'grey-5'"
        :text-color="contact.source === src.value ? 'white' : 'grey-8'"
        no-caps
        rounded
        dense
        padding="6px 16px"
        @click="contact.source = src.value"
      >
        {{ src.label }}
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LeadSource } from '@loop/shared';
import EInput from '@/components/common/EInput.vue';
import type { ContactData } from '@/composables/useLeadWizard';

defineProps<{
  contact: ContactData;
}>();

const leadSources = [
  { value: LeadSource.DOOR_KNOCK, label: 'Door Knock' },
  { value: LeadSource.COLD_CALL, label: 'Cold Call' },
  { value: LeadSource.REFERRAL, label: 'Referral' },
  { value: LeadSource.EVENT, label: 'Event' },
];
</script>
