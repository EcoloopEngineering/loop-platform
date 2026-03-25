<template>
  <div class="login-form">
    <h5 class="login-title">Welcome Back</h5>
    <p class="login-subtitle">Sign in to your account</p>

    <q-form @submit.prevent="handleLogin">
      <div class="form-fields">
        <e-input
          v-model="email"
          label="Email"
          type="email"
          :rules="[(v: string) => !!v || 'Email is required']"
        />

        <e-input
          v-model="password"
          label="Password"
          :type="showPassword ? 'text' : 'password'"
          :rules="[(v: string) => !!v || 'Password is required']"
        >
          <template #append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              color="grey-5"
              size="20px"
              @click="showPassword = !showPassword"
            />
          </template>
        </e-input>
      </div>

      <div class="text-right q-mt-xs q-mb-md">
        <router-link to="/auth/forgot-password" class="forgot-link">
          Forgot Password?
        </router-link>
      </div>

      <e-btn type="submit" label="Log In" :loading="loading" class="full-width" size="lg" />

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
      />

      <div class="text-center q-mt-lg">
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
const showPassword = ref(false);
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
.login-form {
  max-width: 100%;
}

.login-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  text-align: center;
  letter-spacing: -0.02em;
}

.login-subtitle {
  margin: 0 0 28px 0;
  font-size: 14px;
  color: #9CA3AF;
  text-align: center;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  margin: 20px 0;
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
  letter-spacing: 0.05em;
}

.text-hint {
  color: #9CA3AF;
  font-size: 14px;
}

.google-btn {
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 500;
  min-height: 44px;
  transition: all 150ms ease;

  &:hover {
    border-color: #D1D5DB;
    background: #F9FAFB;
  }
}
</style>
