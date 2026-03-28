<template>
  <div>
    <h5 class="form-title">Create Account</h5>
    <p class="form-subtitle">Join the ecoLoop platform</p>

    <q-form @submit.prevent="handleSignUp" class="form-fields">
      <q-input v-model="name" label="Full Name" outlined dense class="auth-input" :rules="[(v: string) => !!v || 'Name is required']">
        <template #prepend><q-icon name="person" color="grey-5" size="18px" /></template>
      </q-input>

      <q-input v-model="email" label="Email" type="email" outlined dense class="auth-input" :rules="[(v: string) => !!v || 'Email is required']">
        <template #prepend><q-icon name="email" color="grey-5" size="18px" /></template>
      </q-input>

      <!-- Referral info for external users -->
      <q-slide-transition>
        <div v-if="!isEcoloopEmail && email">
          <q-banner class="bg-blue-1 text-blue-9" rounded dense style="font-size: 12px">
            <template #avatar><q-icon name="group_add" color="blue-6" /></template>
            You're signing up as a <strong>Sales Partner</strong>.
          </q-banner>
        </div>
      </q-slide-transition>

      <q-input
        v-model="phone"
        label="Phone (optional)"
        type="tel"
        mask="(###) ###-####"
        unmasked-value
        inputmode="numeric"
        @keypress="onlyNumbers"
        outlined
        dense
        class="auth-input"
      >
        <template #prepend><q-icon name="phone" color="grey-5" size="18px" /></template>
      </q-input>

      <q-input
        v-model="password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        outlined
        dense
        class="auth-input"
        :rules="[(v: string) => !!v || 'Required', (v: string) => v.length >= 8 || 'Min 8 characters']"
      >
        <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
        <template #append>
          <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showPassword = !showPassword" />
        </template>
      </q-input>

      <q-input
        v-model="confirmPassword"
        label="Confirm Password"
        :type="showConfirmPassword ? 'text' : 'password'"
        outlined
        dense
        class="auth-input"
        :rules="[(v: string) => v === password || 'Passwords do not match']"
      >
        <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
        <template #append>
          <q-icon :name="showConfirmPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showConfirmPassword = !showConfirmPassword" />
        </template>
      </q-input>

      <q-btn unelevated no-caps color="primary" label="Create Account" type="submit" :loading="loading" class="full-width submit-btn" />

      <div class="text-center q-mt-md">
        <span class="text-hint">Already have an account? </span>
        <router-link to="/auth/login" class="text-primary text-weight-medium">Sign In</router-link>
      </div>
    </q-form>

    <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded dense style="font-size: 13px">
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

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

const isEcoloopEmail = computed(() => email.value.toLowerCase().endsWith('@ecoloop.us'));

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
.form-title {
  margin: 0 0 4px;
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  text-align: center;
  letter-spacing: -0.02em;
}

.form-subtitle {
  margin: 0 0 24px;
  font-size: 14px;
  color: #9CA3AF;
  text-align: center;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-input {
  :deep(.q-field__control) {
    border-radius: 10px;
    min-height: 44px;
  }
}

.submit-btn {
  border-radius: 10px;
  font-weight: 600;
  min-height: 46px;
  font-size: 15px;
  margin-top: 4px;
}

.text-hint {
  color: #9CA3AF;
  font-size: 14px;
}
</style>
