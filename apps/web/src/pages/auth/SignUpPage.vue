<template>
  <div>
    <h5 class="q-mt-none q-mb-lg text-weight-bold text-center">Create Account</h5>

    <q-form @submit.prevent="handleSignUp" class="q-gutter-md">
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

      <e-input
        v-model="password"
        label="Password"
        type="password"
        :rules="[
          (v: string) => !!v || 'Password is required',
          (v: string) => v.length >= 8 || 'Minimum 8 characters',
        ]"
      />

      <e-input
        v-model="confirmPassword"
        label="Confirm Password"
        type="password"
        :rules="[(v: string) => v === password || 'Passwords do not match']"
      />

      <e-btn type="submit" label="Sign Up" :loading="loading" class="full-width" />

      <div class="text-center q-mt-md">
        <span class="text-grey-6">Already have an account? </span>
        <router-link to="/auth/login" class="text-primary text-weight-medium">Log In</router-link>
      </div>
    </q-form>

    <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded>
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import EBtn from '@/components/common/EBtn.vue';
import EInput from '@/components/common/EInput.vue';

defineProps<{ code?: string }>();

const router = useRouter();
const authStore = useAuthStore();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

async function handleSignUp() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    await authStore.signUp(email.value, password.value);
    router.push('/home');
  } catch (err: unknown) {
    error.value = (err as Error).message || 'Sign up failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>
