import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLeadStore } from '@/stores/lead.store';
import {
  LeadSource,
  RoofCondition,
  PropertyType,
  DesignType,
  SCORING_WEIGHTS,
  ROOF_SCORE_MAP,
  ENERGY_SCORE_THRESHOLDS,
} from '@loop/shared';

export interface ContactData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  source: LeadSource | null;
}

export interface HomeData {
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  roofCondition: RoofCondition | null;
  propertyType: PropertyType;
  electricalService: string;
  hasPool: boolean;
  hasEV: boolean;
}

export interface EnergyData {
  monthlyBill: number | null;
  annualKwhUsage: number | null;
  utilityProvider: string;
  billFiles: File[];
}

export interface DesignData {
  designType: DesignType | null;
  notes: string;
}

const STEP_NAMES = ['Contact', 'Home', 'Energy', 'Design', 'Review'] as const;

export function useLeadWizard() {
  const router = useRouter();
  const leadStore = useLeadStore();

  const currentStep = ref(1);
  const submitting = ref(false);

  const contactData = ref<ContactData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    source: null,
  });

  const homeData = ref<HomeData>({
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    lat: null,
    lng: null,
    roofCondition: null,
    propertyType: PropertyType.RESIDENTIAL,
    electricalService: '200A',
    hasPool: false,
    hasEV: false,
  });

  const energyData = ref<EnergyData>({
    monthlyBill: null,
    annualKwhUsage: null,
    utilityProvider: '',
    billFiles: [],
  });

  const designData = ref<DesignData>({
    designType: null,
    notes: '',
  });

  // --- Validation ---

  const isStep1Valid = computed(() => {
    const c = contactData.value;
    return (
      c.firstName.trim().length > 0 &&
      c.lastName.trim().length > 0 &&
      c.phone.replace(/\D/g, '').length >= 10
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

  // All required fields filled + design type selected
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
    const cond = homeData.value.roofCondition;
    if (!cond) return 0;
    return ROOF_SCORE_MAP[cond] ?? 0;
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
    const c = contactData.value;
    if (c.firstName.trim()) score += 30;
    if (c.lastName.trim()) score += 20;
    if (c.phone.replace(/\D/g, '').length >= 10) score += 30;
    if (c.email.trim()) score += 10;
    if (c.source) score += 10;
    return score;
  });

  const propertyScore = computed(() => {
    let score = 0;
    const h = homeData.value;
    if (h.streetAddress.trim()) score += 40;
    if (h.city.trim()) score += 15;
    if (h.state.trim()) score += 10;
    if (h.zip.trim()) score += 10;
    if (h.electricalService) score += 15;
    if (h.propertyType) score += 10;
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
    if (currentStep.value < 5 && isStepValid(currentStep.value)) {
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
      const payload = {
        contact: {
          firstName: contactData.value.firstName.trim(),
          lastName: contactData.value.lastName.trim(),
          phone: contactData.value.phone,
          email: contactData.value.email || 'noemail@placeholder.com',
          source: contactData.value.source ?? LeadSource.OTHER,
        },
        home: {
          streetAddress: homeData.value.streetAddress,
          city: homeData.value.city,
          state: homeData.value.state,
          zip: homeData.value.zip,
          latitude: homeData.value.lat ?? undefined,
          longitude: homeData.value.lng ?? undefined,
          roofCondition: homeData.value.roofCondition ?? RoofCondition.UNKNOWN,
          propertyType: homeData.value.propertyType,
          electricalService: homeData.value.electricalService || undefined,
          hasPool: homeData.value.hasPool,
          hasEV: homeData.value.hasEV,
        },
        energy: {
          monthlyBill: energyData.value.monthlyBill ?? undefined,
          annualKwhUsage: energyData.value.annualKwhUsage ?? undefined,
          utilityProvider: energyData.value.utilityProvider || undefined,
        },
        design: {
          designType: designData.value.designType ?? DesignType.MANUAL_DESIGN,
          designNotes: designData.value.notes || undefined,
        },
      };
      const lead = await leadStore.createLead(payload);
      router.push(`/crm/leads/${lead.id}`);
      return lead;
    } finally {
      submitting.value = false;
    }
  }

  return {
    currentStep,
    submitting,
    contactData,
    homeData,
    energyData,
    designData,
    isStep1Valid,
    isStep2Valid,
    isStep3Valid,
    isStep4Valid,
    isStep5Valid,
    canSubmit,
    isStepValid,
    roofScore,
    energyScore,
    contactScore,
    propertyScore,
    scorePreview,
    scoreTier,
    nextStep,
    prevStep,
    goToStep,
    submitLead,
    STEP_NAMES,
  };
}
