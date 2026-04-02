<template>
  <q-dialog :model-value="modelValue" persistent no-backdrop-dismiss no-esc-dismiss>
    <q-card class="terms-card">
      <q-card-section class="terms-header">
        <div class="terms-icon-wrap">
          <q-icon name="gavel" size="28px" color="primary" />
        </div>
        <h5 class="terms-title">Terms of Service</h5>
        <p class="terms-subtitle">Please review and accept our terms to continue using the ecoLoop platform.</p>
      </q-card-section>

      <q-separator />

      <q-card-section class="terms-body" @scroll="onScroll">
        <div class="terms-content">
          <h6>1. Acceptance of Terms</h6>
          <p>
            By accessing and using the ecoLoop platform, you agree to be bound by these Terms of Service
            and all applicable laws and regulations. If you do not agree with any of these terms, you are
            prohibited from using or accessing this platform.
          </p>

          <h6>2. Use of Platform</h6>
          <p>
            You are granted a limited, non-exclusive, non-transferable license to use the ecoLoop platform
            for its intended purpose of managing solar energy leads, referrals, and related business activities.
            You agree not to misuse the platform or help anyone else do so.
          </p>

          <h6>3. Account Responsibilities</h6>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all
            activities that occur under your account. You must notify ecoLoop immediately of any unauthorized
            use of your account.
          </p>

          <h6>4. Data Privacy & Confidentiality</h6>
          <p>
            You agree to handle all customer data, lead information, and business data accessed through the
            platform with strict confidentiality. You shall not share, sell, or distribute any customer or
            business data obtained through the platform to third parties without explicit written consent
            from ecoLoop.
          </p>

          <h6>5. Commission & Referral Terms</h6>
          <p>
            Commission rates and referral bonuses are subject to ecoLoop's current commission structure.
            ecoLoop reserves the right to modify commission rates with 30 days written notice. Commissions
            are earned upon successful deal closure and are subject to verification.
          </p>

          <h6>6. Prohibited Conduct</h6>
          <p>
            You agree not to: (a) submit false or misleading lead information; (b) engage in any fraudulent
            activity; (c) interfere with the platform's operation; (d) attempt to access other users' accounts
            or data; (e) use the platform for any unlawful purpose.
          </p>

          <h6>7. Termination</h6>
          <p>
            ecoLoop reserves the right to suspend or terminate your account at any time for violation of
            these terms or for any conduct that ecoLoop, in its sole discretion, considers harmful to the
            platform or other users.
          </p>

          <h6>8. Limitation of Liability</h6>
          <p>
            ecoLoop shall not be liable for any indirect, incidental, special, consequential, or punitive
            damages arising from your use of the platform. Our total liability shall not exceed the amount
            of commissions paid to you in the preceding 12 months.
          </p>

          <h6>9. Changes to Terms</h6>
          <p>
            ecoLoop reserves the right to update these terms at any time. Continued use of the platform
            after changes constitutes acceptance of the new terms. Material changes will be communicated
            via email or platform notification.
          </p>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="terms-footer">
        <q-checkbox v-model="accepted" label="I have read and agree to the Terms of Service" color="primary" class="terms-check" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          label="Accept & Continue"
          :disable="!accepted"
          :loading="loading"
          class="full-width accept-btn q-mt-md"
          @click="handleAccept"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/boot/axios';
import { useUserStore } from '@/stores/user.store';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'accepted'): void;
}>();

const userStore = useUserStore();
const accepted = ref(false);
const loading = ref(false);

function onScroll(evt: Event) {
  const el = evt.target as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
    // User scrolled to bottom — could auto-check, but we let them do it manually
  }
}

async function handleAccept() {
  loading.value = true;
  try {
    await api.post('/users/me/accept-terms');
    await userStore.loadUser();
    emit('update:modelValue', false);
    emit('accepted');
  } catch {
    // Silently retry on next click
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.terms-card {
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  max-height: 90dvh;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.terms-header {
  text-align: center;
  padding: 24px 24px 16px;
  flex-shrink: 0;

  @media (max-height: 600px) {
    padding: 16px 16px 12px;
  }
}

.terms-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 137, 123, 0.08), rgba(0, 105, 92, 0.12));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  @media (max-height: 600px) {
    width: 40px;
    height: 40px;
    margin-bottom: 8px;
  }
}

.terms-title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: #111827;

  @media (max-height: 600px) {
    font-size: 18px;
  }
}

.terms-subtitle {
  margin: 0;
  font-size: 14px;
  color: #6B7280;
  line-height: 1.5;

  @media (max-height: 600px) {
    font-size: 12px;
  }
}

.terms-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
  -webkit-overflow-scrolling: touch;

  @media (max-height: 600px) {
    padding: 12px 16px;
  }
}

.terms-content {
  h6 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 700;
    color: #111827;

    &:not(:first-child) {
      margin-top: 20px;
    }
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #4B5563;
    line-height: 1.65;
  }
}

.terms-footer {
  padding: 16px 24px 20px;
  flex-shrink: 0;

  @media (max-height: 600px) {
    padding: 12px 16px 16px;
  }
}

.terms-check {
  :deep(.q-checkbox__label) {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }
}

.accept-btn {
  border-radius: 10px;
  font-weight: 600;
  min-height: 46px;
  font-size: 15px;
}
</style>
