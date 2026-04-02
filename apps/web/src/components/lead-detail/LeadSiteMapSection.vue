<template>
  <div class="site-map-section">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-label">Mark on map:</div>
      <q-btn-toggle
        v-model="activeTool"
        clearable
        no-caps
        dense
        unelevated
        toggle-color="primary"
        text-color="grey-7"
        color="white"
        class="tool-toggle"
        :options="toolOptions"
      />
    </div>

    <!-- Map hint -->
    <div v-if="activeTool" class="map-hint">
      Tap on the map to place a {{ toolLabel(activeTool) }} marker
    </div>

    <!-- Map container -->
    <div ref="mapContainer" class="map-container" />

    <!-- Empty state when no coordinates -->
    <div v-if="!hasCoordinates && !geocoding" class="map-overlay">
      <q-icon name="map" size="48px" color="grey-4" />
      <div class="text-grey-5 q-mt-sm">No location available for this property</div>
    </div>

    <!-- Loading state -->
    <div v-if="geocoding" class="map-overlay">
      <q-spinner-dots color="primary" size="32px" />
      <div class="text-grey-5 q-mt-sm">Loading map...</div>
    </div>

    <!-- Annotation count -->
    <div v-if="annotations.length > 0" class="annotation-count">
      {{ annotations.length }} annotation{{ annotations.length !== 1 ? 's' : '' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useQuasar } from 'quasar';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useSiteAnnotationsApi } from '@/composables/useSiteAnnotationsApi';
import type { SiteAnnotation } from '@/types/api';

type AnnotationType = SiteAnnotation['type'];

