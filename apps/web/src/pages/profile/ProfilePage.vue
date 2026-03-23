<template>
  <q-page class="q-pa-md">
    <EHeader title="Profile" />

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
  try {
    const { data } = await api.get('/users/me');
    form.value.name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
    form.value.email = data.email ?? '';
    form.value.phone = data.phone ?? '';
    form.value.avatarUrl = data.profileImage ?? '';
    form.value.language = data.language ?? 'en';
  } catch {
    // Use store defaults
    if (userStore.user) {
      form.value.name = userStore.user.name;
      form.value.email = userStore.user.email;
      form.value.phone = userStore.user.phone ?? '';
    }
  }
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

function uploadAvatar() {
  $q.notify({ type: 'info', message: 'Avatar upload will be available when S3 is configured.' });
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
