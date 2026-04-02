import { ref, computed } from 'vue';
import { LeadSource } from '@loop/shared';
import { useCustomerStore } from '@/stores/customer.store';
import { useGeolocation } from '@/composables/useGeolocation';

export interface ProspectData {
  phone: string;
  email: string;
  notes: string;
  lastName: string;
  firstName: string;
  socialLink: string;
  source: LeadSource | null;
}

export function useProspectWizard() {
  const geo = useGeolocation();
  const customerStore = useCustomerStore();

  const submitting = ref(false);

  const prospectData = ref<ProspectData>({
    phone: '',
    email: '',
    notes: '',
    source: null,
    lastName: '',
    firstName: '',
    socialLink: '',
  });

  const isDoorKnock = computed(() => prospectData.value.source === LeadSource.DOOR_KNOCK);

  const hasContactInfo = computed(() => {
    const prospect = prospectData.value;
    return !!(
      prospect.firstName.trim() ||
      prospect.lastName.trim() ||
      prospect.phone.trim() ||
      prospect.email.trim() ||
      prospect.notes.trim()
    );
  });

  const canSubmit = computed(() => {
    return prospectData.value.source !== null && hasContactInfo.value;
  });

  interface ProspectAddress {
    zip?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    streetAddress?: string;
  }

  async function submitProspect(address?: ProspectAddress) {
    submitting.value = true;
    try {
      const prospect = prospectData.value;

      const hasAddress = address?.streetAddress;

      return await customerStore.createProspect({
        email: prospect.email || undefined,
        phone: prospect.phone || undefined,
        source: prospect.source ?? LeadSource.OTHER,
        address: hasAddress ? address : undefined,
        lastName: prospect.lastName.trim() || undefined,
        firstName: prospect.firstName.trim() || undefined,
        socialLink: prospect.socialLink || undefined,
      });
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axErr?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to save contact.');
      throw new Error(errorMsg);
    } finally {
      submitting.value = false;
    }
  }

  return {
    geo,
    canSubmit,
    submitting,
    isDoorKnock,
    prospectData,
    hasContactInfo,
    submitProspect,
  };
}
