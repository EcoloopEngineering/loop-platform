<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="design-dialog">
      <q-card-section class="dialog-header">
        <div class="row items-center no-wrap">
          <q-icon name="design_services" size="24px" color="primary" class="q-mr-sm" />
          <div>
            <div class="text-h6 text-weight-bold">Request Design</div>
            <div class="text-caption text-grey-6">{{ customerName }}</div>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="dialog-body">
        <!-- Map Preview with annotations -->
        <div v-if="mapUrl" class="map-preview q-mb-md">
          <img :src="annotatedMapUrl || mapUrl" alt="Property location" class="map-image" />
          <div class="map-address">
            <q-icon name="place" size="14px" color="primary" />
            <span>{{ address }}</span>
          </div>
          <div v-if="annotationCount > 0" class="map-annotations-badge">
            <q-icon name="edit_location_alt" size="14px" />
            {{ annotationCount }} site annotation{{ annotationCount !== 1 ? 's' : '' }}
          </div>
        </div>
        <q-banner v-else class="bg-grey-2 q-mb-md" rounded dense>
          <template #avatar><q-icon name="map" color="grey-5" /></template>
          No location available for this property.
        </q-banner>

        <!-- Design Type -->
        <div class="text-subtitle2 text-weight-bold q-mb-sm">Design Type</div>
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-6">
            <q-card
              flat bordered
              class="design-option cursor-pointer"
              :class="{ 'design-option--selected': designType === 'AI_DESIGN' }"
              @click="designType = 'AI_DESIGN'"
            >
              <q-card-section class="text-center q-pa-md">
                <q-icon name="auto_awesome" size="28px" :color="designType === 'AI_DESIGN' ? 'primary' : 'grey-5'" />
                <div class="text-weight-bold q-mt-xs">AI Design</div>
                <q-badge color="teal-2" text-color="teal-9" label="INSTANT" class="q-mt-xs" />
                <div class="text-caption text-grey-6 q-mt-xs">Standard rooftops</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6">
            <q-card
              flat bordered
              class="design-option cursor-pointer"
              :class="{ 'design-option--selected': designType === 'MANUAL_DESIGN' }"
              @click="designType = 'MANUAL_DESIGN'"
            >
              <q-card-section class="text-center q-pa-md">
                <q-icon name="architecture" size="28px" :color="designType === 'MANUAL_DESIGN' ? 'primary' : 'grey-5'" />
                <div class="text-weight-bold q-mt-xs">Manual Design</div>
                <q-badge color="orange-2" text-color="orange-9" label="~20 MIN" class="q-mt-xs" />
                <div class="text-caption text-grey-6 q-mt-xs">Complex projects</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Energy Info (if not filled during lead creation) -->
        <div class="text-subtitle2 text-weight-bold q-mb-sm">Energy Details</div>
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-6">
            <q-input v-model.number="monthlyBill" label="Monthly Bill ($)" type="number" outlined dense class="design-input" />
          </div>
          <div class="col-6">
            <q-input v-model.number="annualKwh" label="Annual Usage (kWh)" type="number" outlined dense class="design-input" />
          </div>
        </div>

        <!-- Roof Info -->
        <div class="text-subtitle2 text-weight-bold q-mb-sm">Roof Details</div>
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-6">
            <q-select v-model="roofCondition" :options="roofOptions" label="Roof Condition" outlined dense emit-value map-options class="design-input" />
          </div>
          <div class="col-6">
            <q-select v-model="electricalService" :options="['100A', '200A', '400A']" label="Electrical Service" outlined dense class="design-input" />
          </div>
        </div>

        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-6">
            <q-toggle v-model="hasPool" label="Has Pool" />
          </div>
          <div class="col-6">
            <q-toggle v-model="hasEV" label="Has EV" />
          </div>
        </div>

        <!-- Notes -->
        <q-input v-model="notes" label="Design Notes (optional)" type="textarea" outlined dense autogrow class="design-input q-mb-sm" />
      </q-card-section>

      <q-separator />

      <q-card-section class="dialog-footer">
        <q-btn flat no-caps color="grey-7" label="Cancel" @click="$emit('update:modelValue', false)" />
        <q-space />
        <q-btn unelevated no-caps color="primary" label="Submit Design Request" :loading="loading" :disable="!designType" @click="handleSubmit" class="submit-design-btn" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { api } from '@/boot/axios';
import { useSiteAnnotationsApi } from '@/composables/useSiteAnnotationsApi';
import type { SiteAnnotation } from '@/types/api';

const props = defineProps<{
  modelValue: boolean;
  leadId: string;
  customerName: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  // Pre-fill from lead data
  currentMonthlyBill?: number | null;
  currentRoofCondition?: string | null;
  currentElectricalService?: string | null;
  currentHasPool?: boolean;
  currentHasEV?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'submitted'): void;
}>();

const MAPBOX_TOKEN = (import.meta.env?.VITE_MAPBOX_ACCESS_TOKEN as string)
  || (typeof process !== 'undefined' ? process.env?.MAPBOX_ACCESS_TOKEN : '') || '';

const annotationsApi = useSiteAnnotationsApi();
const siteAnnotations = ref<SiteAnnotation[]>([]);
const annotationCount = computed(() => siteAnnotations.value.length);

const geocodedLat = ref<number | null>(null);
const geocodedLng = ref<number | null>(null);

const effectiveLat = computed(() => props.latitude ?? geocodedLat.value);
const effectiveLng = computed(() => props.longitude ?? geocodedLng.value);

