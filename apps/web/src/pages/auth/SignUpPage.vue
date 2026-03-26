<template>
  <div>
    <h5 class="signup-title">Create Account</h5>
    <p class="signup-subtitle">Join the ecoLoop platform</p>

    <q-form @submit.prevent="handleSignUp" class="signup-form">
      <e-input
        v-model="name"
        label="Full Name"
        :rules="[(v: string) => !!v || 'Name is required']"
      />

      <e-input
        v-model="email"
        label="Email"
        type="email"
        :rules="[(v: string) => !!v || 'Email is required']"
      />

      <!-- Referral info for external users -->
      <q-slide-transition>
        <div v-if="!isEcoloopEmail && email">
          <q-banner class="bg-blue-1 text-blue-9" rounded dense style="font-size: 12px">
            <template #avatar><q-icon name="group_add" color="blue-6" /></template>
            You're signing up as a <strong>Sales Partner</strong>. Leads you create will be linked to the ecoLoop rep who invited you.
          </q-banner>
        </div>
      </q-slide-transition>

      <e-input
        v-model="phone"
        label="Phone (optional)"
        type="tel"
        mask="(###) ###-####"
        unmasked-value
        inputmode="numeric"
        @keypress="onlyNumbers"
        :rules="[
          (v: string) => !v || /^\d{10,15}$/.test(v) || 'Enter a valid phone number',
        ]"
      />

      <e-input
        v-model="password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        :rules="[
          (v: string) => !!v || 'Password is required',
          (v: string) => v.length >= 8 || 'Minimum 8 characters',
        ]"
      >
        <template #append>
          <q-icon
            :name="showPassword ? 'visibility_off' : 'visibility'"
            class="cursor-pointer" color="grey-5" size="20px"
            @click="showPassword = !showPassword"
          />
        </template>
      </e-input>

      <e-input
        v-model="confirmPassword"
        label="Confirm Password"
        :type="showConfirmPassword ? 'text' : 'password'"
        :rules="[(v: string) => v === password || 'Passwords do not match']"
      >
        <template #append>
          <q-icon
            :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
            class="cursor-pointer" color="grey-5" size="20px"
            @click="showConfirmPassword = !showConfirmPassword"
          />
        </template>
      </e-input>

      <e-btn type="submit" label="Sign Up" :loading="loading" class="full-width" />

      <div class="text-center q-mt-md">
        <span class="text-hint">Already have an account? </span>
        <router-link to="/auth/login" class="text-primary text-weight-medium">Log In</router-link>
      </div>
    </q-form>

    <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded>
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import EBtn from '@/components/common/EBtn.vue';
import EInput from '@/components/common/EInput.vue';

const props = defineProps<{ code?: string }>();

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const name = ref('');
const email = ref('');
const phone = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const error = ref('');

const isEcoloopEmail = computed(() => {
  return email.value.toLowerCase().endsWith('@ecoloop.us');
});

function onlyNumbers(evt: KeyboardEvent) {
  if (!/\d/.test(evt.key)) evt.preventDefault();
}

async function handleSignUp() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const inviteCode = props.code || (route.query.ref as string) || undefined;
    await authStore.signUp(email.value, password.value, {
      name: name.value,
      phone: phone.value || undefined,
      role: 'SALES_REP',
      inviteCode,
    });
    router.push('/home');
  } catch (err: unknown) {
    error.value = (err as Error).message || 'Sign up failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.signup-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  text-align: center;
  letter-spacing: -0.02em;
}

.signup-subtitle {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #9CA3AF;
  text-align: center;
}

.signup-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.text-hint {
  color: #9CA3AF;
  font-size: 14px;
}

</style>
