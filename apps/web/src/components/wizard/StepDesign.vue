<template>
  <div class="step-design q-pa-md">
    <div class="text-subtitle1 text-weight-bold q-mb-xs">Choose Design Type</div>
    <p class="text-body2 text-grey-7 q-mb-md">
      Select how the solar design should be generated for this project.
    </p>

    <div class="row q-col-gutter-md q-mb-lg">
      <!-- AI Design Card -->
      <div class="col-12 col-sm-6">
        <q-card
          flat
          bordered
          class="design-card cursor-pointer"
          :class="{ 'selected-card': design.designType === DesignType.AI_DESIGN }"
          @click="design.designType = DesignType.AI_DESIGN"
        >
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <q-icon name="flash_on" size="28px" color="teal" class="q-mr-sm" />
              <span class="text-subtitle1 text-weight-bold">AI Design</span>
              <q-space />
              <q-badge color="green" label="INSTANT" class="text-weight-bold" />
            </div>
            <p class="text-body2 text-grey-7 q-mb-sm">
              Best for standard rooftops. Aurora generates the design automatically.
            </p>
            <q-list dense class="text-body2">
              <q-item v-for="item in aiPoints" :key="item" class="q-px-none design-list-item">
                <q-item-section avatar class="design-list-avatar">
                  <q-icon name="check_circle" color="teal" size="18px" />
                </q-item-section>
                <q-item-section>{{ item }}</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Manual Design Card -->
      <div class="col-12 col-sm-6">
        <q-card
          flat
          bordered
          class="design-card cursor-pointer"
          :class="{ 'selected-card': design.designType === DesignType.MANUAL_DESIGN }"
          @click="design.designType = DesignType.MANUAL_DESIGN"
        >
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <q-icon name="build" size="28px" color="orange" class="q-mr-sm" />
              <span class="text-subtitle1 text-weight-bold">Manual Design</span>
              <q-space />
              <q-badge color="orange" label="~20 MIN" class="text-weight-bold" />
            </div>
            <p class="text-body2 text-grey-7 q-mb-sm">
              Required for complex projects. The design team will review and build manually in Aurora.
            </p>
            <q-list dense class="text-body2">
              <q-item v-for="item in manualPoints" :key="item" class="q-px-none design-list-item">
                <q-item-section avatar class="design-list-avatar">
                  <q-icon name="check_circle" color="orange" size="18px" />
                </q-item-section>
                <q-item-section>{{ item }}</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Design Notes -->
    <div class="text-subtitle2 text-weight-medium q-mb-sm">Design Notes (optional)</div>
    <q-input
      v-model="design.notes"
      type="textarea"
      outlined
      dense
      placeholder="Any special instructions for the design team..."
      rows="3"
      class="e-input"
    />
  </div>
</template>

<script setup lang="ts">
import { DesignType } from '@loop/shared';
import type { DesignData } from '@/composables/useLeadWizard';

defineProps<{
  design: DesignData;
}>();

const aiPoints = [
  'No tree removal needed',
  'Simple roof layout',
  'Ready instantly',
];

const manualPoints = [
  'Tree removal needed',
  'Complex roof layout',
  'Ground mount',
];
</script>

<style lang="scss" scoped>
.design-card {
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.08);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: rgba(0, 137, 123, 0.3);
  }

  &.selected-card {
    border-color: #00897b;
    box-shadow: 0 0 0 1px #00897b;
  }
}

.design-list-item {
  min-height: 28px;
}

.design-list-avatar {
  min-width: 28px;
}

.e-input {
  :deep(.q-field__control) {
    border-radius: 12px;
  }
}
</style>
