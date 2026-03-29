<template>
  <div>
    <h5 class="q-mt-none q-mb-md text-weight-bold text-center">Reset Password</h5>
    <p class="text-grey-6 text-center q-mb-lg">
      Enter your email and we'll send you a link to reset your password.
    </p>

    <q-form @submit.prevent="handleReset" class="q-gutter-md">
      <e-input
        v-model="email"
        label="Email"
        type="email"
        :rules="[(v: string) => !!v || 'Email is required']"
      />

      <e-btn type="submit" label="Send Reset Link" :loading="loading" class="full-width" />

      <div class="text-center q-mt-md">
        <router-link to="/auth/login" class="text-primary text-weight-medium">
          Back to Login
        </router-link>
      </div>
    </q-form>

    <q-banner v-if="success" class="bg-positive text-white q-mt-md" rounded>
      If an account exists with that email, a reset link has been sent. Check your inbox.
    </q-banner>

    <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded>
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import EBtn from '@/components/common/EBtn.vue';
import EInput from '@/components/common/EInput.vue';

const authStore = useAuthStore();

const email = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);

async function handleReset() {
  loading.value = true;
  error.value = '';
  success.value = false;
  try {
    await authStore.resetPassword(email.value);
    success.value = true;
  } catch (err: unknown) {
    error.value = (err as Error).message || 'Failed to send reset link.';
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
</style>
