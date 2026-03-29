<template>
  <div class="step-review q-pa-md">
    <!-- Score Card -->
    <q-card flat bordered class="score-card q-mb-md">
      <q-card-section>
        <lead-score-badge :score="scorePreview" :tier="scoreTier" />
      </q-card-section>
    </q-card>

    <!-- Score Breakdown -->
    <q-card flat bordered class="breakdown-card q-mb-md">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-sm">Score Breakdown</div>

        <div class="row items-center q-mb-sm">
          <span class="col-4 text-body2 text-grey-8">Roof Condition</span>
          <div class="col row items-center q-gutter-xs">
            <div
              v-for="n in 5"
              :key="'roof-' + n"
              class="score-dot"
              :class="{ 'score-dot--filled': n <= Math.ceil(roofScore / 20) }"
            />
            <span class="text-caption text-grey-6 q-ml-sm">{{ roofScore }}/100</span>
          </div>
        </div>

        <div class="row items-center q-mb-sm">
          <span class="col-4 text-body2 text-grey-8">Energy Usage</span>
          <div class="col row items-center q-gutter-xs">
            <div
              v-for="n in 5"
              :key="'energy-' + n"
              class="score-dot"
              :class="{ 'score-dot--filled': n <= Math.ceil(energyScore / 20) }"
            />
            <span class="text-caption text-grey-6 q-ml-sm">{{ energyScore }}/100</span>
          </div>
        </div>

        <div class="row items-center q-mb-sm">
          <span class="col-4 text-body2 text-grey-8">Contact</span>
          <div class="col row items-center q-gutter-xs">
            <div
              v-for="n in 5"
              :key="'contact-' + n"
              class="score-dot"
              :class="{ 'score-dot--filled': n <= Math.ceil(contactScore / 20) }"
            />
            <span class="text-caption text-grey-6 q-ml-sm">{{ contactScore }}/100</span>
          </div>
        </div>

        <div class="row items-center">
          <span class="col-4 text-body2 text-grey-8">Property</span>
          <div class="col row items-center q-gutter-xs">
            <div
              v-for="n in 5"
              :key="'prop-' + n"
              class="score-dot"
              :class="{ 'score-dot--filled': n <= Math.ceil(propertyScore / 20) }"
            />
            <span class="text-caption text-grey-6 q-ml-sm">{{ propertyScore }}/100</span>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Contact Summary -->
    <q-card flat bordered class="summary-card q-mb-sm">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-xs">Contact</div>
        <div class="text-body2">{{ contact.firstName }} {{ contact.lastName }}</div>
        <div class="text-body2 text-grey-7">{{ contact.phone }}</div>
        <div v-if="contact.email" class="text-body2 text-grey-7">{{ contact.email }}</div>
        <div v-if="contact.source" class="text-body2 text-grey-7">Source: {{ formatSource(contact.source) }}</div>
      </q-card-section>
    </q-card>

    <!-- Home Summary -->
    <q-card flat bordered class="summary-card q-mb-sm">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-xs">Home</div>
        <div class="text-body2">{{ home.streetAddress }}</div>
        <div v-if="home.city || home.state || home.zip" class="text-body2 text-grey-7">
          {{ [home.city, home.state, home.zip].filter(Boolean).join(', ') }}
        </div>
        <div class="text-body2 text-grey-7">
          {{ home.propertyType === 'RESIDENTIAL' ? 'Residential' : 'Commercial' }}
          <span v-if="home.roofCondition"> &middot; Roof: {{ formatRoof(home.roofCondition) }}</span>
        </div>
        <div class="text-body2 text-grey-7">
          {{ home.electricalService }} service
          <span v-if="home.hasPool"> &middot; Pool</span>
          <span v-if="home.hasEV"> &middot; EV</span>
        </div>
      </q-card-section>
    </q-card>

    <!-- Energy Summary -->
    <q-card flat bordered class="summary-card q-mb-sm">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-xs">Energy</div>
        <div v-if="energy.monthlyBill" class="text-body2">
          Monthly bill: ${{ energy.monthlyBill }}
        </div>
        <div v-if="energy.annualKwhUsage" class="text-body2 text-grey-7">
          Annual usage: {{ energy.annualKwhUsage.toLocaleString() }} kWh
        </div>
        <div v-if="energy.utilityProvider" class="text-body2 text-grey-7">
          Provider: {{ energy.utilityProvider }}
        </div>
        <div v-if="energy.billFiles.length" class="text-body2 text-grey-7">
          {{ energy.billFiles.length }} file(s) uploaded
        </div>
      </q-card-section>
    </q-card>

    <!-- Design Summary -->
    <q-card flat bordered class="summary-card q-mb-sm">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-xs">Design</div>
        <div class="text-body2">
          {{ design.designType === 'AI_DESIGN' ? 'AI Design (Instant)' : 'Manual Design (~20 min)' }}
        </div>
        <div v-if="design.notes" class="text-body2 text-grey-7">
          Notes: {{ design.notes }}
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import type { ContactData, HomeData, EnergyData, DesignData } from '@/composables/useLeadWizard';
import { useLeadFormatting } from '@/composables/useLeadFormatting';
import LeadScoreBadge from '@/components/lead/LeadScoreBadge.vue';

const { formatSource } = useLeadFormatting();

defineProps<{
  contact: ContactData;
  home: HomeData;
  energy: EnergyData;
  design: DesignData;
  scorePreview: number;
  scoreTier: string;
  roofScore: number;
  energyScore: number;
  contactScore: number;
  propertyScore: number;
}>();

function formatRoof(condition: string): string {
  const map: Record<string, string> = {
    GOOD: 'Good (<5 yrs)',
    FAIR: 'Fair (5-15 yrs)',
    POOR: 'Poor (>15 yrs)',
    UNKNOWN: 'Unknown',
  };
  return map[condition] ?? condition;
}
</script>

<style lang="scss" scoped>
.score-card,
.breakdown-card,
.summary-card {
  border-radius: 12px;
}

.score-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e0e0e0;
  transition: background 0.2s;

  &--filled {
    background: #00897b;
  }
}
</style>
