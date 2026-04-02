import { api } from '@/boot/axios';
import { useRouter, useRoute } from 'vue-router';
import { useLeadStore } from '@/stores/lead.store';
import { EMAIL_REGEX } from '@/utils/validators';
import { ref, computed, watch, onMounted } from 'vue';
import {
  LeadSource,
  DesignType,
  PropertyType,
  RoofCondition,
  ROOF_SCORE_MAP,
  SCORING_WEIGHTS,
  ENERGY_SCORE_THRESHOLDS,
} from '@loop/shared';

export interface ContactData {
  phone: string;
  email: string;
  lastName: string;
  firstName: string;
  source: LeadSource | null;
}

export interface HomeData {
  zip: string;
  lat: number | null;
  lng: number | null;
  city: string;
  state: string;
  hasEV: boolean | null;
  hasPool: boolean | null;
  streetAddress: string;
  treeRemoval: boolean | null;
  propertyType: PropertyType;
  roofCondition: RoofCondition | null;
  electricalService: string;
}

export interface EnergyData {
  billFiles: File[];
  monthlyBill: number | null;
  utilityProvider: string;
  annualKwhUsage: number | null;
}

export interface DesignData {
  notes: string;
  designType: DesignType | null;
}

const STEP_NAMES = ['Contact', 'Home', 'Energy', 'Design', 'Review'] as const;

