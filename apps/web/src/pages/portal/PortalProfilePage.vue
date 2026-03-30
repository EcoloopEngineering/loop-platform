<template>
  <q-page class="portal-profile q-pa-md">
    <h5 class="page-title q-mb-lg">My Profile</h5>

    <q-card flat class="q-mb-lg">
      <q-card-section>
        <q-form @submit.prevent="save" class="q-gutter-y-md">
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="form.firstName" label="First Name" outlined dense />
            </div>
            <div class="col-6">
              <q-input v-model="form.lastName" label="Last Name" outlined dense />
            </div>
          </div>
          <q-input v-model="form.email" label="Email" outlined dense disable />
          <q-input v-model="form.phone" label="Phone" mask="(###) ###-####" unmasked-value outlined dense />

          <q-separator class="q-my-md" />

          <div class="text-weight-bold q-mb-sm" style="font-size: 14px">Property Address</div>
          <q-input v-model="form.address" label="Address" outlined dense disable />

          <q-separator class="q-my-md" />

          <div class="text-weight-bold q-mb-sm" style="font-size: 14px">Display</div>
          <q-item tag="label" class="q-px-none">
            <q-item-section>
              <q-item-label>Dark mode</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="darkMode" color="primary" @update:model-value="toggleDark" />
            </q-item-section>
          </q-item>

          <q-btn unelevated no-caps color="primary" label="Save Changes" type="submit" :loading="saving" class="full-width q-mt-md" style="border-radius: 10px; min-height: 44px; font-weight: 600" />
        </q-form>
      </q-card-section>
    </q-card>

    <!-- Danger Zone -->
    <q-card flat class="danger-card">
      <q-card-section>
        <div class="text-weight-bold text-negative q-mb-sm" style="font-size: 14px">Account</div>
        <q-btn outline no-caps color="negative" label="Sign Out" icon="logout" @click="logout" style="border-radius: 10px" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { usePortalAuthStore } from '@/stores/portal-auth.store';

const router = useRouter();
const $q = useQuasar();
const portalAuth = usePortalAuthStore();
const saving = ref(false);
const darkMode = ref($q.dark.isActive);

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
});

onMounted(() => {
  const c = portalAuth.customer;
  if (c) {
    form.value.firstName = c.firstName || '';
    form.value.lastName = c.lastName || '';
    form.value.email = c.email || '';
    form.value.phone = c.phone || '';
    form.value.address = (c as Record<string, unknown>).address as string || '';
  }
});

function save() {
  saving.value = true;
  setTimeout(() => {
    saving.value = false;
    $q.notify({ type: 'positive', message: 'Profile updated!' });
  }, 500);
}

function toggleDark(val: boolean) {
  $q.dark.set(val);
  localStorage.setItem('darkMode', val ? '1' : '0');
}

function logout() {
  portalAuth.logout();
  router.push('/portal/login');
}
</script>

<style lang="scss" scoped>
.portal-profile {
  background: #F8FAFB;
  padding: 24px 5% !important;
  max-width: 100%;
  margin: 0 auto;
}

.page-title {
  margin: 0;
  font-weight: 700;
  color: #111827;
}

.danger-card {
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
}
</style>
