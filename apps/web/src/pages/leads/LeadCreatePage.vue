<template>
  <q-page class="lead-create-page">
    <!-- Stepper -->
    <wizard-stepper :model-value="currentStep" @update:model-value="onStepClick" />

    <!-- Step Content -->
    <div class="step-content">
      <step-contact v-if="currentStep === 1" :contact="contactData" />
      <step-home v-if="currentStep === 2" :home="homeData" />
      <step-energy v-if="currentStep === 3" :energy="energyData" />
      <step-design v-if="currentStep === 4" :design="designData" />
      <step-review
        v-if="currentStep === 5"
        :contact="contactData"
        :home="homeData"
        :energy="energyData"
        :design="designData"
        :score-preview="scorePreview"
        :score-tier="scoreTier"
        :roof-score="roofScore"
        :energy-score="energyScore"
        :contact-score="contactScore"
        :property-score="propertyScore"
      />
    </div>

    <!-- Footer -->
    <div class="wizard-footer">
      <q-btn
        v-if="currentStep > 1"
        flat
        no-caps
        color="grey-6"
        class="full-width q-mb-xs back-btn"
        @click="prevStep"
      >
        <q-icon name="arrow_back" size="16px" class="q-mr-xs" />
        Back to {{ STEP_NAMES[currentStep - 2] }}
      </q-btn>

      <e-btn
        v-if="currentStep < 5"
        color="primary"
        class="full-width"
        size="lg"
        :disable="!isStepValid(currentStep)"
        @click="nextStep"
      >
        Continue to {{ STEP_NAMES[currentStep] }}
        <q-icon name="arrow_forward" size="18px" class="q-ml-xs" />
      </e-btn>

      <e-btn
        v-else
        color="primary"
        class="full-width"
        size="lg"
        :loading="submitting"
        :disable="!canSubmit"
        @click="handleSubmit"
      >
        <q-icon name="check" size="18px" class="q-mr-xs" />
        Submit Lead
      </e-btn>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import EBtn from '@/components/common/EBtn.vue';
import WizardStepper from '@/components/wizard/WizardStepper.vue';
import StepContact from '@/components/wizard/StepContact.vue';
import StepHome from '@/components/wizard/StepHome.vue';
import StepEnergy from '@/components/wizard/StepEnergy.vue';
import StepDesign from '@/components/wizard/StepDesign.vue';
import StepReview from '@/components/wizard/StepReview.vue';
import { useLeadWizard } from '@/composables/useLeadWizard';
import { useQuasar } from 'quasar';

const {
  currentStep,
  submitting,
  contactData,
  homeData,
  energyData,
  designData,
  isStepValid,
  canSubmit,
  scorePreview,
  scoreTier,
  roofScore,
  energyScore,
  contactScore,
  propertyScore,
  nextStep,
  prevStep,
  submitLead,
  STEP_NAMES,
} = useLeadWizard();

const $q = useQuasar();

async function handleSubmit() {
  try {
    await submitLead();
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'Failed to create lead.' });
  }
}

function onStepClick(step: number) {
  if (step < currentStep.value) {
    currentStep.value = step;
  }
}
</script>

<style lang="scss" scoped>
.lead-create-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-top: 8px;
}

.step-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
  width: 100%;
}

.wizard-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  position: sticky;
  bottom: 0;
  padding: 12px 16px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  width: 100%;

  .back-btn {
    font-size: 13px;
    border-radius: 8px;
    min-height: 36px;
  }
}
</style>
