<template>
  <q-form @submit.prevent="handleRegister" class="form-fields">
    <div class="name-row">
      <q-input v-model="firstName" label="First Name" outlined dense class="portal-input" :rules="[v => !!v || 'Required']" />
      <q-input v-model="lastName" label="Last Name" outlined dense class="portal-input" :rules="[v => !!v || 'Required']" />
    </div>
    <q-input v-model="email" label="Email" type="email" outlined dense class="portal-input"
      :rules="[v => !!v || 'Required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
      hint="Use the email your installer has on file. Your project links automatically">
      <template #prepend><q-icon name="email" color="grey-5" size="18px" /></template>
    </q-input>
    <q-input v-model="phone" label="Phone" mask="(###) ###-####" unmasked-value outlined dense class="portal-input"
      :rules="[v => !!v || 'Required', v => v && v.length >= 10 || 'Enter a valid 10-digit number']">
      <template #prepend><q-icon name="phone" color="grey-5" size="18px" /></template>
    </q-input>
    <q-input v-model="password" label="Password" :type="showPass ? 'text' : 'password'" outlined dense class="portal-input"
      :rules="[v => !!v || 'Required', v => v?.length >= 8 || 'Min 8 characters']">
      <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
      <template #append>
        <q-icon :name="showPass ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showPass = !showPass" />
      </template>
    </q-input>
    <q-btn unelevated no-caps color="primary" label="Create Account" type="submit" :loading="loading" class="full-width submit-btn" />
  </q-form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { usePortalAuthStore } from '@/stores/portal-auth.store';

const emit = defineEmits<{
  (e: 'error', msg: string): void;
}>();

const router = useRouter();
const portalAuth = usePortalAuthStore();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const phone = ref('');
const password = ref('');
const showPass = ref(false);
const loading = ref(false);

async function handleRegister() {
  loading.value = true;
  emit('error', '');
  try {
    await portalAuth.register({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      phone: phone.value,
      password: password.value,
    });
    if (portalAuth.error) {
      emit('error', portalAuth.error);
      return;
    }
    router.push('/portal');
  } catch {
    emit('error', portalAuth.error || 'Registration failed.');
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

.name-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
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
