<template>
  <div>
    <h5 class="q-mt-none q-mb-lg text-weight-bold text-center" style="color: #1A1A2E">Welcome Back</h5>

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
        class="full-width"
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
import EBtn from '@/components/common/EBtn.vue';
import EInput from '@/components/common/EInput.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

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
    const redirect = (route.query.redirect as string) || '/home';
    router.push(redirect);
  } catch (err: unknown) {
    error.value = (err as Error).message || 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  googleLoading.value = true;
  error.value = '';
  try {
    await authStore.loginWithGoogle();
    const redirect = (route.query.redirect as string) || '/home';
    router.push(redirect);
  } catch (err: unknown) {
    error.value = (err as Error).message || 'Google login failed.';
  } finally {
    googleLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.text-hint {
  color: #9CA3AF;
}
</style>
