<template>
  <q-page class="profile-page">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="error" class="bg-negative text-white q-ma-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action><q-btn flat label="Retry" @click="loadData" /></template>
    </q-banner>

    <template v-else>
      <!-- Header card with avatar + stats -->
      <div class="profile-header">
        <q-avatar size="90px" color="primary" text-color="white" class="cursor-pointer avatar-hover" @click="uploadAvatar">
          <q-img v-if="form.avatarUrl" :src="form.avatarUrl" />
          <span v-else class="text-h4 text-weight-bold">{{ userInitials }}</span>
          <div class="avatar-overlay">
            <q-icon name="camera_alt" size="24px" color="white" />
          </div>
        </q-avatar>
        <div class="text-h6 text-weight-bold q-mt-sm">{{ form.name || 'Your Name' }}</div>
        <div class="text-caption text-grey-5">{{ form.email }}</div>
        <q-badge v-if="userStore.user?.role" :color="roleColor" class="q-mt-xs">
          {{ userStore.user?.role?.replace('_', ' ') }}
        </q-badge>

        <!-- Stats row -->
        <div class="row q-mt-lg stats-row">
          <div class="col text-center">
            <div class="text-h6 text-weight-bold">{{ stats.wonDeals }}</div>
            <div class="text-caption text-grey-5">Won Deals</div>
          </div>
          <q-separator vertical />
          <div class="col text-center">
            <div class="text-h6 text-weight-bold">${{ stats.totalCommission.toLocaleString() }}</div>
            <div class="text-caption text-grey-5">Commission</div>
          </div>
          <q-separator vertical />
          <div class="col text-center">
            <div class="text-h6 text-weight-bold">#{{ stats.rank || '--' }}</div>
            <div class="text-caption text-grey-5">Rank</div>
          </div>
        </div>
      </div>

      <!-- Referral & Personalization -->
      <q-card flat bordered class="section-card">
        <q-card-section>
          <div class="section-title">
            <q-icon name="share" size="20px" color="primary" class="q-mr-sm" />
            Referral & Personalization
          </div>
          <div class="row q-col-gutter-md q-mt-xs">
            <div class="col-12 col-sm-8">
              <q-input
                :model-value="referralLink"
                label="Your Referral Link"
                outlined dense readonly
                class="rounded-select"
              >
                <template #append>
                  <q-btn flat dense round icon="content_copy" size="sm" color="primary" @click="copyReferralLink">
                    <q-tooltip>Copy link</q-tooltip>
                  </q-btn>
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-4">
              <q-select
                v-model="form.closedDealEmoji"
                :options="emojiOptions"
                label="Deal Closed Emoji"
                outlined dense
                class="rounded-select"
                hint="Shown on scoreboard"
              >
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar><span style="font-size: 22px">{{ scope.opt }}</span></q-item-section>
                    <q-item-section>{{ emojiLabels[scope.opt] }}</q-item-section>
                  </q-item>
                </template>
                <template #selected-item="scope">
                  <span style="font-size: 18px" class="q-mr-xs">{{ scope.opt }}</span>
                  <span class="text-caption text-grey-6">{{ emojiLabels[scope.opt] }}</span>
                </template>
              </q-select>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Personal Info -->
      <q-card flat bordered class="section-card">
        <q-card-section>
          <div class="section-title">
            <q-icon name="person" size="20px" color="primary" class="q-mr-sm" />
            Personal Information
          </div>
          <div class="row q-col-gutter-md q-mt-xs">
            <div class="col-12 col-sm-6">
              <EInput v-model="form.name" label="Full Name" :rules="[required]" />
            </div>
            <div class="col-12 col-sm-6">
              <EInput v-model="form.email" label="Email" type="email" disable />
            </div>
            <div class="col-12 col-sm-6">
              <EInput
                v-model="form.phone"
                label="Phone"
                type="tel"
                mask="(###) ###-####"
                unmasked-value
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.language"
                :options="languageOptions"
                label="Language"
                emit-value map-options outlined dense
                class="rounded-select"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Bank Information -->
      <q-card flat bordered class="section-card">
        <q-card-section>
          <div class="section-title">
            <q-icon name="account_balance" size="20px" color="primary" class="q-mr-sm" />
            Bank Information
          </div>
          <div class="row q-col-gutter-md q-mt-xs">
            <div class="col-12 col-sm-4">
              <EInput v-model="form.bankName" label="Bank Name" />
            </div>
            <div class="col-12 col-sm-4">
              <EInput v-model="form.routingNumber" label="Routing Number" />
            </div>
            <div class="col-12 col-sm-4">
              <EInput v-model="form.accountNumber" label="Account Number" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Preferences -->
      <q-card flat bordered class="section-card">
        <q-card-section>
          <div class="section-title">
            <q-icon name="settings" size="20px" color="primary" class="q-mr-sm" />
            Preferences
          </div>
          <div class="row q-col-gutter-md q-mt-xs">
            <div class="col-12 col-sm-4">
              <q-toggle v-model="darkMode" label="Dark mode" @update:model-value="toggleDarkMode" />
            </div>
            <div class="col-12 col-sm-4">
              <q-toggle v-model="emailNotifications" label="Email notifications" @update:model-value="saveNotificationPrefs" />
            </div>
            <div class="col-12 col-sm-4">
              <q-toggle v-model="pushNotifications" label="Push notifications" @update:model-value="saveNotificationPrefs" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Rewards -->
      <q-card v-if="userStore.user?.role !== 'REFERRAL'" flat bordered class="section-card">
        <q-card-section>
          <div class="row items-center">
            <q-icon name="monetization_on" size="28px" color="amber-8" class="q-mr-sm" />
            <div>
              <div class="text-h5 text-weight-bold">{{ coinBalance }}</div>
              <div class="text-caption text-grey-5">Available coins</div>
            </div>
            <q-space />
            <q-btn unelevated no-caps color="primary" label="Visit Store" to="/store" class="rounded-btn" />
          </div>
        </q-card-section>
      </q-card>

      <!-- Change Password -->
      <q-card flat bordered class="section-card">
        <q-card-section>
          <div class="section-title">
            <q-icon name="lock" size="20px" color="primary" class="q-mr-sm" />
            Change Password
          </div>
          <div class="row q-col-gutter-md q-mt-xs">
            <div class="col-12 col-sm-6">
              <EInput v-model="passwordForm.current" label="Current Password" type="password" />
            </div>
            <div class="col-12 col-sm-6">
              <EInput v-model="passwordForm.newPassword" label="New Password" type="password" />
            </div>
          </div>
          <div class="row justify-end q-mt-sm">
            <q-btn
              unelevated no-caps color="primary" label="Update Password"
              :disable="!passwordForm.current || !passwordForm.newPassword || passwordForm.newPassword.length < 6"
              :loading="changingPassword"
              class="rounded-btn"
              @click="changePassword"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Save -->
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
  closedDealEmoji: '',
  inviteCode: '',
});

