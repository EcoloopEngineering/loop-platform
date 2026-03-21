<template>
  <q-page class="q-pa-md">
    <EHeader title="Profile" />

    <div class="column items-center q-mt-md q-mb-lg">
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
      <EInput v-model="form.phone" label="Phone" type="tel" />

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

      <div class="q-mt-lg">
        <EBtn type="submit" :loading="saving" class="full-width">
          Save Changes
        </EBtn>
      </div>
    </q-form>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user.store';
import { api } from '@/boot/axios';
import EHeader from '@/components/common/EHeader.vue';
import EInput from '@/components/common/EInput.vue';
import EBtn from '@/components/common/EBtn.vue';
import { useQuasar } from 'quasar';

const userStore = useUserStore();
const $q = useQuasar();
const saving = ref(false);

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

onMounted(async () => {
  if (userStore.user) {
    form.value.name = userStore.user.name;
    form.value.email = userStore.user.email;
    form.value.phone = userStore.user.phone ?? '';
    form.value.avatarUrl = userStore.user.avatarUrl ?? '';
  }

  try {
    const { data } = await api.get('/users/me/profile');
    form.value.language = data.language ?? 'en';
    form.value.bankName = data.bankName ?? '';
    form.value.accountNumber = data.accountNumber ?? '';
    form.value.routingNumber = data.routingNumber ?? '';
  } catch {
    // Use defaults
  }
});

async function save() {
  saving.value = true;
  try {
    await userStore.updateUser({
      name: form.value.name,
      phone: form.value.phone || undefined,
    });

    await api.patch('/users/me/profile', {
      language: form.value.language,
      bankName: form.value.bankName,
      accountNumber: form.value.accountNumber,
      routingNumber: form.value.routingNumber,
    });

    $q.notify({ type: 'positive', message: 'Profile updated!' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save profile.' });
  } finally {
    saving.value = false;
  }
}

function uploadAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { data } = await api.post<{ url: string }>('/users/me/avatar', fd);
      form.value.avatarUrl = data.url;
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
