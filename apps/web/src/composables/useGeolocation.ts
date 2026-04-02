import { ref, computed } from 'vue';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};
const MAP_BOX_API_BASE_URL = (env.VITE_MAP_BOX_API_BASE_URL as string) || '';
const MAP_BOX_API_TOKEN = (env.VITE_MAP_BOX_API_TOKEN as string) || '';

export interface ParsedAddress {
  zip: string;
  city: string;
  state: string;
  street: string;
  full: string;
}

export function useGeolocation() {
  const lat = ref<number | null>(null);
  const lng = ref<number | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);
  const parsedAddress = ref<ParsedAddress>({ zip: '', city: '', state: '', street: '', full: '' });

  async function resolveAddress(latitude: number, longitude: number): Promise<ParsedAddress> {
    if (!MAP_BOX_API_BASE_URL || !MAP_BOX_API_TOKEN) {
      throw new Error('Map service is not available at the moment.');
    }
    const url = `${MAP_BOX_API_BASE_URL}/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAP_BOX_API_TOKEN}&types=address&limit=1`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Map service is not available at the moment.');
    }
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return { zip: '', city: '', state: '', street: '', full: '' };

    const ctx = (key: string) =>
      feature.context?.find((c: { id?: string; text?: string }) => c.id?.startsWith(key))?.text ?? '';

    return {
      zip: ctx('postcode'),
      city: ctx('place'),
      state: ctx('region'),
      street: feature.place_name?.split(',')[0] ?? feature.text ?? '',
      full: feature.place_name ?? '',
    };
  }

  async function fetchCurrentPosition() {
    error.value = null;
    if (!navigator.geolocation) {
      error.value = 'Map service is not available at the moment.';
      return;
    }
    loading.value = true;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true,
        });
      });
      lat.value = position.coords.latitude;
      lng.value = position.coords.longitude;
      parsedAddress.value = await resolveAddress(lat.value, lng.value);
    } catch {
      error.value = 'Map service is not available at the moment.';
    } finally {
      loading.value = false;
    }
  }

  // --- Address Autocomplete ---

  const suggestions = ref<ParsedAddress[]>([]);
  const searching = ref(false);

  async function searchAddress(query: string): Promise<void> {
    if (!query || query.length < 3 || !MAP_BOX_API_TOKEN || !MAP_BOX_API_BASE_URL) {
      suggestions.value = [];
      return;
    }
    searching.value = true;
    try {
      const url = `${MAP_BOX_API_BASE_URL}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAP_BOX_API_TOKEN}&country=us&types=address&autocomplete=true&limit=5`;
      const res = await fetch(url);
      const data = await res.json();

      suggestions.value = (data.features ?? []).map((f: { id?: string; text?: string; place_name?: string; context?: { id?: string; text?: string }[] }) => {
        const ctx = (key: string) =>
          f.context?.find((c) => c.id?.startsWith(key))?.text ?? '';

        return {
          zip: ctx('postcode'),
          city: ctx('place'),
          state: ctx('region'),
          street: f.place_name?.split(',')[0] ?? f.text ?? '',
          full: f.place_name ?? '',
        };
      });
    } catch {
      suggestions.value = [];
    } finally {
      searching.value = false;
    }
  }

  function clearSuggestions() {
    suggestions.value = [];
  }

  const staticMapUrl = computed(() => {
    if (!lat.value || !lng.value || !MAP_BOX_API_BASE_URL || !MAP_BOX_API_TOKEN) return null;
    return `${MAP_BOX_API_BASE_URL}/styles/v1/mapbox/satellite-streets-v12/static/pin-s+00897B(${lng.value},${lat.value})/${lng.value},${lat.value},17,0/400x200@2x?access_token=${MAP_BOX_API_TOKEN}`;
  });

  return {
    lat,
    lng,
    error,
    loading,
    searching,
    staticMapUrl,
    suggestions,
    parsedAddress,
    searchAddress,
    resolveAddress,
    clearSuggestions,
    fetchCurrentPosition,
  };
}
