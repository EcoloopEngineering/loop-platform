<template>
  <div class="reset-page">
    <div class="reset-card">
      <img src="/logo_short_dark.svg" alt="ecoLoop" class="reset-logo" />

      <template v-if="!success">
        <div class="reset-title">Set new password</div>
        <div class="reset-sub">Enter your new password for the Customer Portal.</div>

        <q-banner v-if="!token" class="bg-negative text-white q-mb-md" rounded dense style="font-size: 13px">
          Invalid reset link. Please request a new one.
        </q-banner>

        <q-form v-else @submit.prevent="handleReset" class="form-fields">
          <q-input v-model="password" label="New Password" :type="showPass ? 'text' : 'password'" outlined dense class="reset-input"
            :rules="[v => !!v || 'Required', v => v?.length >= 8 || 'Min 8 characters']">
            <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
            <template #append>
              <q-icon :name="showPass ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showPass = !showPass" />
            </template>
          </q-input>
          <q-input v-model="confirmPassword" label="Confirm Password" :type="showConfirm ? 'text' : 'password'" outlined dense class="reset-input"
            :rules="[v => v === password || 'Passwords do not match']">
            <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
            <template #append>
              <q-icon :name="showConfirm ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showConfirm = !showConfirm" />
            </template>
          </q-input>

          <q-btn unelevated no-caps color="primary" label="Reset Password" type="submit" :loading="loading" class="full-width reset-btn" />

          <q-banner v-if="error" class="bg-negative text-white q-mt-sm" rounded dense style="font-size: 13px">
            {{ error }}
          </q-banner>
        </q-form>
      </template>

      <template v-else>
        <q-icon name="check_circle" size="56px" color="positive" class="q-mb-md" />
        <div class="reset-title">Password updated!</div>
        <div class="reset-sub">Your password has been changed. You can now sign in.</div>
        <q-btn unelevated no-caps color="primary" label="Sign In" class="full-width reset-btn q-mt-lg" @click="$router.push('/portal/login')" />
      </template>

      <div class="reset-footer">
        <router-link to="/portal/login" class="back-link">← Back to Sign In</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();

let previousDarkMode = false;
onMounted(() => {
  previousDarkMode = $q.dark.isActive;
  $q.dark.set(false);
});

const token = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const showPass = ref(false);
const showConfirm = ref(false);
const error = ref('');
const success = ref(false);

token.value = route.query.token as string ?? '';

async function handleReset() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/portal/auth/reset-password', {
      token: token.value,
      password: password.value,
    });
    if (data.statusCode === 400) {
      error.value = data.message;
      return;
    }
    success.value = true;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Reset failed. The link may have expired.';
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.reset-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F8FAFB;
  padding: 24px;
}

.reset-card {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
  text-align: center;

  @media (max-width: 480px) {
    padding: 36px 24px;
    border-radius: 16px;
  }
}

.reset-logo {
  height: 40px;
  margin-bottom: 24px;
}

.reset-title {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.reset-sub {
  font-size: 14px;
  color: #9CA3AF;
  margin-bottom: 24px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
}

.reset-input {
  :deep(.q-field__control) {
    border-radius: 10px;
    min-height: 44px;
  }
}

.reset-btn {
  border-radius: 10px;
  font-weight: 600;
  min-height: 46px;
  font-size: 15px;
}

.reset-footer {
  margin-top: 28px;
}

.back-link {
  font-size: 13px;
  color: #9CA3AF;
  text-decoration: none;
  font-weight: 500;

  &:hover { color: #6B7280; }
}
</style>