export function useLeadWizard() {
  const route = useRoute();
  const router = useRouter();
  const leadStore = useLeadStore();

  const submitting = ref(false);
  const currentStep = ref(1);
  const leadId = ref<string | undefined>();
  const propertyId = ref<string | undefined>();
  const customerId = ref(route.query.customerId as string | undefined);

  const contactData = ref<ContactData>({
    phone: '',
    email: '',
    source: null,
    lastName: '',
    firstName: '',
  });

  const treeRemovalQuery = route.query.treeRemoval;
  const treeRemovalValue = customerId.value
    ? (treeRemovalQuery === 'true' ? true : treeRemovalQuery === 'false' ? false : null)
    : null;

  const homeData = ref<HomeData>({
    zip: '',
    lat: null,
    lng: null,
    city: '',
    state: '',
    hasEV: null,
    hasPool: null,
    streetAddress: '',
    treeRemoval: treeRemovalValue,
    propertyType: PropertyType.RESIDENTIAL,
    roofCondition: null,
    electricalService: '200A',
  });

  const energyData = ref<EnergyData>({
    billFiles: [],
    monthlyBill: null,
    utilityProvider: '',
    annualKwhUsage: null,
  });

  const designData = ref<DesignData>({
    notes: '',
    designType: null,
  });

  // --- Load customer + create Lead on mount ---

  if (customerId.value) {
    onMounted(async () => {
      try {
        const { data: customer } = await api.get(`/customers/${customerId.value}`);
        contactData.value.email = customer.email || '';
        contactData.value.phone = customer.phone || '';
        contactData.value.source = customer.source || null;
        contactData.value.lastName = customer.lastName || '';
        contactData.value.firstName = customer.firstName || '';

        if (customer.properties?.length) {
          const property = customer.properties[0];
          propertyId.value = property.id;
          homeData.value.zip = property.zip || '';
          homeData.value.city = property.city || '';
          homeData.value.state = property.state || '';
          homeData.value.lat = property.latitude ?? null;
          homeData.value.lng = property.longitude ?? null;
          homeData.value.streetAddress = property.streetAddress || '';
        }

        if (customerId.value && propertyId.value) {
          const lead = await leadStore.createLead({
            contact: {
              phone: customer.phone || '',
              email: customer.email || 'noemail@placeholder.com',
              source: customer.source || LeadSource.OTHER,
              lastName: customer.lastName,
              firstName: customer.firstName,
            },
            home: {
              city: homeData.value.city,
              zip: homeData.value.zip,
              state: homeData.value.state,
              latitude: homeData.value.lat ?? undefined,
              longitude: homeData.value.lng ?? undefined,
              propertyType: homeData.value.propertyType,
              roofCondition: RoofCondition.UNKNOWN,
              streetAddress: homeData.value.streetAddress,
            },
            energy: {},
            design: { designType: DesignType.MANUAL_DESIGN },
          });
          leadId.value = lead.id;
        }
      } catch {
        // Customer fetch or lead creation failed — continue without pre-fill
      }
    });
  }

  // --- Auto-save on step change ---

  watch(currentStep, async () => {
    if (!leadId.value) return;
    try {
      await api.patch(`/leads/${leadId.value}`, {
        contact: {
          phone: contactData.value.phone,
          email: contactData.value.email || undefined,
          source: contactData.value.source ?? undefined,
          lastName: contactData.value.lastName.trim(),
          firstName: contactData.value.firstName.trim(),
        },
        home: {
          zip: homeData.value.zip,
          city: homeData.value.city,
          hasEV: homeData.value.hasEV,
          state: homeData.value.state,
          hasPool: homeData.value.hasPool,
          monthlyBill: energyData.value.monthlyBill ?? undefined,
          propertyType: homeData.value.propertyType,
          streetAddress: homeData.value.streetAddress,
          roofCondition: homeData.value.roofCondition ?? undefined,
          annualKwhUsage: energyData.value.annualKwhUsage ?? undefined,
          utilityProvider: energyData.value.utilityProvider || undefined,
          electricalService: homeData.value.electricalService || undefined,
        },
        design: {
          designType: designData.value.designType ?? undefined,
          designNotes: designData.value.notes || undefined,
        },
      });
    } catch {
      // Auto-save failed silently
    }
  });

  // --- Validation ---

  const isStep1Valid = computed(() => {
    const contact = contactData.value;
    return (
      contact.firstName.trim().length > 0 &&
      contact.lastName.trim().length > 0 &&
      contact.phone.replace(/\D/g, '').length >= 10
    );
  });

  const isStep2Valid = computed(() => {
    return homeData.value.streetAddress.trim().length > 0;
  });

  const isStep3Valid = computed(() => {
    return (
      energyData.value.monthlyBill !== null && energyData.value.monthlyBill > 0
    );
  });

  const isStep4Valid = computed(() => {
    return designData.value.designType !== null;
  });

  const isStep5Valid = computed(() => true);

  // --- Step progress (0-1 per step, based on filled fields) ---

  const stepProgress = computed(() => {
    const contact = contactData.value;
    const contactFilled = [
      contact.firstName.trim(),
      contact.lastName.trim(),
      contact.phone.replace(/\D/g, '').length >= 10,
      contact.email.trim() && EMAIL_REGEX.test(contact.email.trim()),
    ].filter(Boolean).length;

    const home = homeData.value;
    const homeFilled = [
      home.streetAddress.trim(),
      home.city.trim(),
      home.state.trim(),
      home.zip.trim(),
      home.roofCondition,
      home.hasPool !== null,
      home.hasEV !== null,
      home.treeRemoval !== null,
    ].filter(Boolean).length;

    const energy = energyData.value;
    const energyFilled = [
      energy.monthlyBill && energy.monthlyBill > 0 ? energy.monthlyBill : null,
      energy.annualKwhUsage,
      energy.utilityProvider.trim(),
    ].filter(Boolean).length;

    const design = designData.value;
    const designFilled = [
      design.designType,
      design.notes.trim(),
    ].filter(Boolean).length;

    return [
      contactFilled / 4,
      homeFilled / 8,
      energyFilled / 3,
      designFilled / 2,
      isStep5Valid.value ? 1 : 0,
    ];
  });

  const canSubmit = computed(() => {
    return isStep1Valid.value && isStep2Valid.value && isStep3Valid.value && isStep4Valid.value;
  });

  function isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return isStep1Valid.value;
      case 2:
        return isStep2Valid.value;
      case 3:
        return isStep3Valid.value;
      case 4:
        return isStep4Valid.value;
      case 5:
        return isStep5Valid.value;
      default:
        return false;
    }
  }

  // --- Scoring ---

  const roofScore = computed(() => {
    const condition = homeData.value.roofCondition;
    if (!condition) return 0;
    return ROOF_SCORE_MAP[condition] ?? 0;
  });

  const energyScore = computed(() => {
    const bill = energyData.value.monthlyBill;
    if (!bill || bill <= 0) return 0;
    for (const threshold of ENERGY_SCORE_THRESHOLDS) {
      if (bill >= threshold.min) return threshold.score;
    }
    return 0;
  });

  const contactScore = computed(() => {
    let score = 0;
    const contact = contactData.value;
    if (contact.firstName.trim()) score += 30;
    if (contact.lastName.trim()) score += 20;
    if (contact.phone.replace(/\D/g, '').length >= 10) score += 30;
    if (contact.email.trim()) score += 10;
    if (contact.source) score += 10;
    return score;
  });

  const propertyScore = computed(() => {
    let score = 0;
    const home = homeData.value;
    if (home.streetAddress.trim()) score += 40;
    if (home.city.trim()) score += 15;
    if (home.state.trim()) score += 10;
    if (home.zip.trim()) score += 10;
    if (home.electricalService) score += 15;
    if (home.propertyType) score += 10;
    return Math.min(score, 100);
  });

  const scorePreview = computed(() => {
    const weighted =
      roofScore.value * SCORING_WEIGHTS.roof +
      energyScore.value * SCORING_WEIGHTS.energy +
      contactScore.value * SCORING_WEIGHTS.contact +
      propertyScore.value * SCORING_WEIGHTS.property;
    return Math.round(weighted);
  });

  const scoreTier = computed(() => {
    if (scorePreview.value >= 70) return 'Hot Lead';
    if (scorePreview.value >= 40) return 'Warm Lead';
    return 'Cold Lead';
  });

  // --- Navigation ---

  function nextStep() {
    if (currentStep.value < 5) {
      currentStep.value++;
    }
  }

  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--;
    }
  }

  function goToStep(step: number) {
    if (step >= 1 && step <= 5) {
      currentStep.value = step;
    }
  }

  // --- Submit ---

  async function submitLead() {
    submitting.value = true;
    try {
      if (leadId.value) {
        await api.patch(`/leads/${leadId.value}`, {
          contact: {
            phone: contactData.value.phone,
            email: contactData.value.email || undefined,
            source: contactData.value.source ?? LeadSource.OTHER,
            lastName: contactData.value.lastName.trim(),
            firstName: contactData.value.firstName.trim(),
          },
          home: {
            zip: homeData.value.zip,
            city: homeData.value.city,
            hasEV: homeData.value.hasEV,
            state: homeData.value.state,
            hasPool: homeData.value.hasPool,
            monthlyBill: energyData.value.monthlyBill ?? undefined,
            propertyType: homeData.value.propertyType,
            streetAddress: homeData.value.streetAddress,
            roofCondition: homeData.value.roofCondition ?? RoofCondition.UNKNOWN,
            annualKwhUsage: energyData.value.annualKwhUsage ?? undefined,
            utilityProvider: energyData.value.utilityProvider || undefined,
            electricalService: homeData.value.electricalService || undefined,
          },
          design: {
            designType: designData.value.designType ?? DesignType.MANUAL_DESIGN,
            designNotes: designData.value.notes || undefined,
          },
        });
        router.push(`/crm/leads/${leadId.value}`);
        return { id: leadId.value };
      }

      // Fallback: create new lead (no customerId flow)
      const payload = {
        contact: {
          phone: contactData.value.phone,
          email: contactData.value.email || 'noemail@placeholder.com',
          source: contactData.value.source ?? LeadSource.OTHER,
          lastName: contactData.value.lastName.trim(),
          firstName: contactData.value.firstName.trim(),
        },
        home: {
          zip: homeData.value.zip,
          city: homeData.value.city,
          hasEV: homeData.value.hasEV,
          state: homeData.value.state,
          hasPool: homeData.value.hasPool,
          latitude: homeData.value.lat ?? undefined,
          longitude: homeData.value.lng ?? undefined,
          monthlyBill: energyData.value.monthlyBill ?? undefined,
          propertyType: homeData.value.propertyType,
          streetAddress: homeData.value.streetAddress,
          roofCondition: homeData.value.roofCondition ?? RoofCondition.UNKNOWN,
          annualKwhUsage: energyData.value.annualKwhUsage ?? undefined,
          utilityProvider: energyData.value.utilityProvider || undefined,
          electricalService: homeData.value.electricalService || undefined,
        },
        energy: {
          monthlyBill: energyData.value.monthlyBill ?? undefined,
          utilityProvider: energyData.value.utilityProvider || undefined,
          annualKwhUsage: energyData.value.annualKwhUsage ?? undefined,
        },
        design: {
          designType: designData.value.designType ?? DesignType.MANUAL_DESIGN,
          designNotes: designData.value.notes || undefined,
        },
      };
      const lead = await leadStore.createLead(payload);
      router.push(`/crm/leads/${lead.id}`);
      return lead;
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axErr?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to create lead.');
      throw new Error(errorMsg);
    } finally {
      submitting.value = false;
    }
  }

  return {
    leadId,
    goToStep,
    nextStep,
    prevStep,
    homeData,
    canSubmit,
    roofScore,
    scoreTier,
    submitting,
    submitLead,
    STEP_NAMES,
    designData,
    energyData,
    contactData,
    currentStep,
    isStepValid,
    energyScore,
    contactScore,
    stepProgress,
    scorePreview,
    isStep1Valid,
    isStep2Valid,
    isStep3Valid,
    isStep4Valid,
    isStep5Valid,
    propertyScore,
  };
}
