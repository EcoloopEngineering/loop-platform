<template>
  <q-page class="lead-create-page">
    <!-- Stepper -->
    <wizard-stepper v-model="currentStep" />

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
    <div class="wizard-footer q-pa-md">
      <div v-if="currentStep > 1" class="q-mb-sm">
        <q-btn
          flat
          no-caps
          color="grey-7"
          class="full-width"
          @click="prevStep"
        >
          <q-icon name="arrow_back" class="q-mr-xs" />
          Back to {{ STEP_NAMES[currentStep - 2] }}
        </q-btn>
      </div>

      <e-btn
        v-if="currentStep < 5"
        color="teal"
        class="full-width"
        :disable="!isStepValid(currentStep)"
        @click="nextStep"
      >
        Continue to {{ STEP_NAMES[currentStep] }}
        <q-icon name="arrow_forward" class="q-ml-xs" />
      </e-btn>

      <e-btn
        v-else
        color="teal"
        class="full-width"
        :loading="submitting"
        :disable="!canSubmit"
        @click="submitLead"
      >
        <q-icon name="check" class="q-mr-xs" />
        Submit Lead
      </e-btn>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import EHeader from '@/components/common/EHeader.vue';
import EBtn from '@/components/common/EBtn.vue';
import WizardStepper from '@/components/wizard/WizardStepper.vue';
import StepContact from '@/components/wizard/StepContact.vue';
import StepHome from '@/components/wizard/StepHome.vue';
import StepEnergy from '@/components/wizard/StepEnergy.vue';
import StepDesign from '@/components/wizard/StepDesign.vue';
import StepReview from '@/components/wizard/StepReview.vue';
import { useLeadWizard } from '@/composables/useLeadWizard';

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
</script>

<style lang="scss" scoped>
.lead-create-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #F8FAFB;
}

.step-content {
  flex: 1;
  overflow-y: auto;
}

.wizard-footer {
  background: #FFFFFF;
  border-top: 1px solid #E5E7EB;
  position: sticky;
  bottom: 0;
}
</style>