interface LeadData {
  property?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    streetAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

const props = defineProps<{
  leadId: string;
  lead: LeadData;
}>();

const $q = useQuasar();
const annotationsApi = useSiteAnnotationsApi();

const MAPBOX_TOKEN = (import.meta.env?.VITE_MAPBOX_ACCESS_TOKEN as string)
  || (typeof process !== 'undefined' ? process.env?.MAPBOX_ACCESS_TOKEN : '') || '';

const tools: Array<{ type: AnnotationType; icon: string; label: string; color: string }> = [
  { type: 'TREE_REMOVAL', icon: '\uD83C\uDF33', label: 'Tree', color: '#22C55E' },
  { type: 'SHADE_AREA', icon: '\u2600\uFE0F', label: 'Shade', color: '#EAB308' },
  { type: 'OBSTACLE', icon: '\u26A0\uFE0F', label: 'Obstacle', color: '#EF4444' },
  { type: 'PANEL_PLACEMENT', icon: '\uD83D\uDCD0', label: 'Panel', color: '#3B82F6' },
  { type: 'CUSTOM', icon: '\uD83D\uDCDD', label: 'Note', color: '#6B7280' },
];

const toolOptions = tools.map((t) => ({
  value: t.type,
  slot: t.type,
  label: `${t.icon} ${t.label}`,
}));

const mapContainer = ref<HTMLElement | null>(null);
const activeTool = ref<AnnotationType | null>(null);
const annotations = ref<SiteAnnotation[]>([]);
const geocoding = ref(false);
const hasCoordinates = ref(false);

let map: mapboxgl.Map | null = null;
const markers: Map<string, mapboxgl.Marker> = new Map();
let activePopup: mapboxgl.Popup | null = null;

function getPropertyCoords(): { lat: number; lng: number } | null {
  const p = props.lead?.property;
  if (!p) return null;
  const lat = p.lat ?? p.latitude;
  const lng = p.lng ?? p.longitude;
  if (lat && lng) return { lat, lng };
  return null;
}

function getPropertyAddress(): string {
  const p = props.lead?.property;
  if (!p) return '';
  return [p.streetAddress, p.city, p.state, p.zip].filter(Boolean).join(', ');
}

function toolConfig(type: AnnotationType) {
  return tools.find((t) => t.type === type) ?? tools[4];
}

function toolLabel(type: AnnotationType): string {
  return toolConfig(type).label;
}

function selectTool(type: AnnotationType) {
  activeTool.value = activeTool.value === type ? null : type;
}

function createMarkerElement(type: AnnotationType): HTMLElement {
  const config = toolConfig(type);
  const el = document.createElement('div');
  el.className = 'site-marker';
  el.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${config.color};
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.15s;
  `;
  el.innerHTML = config.icon;
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
  return el;
}

function showAnnotationPopup(annotation: SiteAnnotation, marker: mapboxgl.Marker) {
  if (activePopup) activePopup.remove();

  const config = toolConfig(annotation.type);
  const container = document.createElement('div');
  container.style.cssText = 'font-family: Inter, sans-serif; min-width: 200px;';
  container.innerHTML = `
    <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
      <span>${config.icon}</span>
      <span>${config.label}</span>
    </div>
    <input type="text" placeholder="Label (optional)" value="${annotation.label ?? ''}"
      style="width: 100%; padding: 6px 8px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 12px; margin-bottom: 6px; outline: none; font-family: Inter, sans-serif;"
      class="popup-label-input" />
    <textarea placeholder="Note (optional)" rows="2"
      style="width: 100%; padding: 6px 8px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 12px; margin-bottom: 8px; resize: vertical; outline: none; font-family: Inter, sans-serif;"
      class="popup-note-input">${annotation.note ?? ''}</textarea>
    <div style="display: flex; gap: 6px; justify-content: flex-end;">
      <button class="popup-save-btn" style="padding: 4px 12px; background: #00897B; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Save</button>
      <button class="popup-delete-btn" style="padding: 4px 12px; background: #EF4444; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Delete</button>
    </div>
  `;

  const saveBtn = container.querySelector('.popup-save-btn') as HTMLButtonElement;
  const deleteBtn = container.querySelector('.popup-delete-btn') as HTMLButtonElement;
  const labelInput = container.querySelector('.popup-label-input') as HTMLInputElement;
  const noteInput = container.querySelector('.popup-note-input') as HTMLTextAreaElement;

  saveBtn.addEventListener('click', async () => {
    const updated = await annotationsApi.updateAnnotation(props.leadId, annotation.id, {
      label: labelInput.value.trim() || null,
      note: noteInput.value.trim() || null,
    } as Record<string, unknown>);
    if (updated) {
      const idx = annotations.value.findIndex((a) => a.id === annotation.id);
      if (idx !== -1) annotations.value[idx] = updated;
      $q.notify({ type: 'positive', message: 'Annotation updated', timeout: 2000 });
    } else {
      $q.notify({ type: 'negative', message: 'Failed to update annotation' });
    }
    if (activePopup) activePopup.remove();
  });

  deleteBtn.addEventListener('click', async () => {
    const ok = await annotationsApi.deleteAnnotation(props.leadId, annotation.id);
    if (ok) {
      annotations.value = annotations.value.filter((a) => a.id !== annotation.id);
      const m = markers.get(annotation.id);
      if (m) { m.remove(); markers.delete(annotation.id); }
      $q.notify({ type: 'positive', message: 'Annotation deleted', timeout: 2000 });
    } else {
      $q.notify({ type: 'negative', message: 'Failed to delete annotation' });
    }
    if (activePopup) activePopup.remove();
  });

  const coords = annotation.coordinates as number[];
  const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: true, maxWidth: '260px' })
    .setLngLat([coords[0], coords[1]])
    .setDOMContent(container)
    .addTo(map!);

  activePopup = popup;
  popup.on('close', () => { activePopup = null; });
}

function addMarkerToMap(annotation: SiteAnnotation) {
  if (!map) return;
  const coords = annotation.coordinates as number[];
  const el = createMarkerElement(annotation.type);

  const marker = new mapboxgl.Marker({ element: el, draggable: false })
    .setLngLat([coords[0], coords[1]])
    .addTo(map);

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    showAnnotationPopup(annotation, marker);
  });

  markers.set(annotation.id, marker);
}

async function handleMapClick(e: mapboxgl.MapMouseEvent) {
  if (!activeTool.value) return;

  const type = activeTool.value;
  const lng = e.lngLat.lng;
  const lat = e.lngLat.lat;

  const created = await annotationsApi.createAnnotation(props.leadId, {
    type,
    geometryType: 'POINT',
    coordinates: [lng, lat],
  });

  if (created) {
    annotations.value.push(created);
    addMarkerToMap(created);
    // Open popup immediately so user can add label/note
    const marker = markers.get(created.id);
    if (marker) showAnnotationPopup(created, marker);
  } else {
    $q.notify({ type: 'negative', message: 'Failed to save annotation' });
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!MAPBOX_TOKEN || !address) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
    );
    const data = await res.json();
    const coords = data.features?.[0]?.center;
    if (coords) return { lng: coords[0], lat: coords[1] };
  } catch { /* ignore */ }
  return null;
}

async function initMap() {
  if (!mapContainer.value || !MAPBOX_TOKEN) return;

  let center = getPropertyCoords();

  if (!center) {
    geocoding.value = true;
    const address = getPropertyAddress();
    center = await geocodeAddress(address);
    geocoding.value = false;
  }

  if (!center) return;

  hasCoordinates.value = true;
  mapboxgl.accessToken = MAPBOX_TOKEN;

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: [center.lng, center.lat],
    zoom: 18,
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // Property pin
  const propertyEl = document.createElement('div');
  propertyEl.style.cssText = `
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #00897B;
    border: 3px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  `;
  new mapboxgl.Marker({ element: propertyEl })
    .setLngLat([center.lng, center.lat])
    .addTo(map);

  map.on('click', handleMapClick);

  // Load existing annotations
  const existing = await annotationsApi.fetchAnnotations(props.leadId);
  annotations.value = existing;
  for (const a of existing) {
    addMarkerToMap(a);
  }
}

// Change cursor when tool is active
watch(activeTool, (tool) => {
  if (!map) return;
  map.getCanvas().style.cursor = tool ? 'crosshair' : '';
});

onMounted(async () => {
  await nextTick();
  initMap();
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
  markers.clear();
});
</script>

<style lang="scss" scoped>
.site-map-section {
  position: relative;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  overflow-x: auto;

  &::-webkit-scrollbar { display: none; }
}

.toolbar-label {
  font-size: 12px;
  font-weight: 600;
  color: #9CA3AF;
  white-space: nowrap;
  flex-shrink: 0;
}

.tool-toggle {
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;

  :deep(.q-btn) {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    min-height: 32px;
    border-radius: 0 !important;
  }

  :deep(.q-btn--active) {
    box-shadow: none;
  }

  @media (max-width: 599px) {
    :deep(.q-btn) {
      padding: 6px 8px;
      min-height: 40px;
    }
  }
}

.map-hint {
  font-size: 12px;
  color: #00897B;
  font-weight: 500;
  padding: 6px 12px;
  background: rgba(0, 137, 123, 0.06);
  border-radius: 8px;
  margin-bottom: 8px;
  text-align: center;
}

.map-container {
  width: 100%;
  height: 500px;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  overflow: hidden;

  @media (max-width: 599px) {
    height: calc(100vh - 200px);
    min-height: 300px;
  }
}

.map-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  z-index: 1;
}

.annotation-count {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  z-index: 1;
}
</style>
