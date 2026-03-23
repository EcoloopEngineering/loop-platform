<template>
  <div>
    <h5 class="q-mt-none q-mb-lg text-weight-bold text-center" style="color: #1A1A2E">Create Account</h5>

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
        @update:model-value="onEmailChange"
      />

      <!-- Role selection: only for @ecoloop.us emails -->
      <q-slide-transition>
        <div v-if="isEcoloopEmail">
          <div class="text-caption text-grey-7 q-mb-xs">What's your role?</div>
          <div class="row q-gutter-sm">
            <q-btn
              v-for="opt in roleOptions"
              :key="opt.value"
              :outline="selectedRole !== opt.value"
              :unelevated="selectedRole === opt.value"
              :color="selectedRole === opt.value ? 'primary' : 'grey-5'"
              :text-color="selectedRole === opt.value ? 'white' : 'grey-8'"
              no-caps
              class="col role-btn"
              @click="selectedRole = opt.value"
            >
              <div class="column items-center q-pa-xs">
                <q-icon :name="opt.icon" size="24px" class="q-mb-xs" />
                <span class="text-weight-medium" style="font-size: 13px">{{ opt.label }}</span>
                <span class="text-caption" style="font-size: 10px; opacity: 0.8">{{ opt.description }}</span>
              </div>
            </q-btn>
          </div>
        </div>
      </q-slide-transition>

      <!-- Referral info for external users -->
      <q-slide-transition>
        <div v-if="!isEcoloopEmail && email">
          <q-banner class="bg-blue-1 text-blue-9" rounded dense style="font-size: 12px">
            <template #avatar><q-icon name="group_add" color="blue-6" /></template>
            You're signing up as a <strong>Sales Partner</strong>. Leads you create will be linked to the ecoLoop rep who invited you.
          </q-banner>
        </div>
      </q-slide-transition>

      <e-input
        v-model="phone"
        label="Phone (optional)"
        type="tel"
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
        <span class="text-hint">Already have an account? </span>
        <router-link to="/auth/login" class="text-primary text-weight-medium">Log In</router-link>
      </div>
    </q-form>

    <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded>
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import EBtn from '@/components/common/EBtn.vue';
import EInput from '@/components/common/EInput.vue';

const props = defineProps<{ code?: string }>();

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const name = ref('');
const email = ref('');
const phone = ref('');
const password = ref('');
const confirmPassword = ref('');
const selectedRole = ref('SALES_REP');
const loading = ref(false);
const error = ref('');

const isEcoloopEmail = computed(() => {
  return email.value.toLowerCase().endsWith('@ecoloop.us');
});

const roleOptions = [
  { label: 'Sales Rep', value: 'SALES_REP', icon: 'sell', description: 'Close deals' },
  { label: 'Project Manager', value: 'MANAGER', icon: 'engineering', description: 'Manage installs' },
];

function onEmailChange() {
  if (!isEcoloopEmail.value) {
    selectedRole.value = 'SALES_REP';
  }
}

async function handleSignUp() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const inviteCode = props.code || (route.query.ref as string) || undefined;
    await authStore.signUp(email.value, password.value, {
      name: name.value,
      phone: phone.value || undefined,
      role: isEcoloopEmail.value ? selectedRole.value : 'SALES_REP',
      inviteCode,
    });
    router.push('/home');
  } catch (err: unknown) {
    error.value = (err as Error).message || 'Sign up failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.text-hint {
  color: #9CA3AF;
}

.role-btn {
  border-radius: 12px !important;
  padding: 8px !important;
  min-height: 80px;
}
</style>
