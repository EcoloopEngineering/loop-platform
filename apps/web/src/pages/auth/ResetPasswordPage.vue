<template>
  <div>
    <h5 class="form-title">Set New Password</h5>
    <p class="form-subtitle">Enter your new password below</p>

    <q-form @submit.prevent="handleReset" class="form-fields">
      <q-input v-model="password" label="New Password" :type="showPass ? 'text' : 'password'" outlined dense class="auth-input" :rules="[(v: string) => !!v || 'Required', (v: string) => v.length >= 8 || 'Min 8 characters']">
        <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
        <template #append>
          <q-icon :name="showPass ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showPass = !showPass" />
        </template>
      </q-input>

      <q-input v-model="confirmPassword" label="Confirm Password" :type="showConfirm ? 'text' : 'password'" outlined dense class="auth-input" :rules="[(v: string) => v === password || 'Passwords do not match']">
        <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
        <template #append>
          <q-icon :name="showConfirm ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showConfirm = !showConfirm" />
        </template>
      </q-input>

      <q-btn unelevated no-caps color="primary" label="Reset Password" type="submit" :loading="loading" class="full-width submit-btn" />
    </q-form>

    <q-banner v-if="success" class="bg-positive text-white q-mt-md" rounded dense style="font-size: 13px">
      Password reset successfully! <router-link to="/auth/login" class="text-white text-weight-bold">Sign in now</router-link>
    </q-banner>

    <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded dense style="font-size: 13px">
      {{ error }}
    </q-banner>

    <div class="text-center q-mt-lg">
      <router-link to="/auth/login" class="text-primary text-weight-medium">Back to Login</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/boot/axios';

const route = useRoute();
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const showPass = ref(false);
const showConfirm = ref(false);
const error = ref('');
const success = ref(false);

async function handleReset() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const token = route.query.token as string;
    if (!token) {
      error.value = 'Invalid reset link. Please request a new one.';
      return;
    }
    await api.post('/auth/reset-password', {
      token,
      password: password.value,
    });
    success.value = true;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Reset failed. The link may have expired.';
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
  margin-top: 4px;
}
</style>
