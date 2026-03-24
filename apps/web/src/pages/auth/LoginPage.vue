<template>
  <div>
    <h5 class="q-mt-none q-mb-md text-weight-bold text-center" style="color: #1A1A2E; font-size: 24px">Welcome Back</h5>
    <div class="text-center text-grey-6 q-mb-lg" style="font-size: 14px">Sign in to your account</div>

    <q-form @submit.prevent="handleLogin" class="q-gutter-md">
      <e-input
        v-model="email"
        label="Email"
        type="email"
        :rules="[(v: string) => !!v || 'Email is required']"
      />

      <e-input
        v-model="password"
        label="Password"
        type="password"
        :rules="[(v: string) => !!v || 'Password is required']"
      />

      <div class="text-right">
        <router-link to="/auth/forgot-password" class="text-primary text-caption">
          Forgot Password?
        </router-link>
      </div>

      <e-btn type="submit" label="Log In" :loading="loading" class="full-width" />

      <q-separator class="q-my-md" />

      <q-btn
        outline
        color="grey-7"
        icon="img:https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        label="Continue with Google"
        class="full-width google-btn"
        @click="handleGoogleLogin"
        :loading="googleLoading"
        no-caps
      />

      <div class="text-center q-mt-md">
        <span class="text-hint">Don't have an account? </span>
        <router-link to="/auth/signup" class="text-primary text-weight-medium">Sign Up</router-link>
      </div>
    </q-form>

    <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded>
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useUserStore } from '@/stores/user.store';
import EBtn from '@/components/common/EBtn.vue';
import EInput from '@/components/common/EInput.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const userStore = useUserStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const googleLoading = ref(false);
const error = ref('');

async function handleLogin() {
  loading.value = true;
  error.value = '';
  try {
    await authStore.login(email.value, password.value);
    await userStore.loadUser();
    const redirect = (route.query.redirect as string) || '/home';
    router.push(redirect);
  } catch (err: any) {
    const status = err?.response?.status;
    const apiMsg = err?.response?.data?.message;
    if (status === 401) {
      error.value = 'Invalid email or password. Please try again.';
    } else if (status === 429) {
      error.value = 'Too many login attempts. Please wait a moment.';
    } else if (apiMsg && !apiMsg.includes('status code')) {
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
  } catch (err: any) {
    const apiMsg = err?.response?.data?.message;
    error.value = apiMsg && !apiMsg.includes('status code')
      ? apiMsg
      : 'Google login is not available. Please use email and password.';
  } finally {
    googleLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.text-hint {
  color: #9CA3AF;
}

.google-btn {
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 500;
  transition: all 150ms ease;

  &:hover {
    border-color: #D1D5DB;
    background: #F9FAFB;
  }
}
</style>