const stats = ref({ wonDeals: 0, totalCommission: 0, rank: 0 });
const passwordForm = ref({ current: '', newPassword: '' });
const changingPassword = ref(false);
const savingCode = ref(false);

const emojiOptions = ['🎉', '🔥', '💰', '⚡', '🏆'];
const emojiLabels: Record<string, string> = { '🎉': 'Party', '🔥': 'Fire', '💰': 'Money', '⚡': 'Lightning', '🏆': 'Trophy' };

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

const roleColor = computed(() => {
  const map: Record<string, string> = { ADMIN: 'red', MANAGER: 'blue', SALES_REP: 'primary', REFERRAL: 'orange' };
  return map[userStore.user?.role ?? ''] ?? 'grey';
});

const referralLink = computed(() => {
  const code = form.value.inviteCode || userStore.user?.invitationCode;
  return code ? `${window.location.origin}/partner/${code}` : '';
});

function copyReferralLink() {
  if (!referralLink.value) return;
  navigator.clipboard.writeText(referralLink.value);
  $q.notify({ type: 'positive', message: 'Referral link copied!', icon: 'content_copy' });
}

async function saveInviteCode() {
  const code = form.value.inviteCode.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  if (!code) return;
  savingCode.value = true;
  try {
    await api.put('/users/me', { invitationCode: code });
    form.value.inviteCode = code;
    $q.notify({ type: 'positive', message: 'Referral code updated!' });
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Code already taken or invalid';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    savingCode.value = false;
  }
}

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
    form.value.avatarUrl = img.startsWith('/api/') ? `${API_URL}${img}` : img;
    form.value.language = data.language ?? 'en';
    form.value.closedDealEmoji = data.closedDealEmoji ?? '';
    form.value.inviteCode = data.invitationCode ?? '';
    emailNotifications.value = data.emailNotifications ?? true;
    pushNotifications.value = data.pushNotifications ?? false;
    if (data.darkMode !== undefined) {
      darkMode.value = data.darkMode;
      $q.dark.set(data.darkMode);
    }
  } catch {
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

async function loadStats() {
  try {
    const { data } = await api.get('/gamification/leaderboard', { params: { period: 'monthly' } });
    const list = Array.isArray(data) ? data : [];
    const userId = userStore.user?.id;
    const me = list.find((e: Record<string, string>) => e.userId === userId);
    const idx = list.findIndex((e: Record<string, string>) => e.userId === userId);
    stats.value = {
      wonDeals: (me as Record<string, number>)?.wonDeals ?? (me as Record<string, number>)?.totalPoints ?? 0,
      totalCommission: 0,
      rank: idx >= 0 ? idx + 1 : 0,
    };
  } catch { /* ignore */ }
  try {
    const { data } = await api.get('/commissions');
    const list = Array.isArray(data) ? data : [];
    stats.value.totalCommission = list.reduce((sum: number, c: Record<string, number>) => sum + (Number(c.amount) || 0), 0);
  } catch { /* ignore */ }
}

async function changePassword() {
  changingPassword.value = true;
  try {
    await api.put('/users/me', {
      currentPassword: passwordForm.value.current,
      password: passwordForm.value.newPassword,
    });
    $q.notify({ type: 'positive', message: 'Password updated!' });
    passwordForm.value = { current: '', newPassword: '' };
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to change password';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    changingPassword.value = false;
  }
}

onMounted(() => { loadData(); loadCoinBalance(); loadFinance(); loadStats(); });

async function loadFinance() {
  try {
    const { data } = await api.get('/users/me/finance');
    form.value.bankName = data.bankName ?? '';
    form.value.routingNumber = data.routingNumber ?? '';
    form.value.accountNumber = data.accountNumber ?? '';
  } catch { /* ignore */ }
}

async function save() {
  saving.value = true;
  try {
    const [firstName, ...rest] = form.value.name.split(' ');
    await Promise.all([
      api.put('/users/me', {
        firstName: firstName || form.value.name,
        lastName: rest.join(' ') || '',
        phone: form.value.phone || undefined,
        language: form.value.language,
        closedDealEmoji: form.value.closedDealEmoji || undefined,
      }),
      api.put('/users/me/finance', {
        bankName: form.value.bankName || undefined,
        routingNumber: form.value.routingNumber || undefined,
        accountNumber: form.value.accountNumber || undefined,
      }),
    ]);
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
    $q.notify({ type: 'positive', message: 'Preferences updated!' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update preferences.' });
  }
}

async function loadCoinBalance() {
  try {
    const { data } = await api.get('/gamification/balance');
    coinBalance.value = data.balance ?? data.coins ?? 0;
  } catch { coinBalance.value = 0; }
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
      form.value.avatarUrl = data.url.startsWith('/api/') ? `${API_URL}${data.url}` : data.url;
      $q.notify({ type: 'positive', message: 'Avatar updated!' });
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to upload avatar.' });
    }
  };
  input.click();
}
</script>

<style lang="scss" scoped>
.profile-page {
  background: transparent;
  padding: 16px;
  max-width: 720px;
  margin: 0 auto;
}

.profile-header {
  text-align: center;
  padding: 24px 16px 20px;
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  margin-bottom: 16px;

  .body--dark & {
    background: #22223a;
    border-color: transparent;
    color: #e0e0e0;
  }
}

.avatar-hover {
  position: relative;
  transition: transform 0.2s;
  box-shadow: 0 0 0 3px #00897B, 0 0 0 6px rgba(0, 137, 123, 0.2), 0 4px 20px rgba(0, 0, 0, 0.15);
  &:hover { transform: scale(1.05); }
}

.stats-row {
  border-top: 1px solid #E5E7EB;
  padding-top: 16px;
  margin-top: 12px;

  .body--dark & { border-color: rgba(255, 255, 255, 0.08); }
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;

  .avatar-hover:hover & {
    opacity: 1;
  }
}

.section-card {
  border-radius: 12px;
  border-color: #E5E7EB;
  margin-bottom: 12px;

  .body--dark & {
    background: #22223a;
    border-color: transparent;
  }
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  display: flex;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  .body--dark & {
    color: #c0c0c0;
  }
}

.rounded-select {
  :deep(.q-field__control) { border-radius: 12px; }
}

.rounded-btn {
  border-radius: 10px;
}
</style>
