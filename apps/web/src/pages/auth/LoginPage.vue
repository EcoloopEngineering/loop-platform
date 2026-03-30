<template>
  <div>
    <h5 class="form-title">Welcome Back</h5>
    <p class="form-subtitle">Sign in to your account</p>

    <q-form @submit.prevent="handleLogin" class="form-fields">
      <q-input v-model="email" label="Email" type="email" outlined dense class="auth-input" aria-label="Email address" :rules="[(v: string) => !!v || 'Email is required']">
        <template #prepend><q-icon name="email" color="grey-5" size="18px" aria-hidden="true" /></template>
      </q-input>

      <q-input v-model="password" label="Password" :type="showPassword ? 'text' : 'password'" outlined dense class="auth-input" aria-label="Password" :rules="[(v: string) => !!v || 'Password is required']">
        <template #prepend><q-icon name="lock" color="grey-5" size="18px" aria-hidden="true" /></template>
        <template #append>
          <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" role="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" tabindex="0" @click="showPassword = !showPassword" @keyup.enter="showPassword = !showPassword" />
        </template>
      </q-input>

      <div class="text-right q-mt-xs">
        <router-link to="/auth/forgot-password" class="forgot-link">Forgot Password?</router-link>
      </div>

      <q-btn unelevated no-caps color="primary" label="Sign In" type="submit" :loading="loading" class="full-width submit-btn" aria-label="Sign in to your account" />

      <div class="divider-row">
        <div class="divider-line" />
        <span class="divider-text">or</span>
        <div class="divider-line" />
      </div>

      <q-btn
        outline
        color="grey-7"
        icon="img:https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        label="Continue with Google"
        class="full-width google-btn"
        @click="handleGoogleLogin"
        :loading="googleLoading"
        no-caps
        aria-label="Sign in with Google"
      />

      <div class="text-center q-mt-md">
        <span class="text-hint">Don't have an account? </span>
        <router-link to="/auth/signup" class="text-primary text-weight-medium">Sign Up</router-link>
      </div>

      <div class="text-center q-mt-sm">
        <span class="text-hint">Are you a client? </span>
        <router-link to="/portal/login" class="client-link">Click here</router-link>
      </div>
    </q-form>

    <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded dense style="font-size: 13px" role="alert">
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useUserStore } from '@/stores/user.store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const userStore = useUserStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const googleLoading = ref(false);
const showPassword = ref(false);
const error = ref('');

async function handleLogin() {
  loading.value = true;
  error.value = '';
  try {
    await authStore.login(email.value, password.value);
    await userStore.loadUser();
    const explicitRedirect = route.query.redirect as string;
    if (explicitRedirect) {
      router.push(explicitRedirect);
    } else {
      const role = userStore.user?.role;
      const roleRedirects: Record<string, string> = {
        ADMIN: '/crm',
        MANAGER: '/crm',
        SALES_REP: '/home',
        REFERRAL_PARTNER: '/home',
      };
      router.push(roleRedirects[role ?? ''] ?? '/home');
    }
  } catch (err: unknown) {
    const axErr = err as { response?: { status?: number; data?: { message?: string } } };
    const status = axErr?.response?.status;
    const apiMsg = axErr?.response?.data?.message;
    if (apiMsg?.includes('locked')) {
      error.value = 'Account temporarily locked. Please try again in 15 minutes.';
    } else if (status === 401 || status === 403) {
      error.value = 'Invalid email or password. Please try again.';
    } else if (status === 429) {
      error.value = 'Too many login attempts. Please wait a moment.';
    } else if (apiMsg && !apiMsg.includes('status code') && !apiMsg.includes('Request failed')) {
      error.value = apiMsg;
    } else {
      error.value = 'Unable to connect. Please check your internet and try again.';
    }
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  googleLoading.value = true;
  error.value = '';
  try {
    await authStore.loginWithGoogle();
    await userStore.loadUser();
    const redirect = (route.query.redirect as string) || '/home';
    router.push(redirect);
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: { message?: string } } };
    const apiMsg = axErr?.response?.data?.message;
    error.value = apiMsg && !apiMsg.includes('status code')
      ? apiMsg
      : 'Google login is not available. Please use email and password.';
  } finally {
    googleLoading.value = false;
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
  gap: 14px;
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
}

.forgot-link {
  font-size: 13px;
  color: #00897B;
  font-weight: 500;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.divider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #E5E7EB;
}

.divider-text {
  font-size: 12px;
  color: #9CA3AF;
  font-weight: 500;
  text-transform: uppercase;
}

.text-hint {
  color: #9CA3AF;
  font-size: 14px;
}

.google-btn {
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  font-weight: 500;
  min-height: 44px;
  &:hover { border-color: #D1D5DB; background: #F9FAFB; }
}

.client-link {
  font-size: 14px;
  color: #00897B;
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}
</style>