const mapUrl = computed(() => {
  if (!effectiveLat.value || !effectiveLng.value || !MAPBOX_TOKEN) return '';
  const lng = effectiveLng.value;
  const lat = effectiveLat.value;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/pin-l+00897B(${lng},${lat})/${lng},${lat},18,0/600x300@2x?access_token=${MAPBOX_TOKEN}`;
});

const ANNOTATION_COLORS: Record<string, string> = {
  TREE_REMOVAL: '22C55E',
  SHADE_AREA: 'EAB308',
  OBSTACLE: 'EF4444',
  PANEL_PLACEMENT: '3B82F6',
  CUSTOM: '6B7280',
};

const annotatedMapUrl = computed(() => {
  if (!effectiveLat.value || !effectiveLng.value || !MAPBOX_TOKEN || siteAnnotations.value.length === 0) return '';
  const lng = effectiveLng.value;
  const lat = effectiveLat.value;
  // Build marker overlays for Mapbox Static API
  const pins = siteAnnotations.value
    .filter((a) => a.geometryType === 'POINT')
    .map((a) => {
      const coords = a.coordinates as number[];
      const color = ANNOTATION_COLORS[a.type] ?? '6B7280';
      return `pin-s+${color}(${coords[0]},${coords[1]})`;
    })
    .slice(0, 50); // Mapbox limit
  const propertyPin = `pin-l+00897B(${lng},${lat})`;
  const overlays = [propertyPin, ...pins].join(',');
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${overlays}/${lng},${lat},18,0/600x300@2x?access_token=${MAPBOX_TOKEN}`;
});

// Geocode address if no coordinates provided — also fetch annotations
watch(() => props.modelValue, async (open) => {
  if (!open) return;
  // Fetch site annotations for this lead
  siteAnnotations.value = await annotationsApi.fetchAnnotations(props.leadId);
  if (props.latitude || props.longitude || !props.address || !MAPBOX_TOKEN) return;
  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(props.address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`);
    const data = await res.json();
    const coords = data.features?.[0]?.center;
    if (coords) {
      geocodedLng.value = coords[0];
      geocodedLat.value = coords[1];
    }
  } catch { /* ignore */ }
});

const designType = ref<string | null>(null);
const monthlyBill = ref<number | null>(props.currentMonthlyBill ?? null);
const annualKwh = ref<number | null>(null);
const roofCondition = ref<string | null>(props.currentRoofCondition ?? null);
const electricalService = ref<string>(props.currentElectricalService ?? '200A');
const hasPool = ref(props.currentHasPool ?? false);
const hasEV = ref(props.currentHasEV ?? false);
const notes = ref('');
const loading = ref(false);

const roofOptions = [
  { label: 'Good (<5 yrs)', value: 'GOOD' },
  { label: 'Fair (5-15 yrs)', value: 'FAIR' },
  { label: 'Poor (>15 yrs)', value: 'POOR' },
  { label: 'Unknown', value: 'UNKNOWN' },
];

async function handleSubmit() {
  if (!designType.value) return;
  loading.value = true;
  try {
    // Include site annotations summary in design notes
    let designNotes = notes.value || '';
    if (siteAnnotations.value.length > 0) {
      const summary = siteAnnotations.value.map((a) => {
        const label = a.label ? ` — ${a.label}` : '';
        return `• ${a.type.replace(/_/g, ' ')}${label}`;
      }).join('\n');
      designNotes = designNotes
        ? `${designNotes}\n\n--- Site Annotations ---\n${summary}`
        : `--- Site Annotations ---\n${summary}`;
    }
    const hasTreeRemoval = siteAnnotations.value.some((a) => a.type === 'TREE_REMOVAL');
    await api.post(`/leads/${props.leadId}/designs`, {
      designType: designType.value === 'AI_DESIGN' ? 'STANDARD' : 'CUSTOM',
      notes: designNotes || undefined,
      treeRemoval: hasTreeRemoval,
    });
    // Update lead energy/property data if provided
    const updates: Record<string, unknown> = {};
    if (monthlyBill.value) updates.monthlyBill = monthlyBill.value;
    if (annualKwh.value) updates.annualKwh = annualKwh.value;
    if (roofCondition.value) updates.roofCondition = roofCondition.value;
    if (electricalService.value) updates.electricalService = electricalService.value;
    updates.hasPool = hasPool.value;
    updates.hasEV = hasEV.value;

    if (Object.keys(updates).length > 0) {
      await api.patch(`/leads/${props.leadId}/metadata`, updates).catch(() => {});
    }

    emit('submitted');
    emit('update:modelValue', false);
  } catch {
    // Error handled by caller
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.design-dialog {
  width: 560px;
  max-width: 95vw;
  border-radius: 16px;
}

.dialog-header {
  padding: 16px 20px;
}

.dialog-body {
  max-height: 70vh;
  overflow-y: auto;
  padding: 16px 20px;
}

.dialog-footer {
  display: flex;
  align-items: center;
  padding: 12px 20px;
}

.map-preview {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #E5E7EB;
  position: relative;
}

.map-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.map-address {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #F9FAFB;
  font-size: 13px;
  color: #374151;
}

.map-annotations-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #00897B;
  display: flex;
  align-items: center;
  gap: 4px;
}

.design-option {
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(0, 137, 123, 0.3);
  }

  &--selected {
    border-color: #00897B !important;
    background: rgba(0, 137, 123, 0.04);
    box-shadow: 0 0 0 2px rgba(0, 137, 123, 0.15);
  }
}

.design-input {
  :deep(.q-field__control) {
    border-radius: 10px;
  }
}

.submit-design-btn {
  border-radius: 10px;
  font-weight: 600;
  padding: 8px 24px;
}
</style>
