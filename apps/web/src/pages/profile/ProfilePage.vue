<template>
  <q-page class="q-pa-md">
    <EHeader title="Profile" />

    <!-- Loading -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="error" class="bg-negative text-white q-ma-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

    <template v-else>
    <div class="column items-center q-mt-lg q-mb-xl">
      <q-avatar size="80px" color="primary" text-color="white" class="cursor-pointer" @click="uploadAvatar">
        <q-img v-if="form.avatarUrl" :src="form.avatarUrl" />
        <span v-else class="text-h5 text-weight-bold">{{ userInitials }}</span>
        <q-badge floating color="grey-8" class="avatar-badge">
          <q-icon name="camera_alt" size="12px" />
        </q-badge>
      </q-avatar>
    </div>

    <q-form @submit.prevent="save" class="q-gutter-y-md">
      <EInput v-model="form.name" label="Full Name" :rules="[required]" />
      <EInput v-model="form.email" label="Email" type="email" disable />
      <EInput
        v-model="form.phone"
        label="Phone"
        type="tel"
        mask="(###) ###-####"
        unmasked-value
        :rules="[(v: string) => !v || /^\d{10,15}$/.test(v) || 'Enter a valid phone number']"
      />

      <q-select
        v-model="form.language"
        :options="languageOptions"
        label="Language"
        emit-value
        map-options
        outlined
        dense
        class="rounded-select"
      />

      <q-separator class="q-my-md" />

      <div class="text-subtitle2 text-weight-bold q-mb-sm">Bank Information</div>
      <EInput v-model="form.bankName" label="Bank Name" />
      <EInput v-model="form.accountNumber" label="Account Number" />
      <EInput v-model="form.routingNumber" label="Routing Number" />

    </q-form>

    <!-- Appearance -->
    <q-card flat class="q-mb-md q-mt-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Appearance</div>
        <q-toggle v-model="darkMode" label="Dark mode" @update:model-value="toggleDarkMode" />
      </q-card-section>
    </q-card>

    <!-- Notification Preferences -->
    <q-card flat class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Delivery Channels</div>
        <div class="row q-gutter-md">
          <q-toggle v-model="emailNotifications" label="Email notifications" @update:model-value="saveNotificationPrefs" />
          <q-toggle v-model="pushNotifications" label="Push notifications" @update:model-value="saveNotificationPrefs" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Coins Balance -->
    <q-card flat class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Rewards</div>
        <div class="row items-center q-gutter-md">
          <q-icon name="monetization_on" size="36px" color="amber" />
          <div>
            <div class="text-h4 text-weight-bold">{{ coinBalance }}</div>
            <div class="text-caption text-grey">Available coins</div>
          </div>
          <q-btn flat color="primary" label="Visit Store" to="/admin/rewards" no-caps />
        </div>
      </q-card-section>
    </q-card>

    <!-- Save button at bottom -->
    <div class="q-mt-lg q-mb-xl">
      <EBtn :loading="saving" class="full-width" @click="save">
        Save Changes
      </EBtn>
    </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user.store';
import { api } from '@/boot/axios';
import { API_URL } from '@/config/api';
import EHeader from '@/components/common/EHeader.vue';
import EInput from '@/components/common/EInput.vue';
import EBtn from '@/components/common/EBtn.vue';
import { useQuasar } from 'quasar';

const userStore = useUserStore();
const $q = useQuasar();
const loading = ref(true);
const error = ref<string | null>(null);
const saving = ref(false);
const darkMode = ref($q.dark.isActive);
const emailNotifications = ref(true);
const pushNotifications = ref(false);
const coinBalance = ref(0);

const form = ref({
  name: '',
  email: '',
  phone: '',
  avatarUrl: '',
  language: 'en',
  bankName: '',
  accountNumber: '',
  routingNumber: '',
});

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'Portuguese', value: 'pt' },
];

const userInitials = computed(() => {
  return (form.value.name || '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
});

const required = (val: string) => !!val || 'Required';

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get('/users/me');
    form.value.name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
    form.value.email = data.email ?? '';
    form.value.phone = data.phone ?? '';
    const img = data.profileImage ?? '';
    // Convert relative API path to full URL
    form.value.avatarUrl = img.startsWith('/api/')
      ? `${API_URL}${img}`
      : img;
    form.value.language = data.language ?? 'en';
    emailNotifications.value = data.emailNotifications ?? true;
    pushNotifications.value = data.pushNotifications ?? false;
    if (data.darkMode !== undefined) {
      darkMode.value = data.darkMode;
      $q.dark.set(data.darkMode);
    }
  } catch {
    // Use store defaults
    if (userStore.user) {
      form.value.name = userStore.user.name;
      form.value.email = userStore.user.email;
      form.value.phone = userStore.user.phone ?? '';
    } else {
      error.value = 'Failed to load profile. Please try again.';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
  loadCoinBalance();
});

async function save() {
  saving.value = true;
  try {
    const [firstName, ...rest] = form.value.name.split(' ');
    await api.put('/users/me', {
      firstName: firstName || form.value.name,
      lastName: rest.join(' ') || '',
      phone: form.value.phone || undefined,
      language: form.value.language,
    });

    $q.notify({ type: 'positive', message: 'Profile updated!' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save profile.' });
  } finally {
    saving.value = false;
  }
}

function toggleDarkMode(val: boolean) {
  $q.dark.set(val);
  localStorage.setItem('darkMode', val ? '1' : '0');
  api.put('/users/me', { darkMode: val }).catch(() => {});
}

async function saveNotificationPrefs() {
  try {
    await api.put('/users/me', {
      emailNotifications: emailNotifications.value,
      pushNotifications: pushNotifications.value,
    });
    $q.notify({ type: 'positive', message: 'Notification preferences updated!' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update notification preferences.' });
  }
}

async function loadCoinBalance() {
  try {
    const { data } = await api.get('/gamification/balance');
    coinBalance.value = data.balance ?? data.coins ?? 0;
  } catch {
    coinBalance.value = 0;
  }
}

function uploadAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      $q.notify({ type: 'warning', message: 'Image must be less than 5MB' });
      return;
    }

    try {
      const fd = new FormData();
      fd.append('avatar', file);

      const { data } = await api.post<{ url: string }>('/users/me/avatar', fd);
      // Convert relative path to full URL for display
      form.value.avatarUrl = data.url.startsWith('/api/')
        ? `${API_URL}${data.url}`
        : data.url;
      $q.notify({ type: 'positive', message: 'Avatar updated!' });
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to upload avatar.' });
    }
  };
  input.click();
}
</script>

<style lang="scss" scoped>
.avatar-badge {
  padding: 4px;
  border-radius: 50%;
}
.rounded-select {
  :deep(.q-field__control) {
    border-radius: 12px;
  }
}
</style>
