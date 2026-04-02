<template>
  <q-page class="wizard-page">
    <!-- Stepper -->
    <wizard-stepper :model-value="currentStep" :progress="stepProgress" @update:model-value="onStepClick" />

    <!-- Step Content -->
    <div class="wizard-content">
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
        @click="done"
      >
        <q-icon name="check" size="18px" class="q-mr-xs" />
        Done
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
import { useRouter } from 'vue-router';
import { useLeadWizard } from '@/composables/useLeadWizard';

const router = useRouter();

const {
  leadId,
  nextStep,
  prevStep,
  homeData,
  roofScore,
  energyData,
  designData,
  contactData,
  currentStep,
  stepProgress,
  scorePreview,
  scoreTier,
  energyScore,
  contactScore,
  propertyScore,
  STEP_NAMES,
} = useLeadWizard();

function done() {
  if (leadId.value) {
    router.push(`/crm/leads/${leadId.value}`);
  } else {
    router.push('/home');
  }
}

function onStepClick(step: number) {
  currentStep.value = step;
}
</script>

<style lang="scss" scoped>
// Layout classes from design-tokens.scss: .wizard-page, .wizard-content, .wizard-footer
</style>
