<template>
  <q-form @submit.prevent="handleLogin" class="form-fields">
    <q-input v-model="email" label="Email" type="email" outlined dense class="portal-input" :rules="[v => !!v || 'Required']">
      <template #prepend><q-icon name="email" color="grey-5" size="18px" /></template>
    </q-input>
    <q-input v-model="password" label="Password" :type="showPass ? 'text' : 'password'" outlined dense class="portal-input" :rules="[v => !!v || 'Required']">
      <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
      <template #append>
        <q-icon :name="showPass ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showPass = !showPass" />
      </template>
    </q-input>
    <div class="forgot-link-row">
      <span class="forgot-link" @click="$emit('forgot')">Forgot password?</span>
    </div>
    <q-btn unelevated no-caps color="primary" label="Sign In" type="submit" :loading="loading" class="full-width submit-btn" />
  </q-form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { usePortalAuthStore } from '@/stores/portal-auth.store';

const emit = defineEmits<{
  (e: 'forgot'): void;
  (e: 'error', msg: string): void;
}>();

const router = useRouter();
const portalAuth = usePortalAuthStore();

const email = ref('');
const password = ref('');
const showPass = ref(false);
const loading = ref(false);

async function handleLogin() {
  loading.value = true;
  emit('error', '');
  try {
    await portalAuth.login(email.value, password.value);
    if (portalAuth.error) {
      emit('error', portalAuth.error);
      return;
    }
    router.push('/portal');
  } catch {
    emit('error', portalAuth.error || 'Invalid email or password.');
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.portal-input {
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

.forgot-link-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -4px;
}

.forgot-link {
  font-size: 13px;
  color: #00897B;
  font-weight: 500;
  cursor: pointer;

  &:hover { text-decoration: underline; }
}
</style>
