<template>
  <div class="partner-auth">
    <!-- Left side — Partner Branding -->
    <div class="brand-side">
      <div class="brand-content">
        <transition name="slide-content" mode="out-in">
          <div :key="currentSlide" class="slide-block">
            <!-- Badge -->
            <div class="brand-badge">
              <q-icon :name="slides[currentSlide].badgeIcon" size="18px" :class="slides[currentSlide].badgeIconClass" />
              <span class="badge-text">{{ slides[currentSlide].badgeText }}</span>
              <span class="badge-suffix"> {{ slides[currentSlide].badgeSuffix }}</span>
            </div>

            <!-- Headline -->
            <h1 class="brand-headline">
              <span v-for="(line, i) in slides[currentSlide].lines" :key="i">{{ line }}<br /></span>
              <span class="text-accent">{{ slides[currentSlide].accent }}</span>
            </h1>

            <!-- Description -->
            <p class="brand-description">{{ slides[currentSlide].desc }}</p>

            <!-- Stats -->
            <div class="slide-stats">
              <div v-for="stat in slides[currentSlide].stats" :key="stat.label" class="slide-stat">
                <div class="slide-stat-num">{{ stat.num }}</div>
                <div class="slide-stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </transition>

        <!-- Dots navigation -->
        <div class="slide-dots">
          <span
            v-for="(_, i) in slides" :key="i"
            class="slide-dot"
            :class="{ active: i === currentSlide }"
            @click="currentSlide = i"
          />
        </div>
      </div>

      <!-- Mobile-only compact content -->
      <div class="brand-mobile">
        <img src="/logo_short_dark.svg" alt="ecoLoop" style="height:32px; margin-bottom:6px" />
        <div class="brand-mobile-name">ecoLoop</div>
        <div class="brand-mobile-tag">Partner <span class="text-accent">Program</span></div>
      </div>

      <!-- Decorative elements -->
      <div class="brand-decoration">
        <div class="deco-circle deco-1" />
        <div class="deco-circle deco-2" />
        <div class="deco-circle deco-3" />
        <div class="pulse-ring pr1" />
        <div class="pulse-ring pr2" />
        <div class="particle p1">$</div>
        <div class="particle p2">%</div>
        <div class="particle p3">$</div>
        <div class="particle p4">%</div>
        <div class="particle p5">$</div>
        <div class="particle p6">%</div>
        <svg class="energy-lines" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
          <path class="eline e1" d="M0,400 Q150,200 300,350 T600,300" fill="none" stroke="rgba(0,212,170,0.15)" stroke-width="1.5"/>
          <path class="eline e2" d="M0,600 Q200,400 400,500 T600,450" fill="none" stroke="rgba(126,255,74,0.1)" stroke-width="1"/>
          <path class="eline e3" d="M100,0 Q250,300 150,500 T200,800" fill="none" stroke="rgba(0,212,170,0.08)" stroke-width="1"/>
        </svg>
      </div>
    </div>

    <!-- Right side — Form -->
    <div class="form-side">
      <div class="form-container">
        <div class="form-header">
          <img src="/logo_short_dark.svg" alt="ecoLoop" class="form-logo" />
          <div class="partner-badge-wrapper">
            <div class="partner-badge-header">
              <q-icon name="handshake" size="16px" color="primary" />
              <span>Partner Program</span>
            </div>
          </div>
          <h2 class="form-title">{{ authTab === 'login' ? 'Welcome Back, Partner' : 'Join as Partner' }}</h2>
          <p class="form-subtitle">{{ authTab === 'login' ? 'Sign in to your partner account' : 'Create your partner account' }}</p>
        </div>

        <div class="form-card">
          <!-- Tabs — only show Create Account when invite code is present -->
          <q-tabs v-if="inviteCode" v-model="authTab" dense no-caps active-color="primary" indicator-color="primary" class="auth-tabs q-mb-lg">
            <q-tab name="login" label="Sign In" />
            <q-tab name="register" label="Create Account" />
          </q-tabs>

          <q-tab-panels v-model="authTab" animated>
            <!-- Login -->
            <q-tab-panel name="login" class="q-pa-none">
              <q-form @submit.prevent="handleLogin" class="form-fields">
                <q-input v-model="loginEmail" label="Email" type="email" outlined dense class="partner-input" :rules="[(v: string) => !!v || 'Email is required']">
                  <template #prepend><q-icon name="email" color="grey-5" size="18px" /></template>
                </q-input>
                <q-input v-model="loginPassword" label="Password" :type="showLoginPass ? 'text' : 'password'" outlined dense class="partner-input" :rules="[(v: string) => !!v || 'Password is required']">
                  <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
                  <template #append>
                    <q-icon :name="showLoginPass ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showLoginPass = !showLoginPass" />
                  </template>
                </q-input>
                <div class="text-right q-mt-xs">
                  <router-link to="/auth/forgot-password" class="forgot-link">Forgot Password?</router-link>
                </div>
                <q-btn unelevated no-caps color="primary" label="Sign In" type="submit" :loading="loginLoading" class="full-width submit-btn" />
                <div class="text-center q-mt-md">
                  <span class="text-hint">Are you an ecoLoop employee? </span>
                  <router-link to="/auth/login" class="text-primary text-weight-medium">Employee Login</router-link>
                </div>
              </q-form>
            </q-tab-panel>

            <!-- Register -->
            <q-tab-panel name="register" class="q-pa-none">
              <!-- Success state -->
              <div v-if="registerSuccess" class="text-center q-pa-lg">
                <q-icon name="check_circle" size="64px" color="positive" class="q-mb-md" />
                <h5 class="success-title">Welcome aboard!</h5>
                <p class="success-subtitle">Your partner account is ready. Redirecting...</p>
                <q-spinner-dots color="primary" size="32px" class="q-mt-md" />
              </div>

              <!-- No invite warning -->
              <div v-else-if="!inviteCode" class="text-center q-pa-lg">
                <q-icon name="link_off" size="56px" color="orange-6" class="q-mb-md" />
                <h5 class="success-title">Invitation Required</h5>
                <p class="success-subtitle q-mb-md">
                  To create a partner account, you need an invitation link from an ecoLoop representative or existing partner.
                </p>
                <q-btn unelevated no-caps color="primary" label="I have an account — Sign In" class="submit-btn" @click="authTab = 'login'" />
              </div>

              <!-- Register form -->
              <q-form v-else @submit.prevent="handleRegister" class="form-fields">
                <q-banner class="bg-teal-1 text-teal-9 q-mb-sm" rounded dense style="font-size: 12px">
                  <template #avatar><q-icon name="verified" color="teal-6" /></template>
                  You've been invited to join as a <strong>Sales Partner</strong>.
                </q-banner>

                <q-input v-model="regName" label="Full Name" outlined dense class="partner-input" :rules="[(v: string) => !!v || 'Name is required']">
                  <template #prepend><q-icon name="person" color="grey-5" size="18px" /></template>
                </q-input>
                <q-input v-model="regEmail" label="Email" type="email" outlined dense class="partner-input" :rules="[(v: string) => !!v || 'Email is required', (v: string) => /.+@.+\..+/.test(v) || 'Invalid email']">
                  <template #prepend><q-icon name="email" color="grey-5" size="18px" /></template>
                </q-input>
                <q-input v-model="regPhone" label="Phone (optional)" type="tel" mask="(###) ###-####" unmasked-value inputmode="numeric" @keypress="onlyNumbers" outlined dense class="partner-input">
                  <template #prepend><q-icon name="phone" color="grey-5" size="18px" /></template>
                </q-input>
                <q-input v-model="regPassword" label="Password" :type="showRegPass ? 'text' : 'password'" outlined dense class="partner-input"
                  :rules="[(v: string) => !!v || 'Required', (v: string) => v.length >= 8 || 'Min 8 characters']">
                  <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
                  <template #append>
                    <q-icon :name="showRegPass ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showRegPass = !showRegPass" />
                  </template>
                </q-input>
                <q-input v-model="regConfirmPassword" label="Confirm Password" :type="showRegConfirm ? 'text' : 'password'" outlined dense class="partner-input"
                  :rules="[(v: string) => v === regPassword || 'Passwords do not match']">
                  <template #prepend><q-icon name="lock" color="grey-5" size="18px" /></template>
                  <template #append>
                    <q-icon :name="showRegConfirm ? 'visibility_off' : 'visibility'" class="cursor-pointer" color="grey-4" size="18px" @click="showRegConfirm = !showRegConfirm" />
                  </template>
                </q-input>
                <q-btn unelevated no-caps color="primary" label="Create Partner Account" type="submit" :loading="regLoading" class="full-width submit-btn" />
                <div class="text-center q-mt-md">
                  <span class="text-hint">Already have an account? </span>
                  <a class="text-primary text-weight-medium cursor-pointer" @click="authTab = 'login'">Sign In</a>
                </div>
              </q-form>
            </q-tab-panel>
          </q-tab-panels>

          <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded dense style="font-size: 13px">
            {{ error }}
          </q-banner>
        </div>

        <div class="form-footer">
          <span>&copy; {{ new Date().getFullYear() }} ecoLoop Solar Energy. All rights reserved.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth.store';
import { useUserStore } from '@/stores/user.store';

const props = defineProps<{ code?: string }>();

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const userStore = useUserStore();

// Ensure light mode
let previousDarkMode = false;

// Slides — partner-focused messaging
const slides = [
  {
    badgeIcon: 'handshake', badgeIconClass: 'icon-handshake',
    badgeText: 'Partner', badgeSuffix: 'Program',
    lines: ['Earn with', 'every'],
    accent: 'referral.',
    desc: 'Join ecoLoop\'s partner network. Refer customers, track your leads, and earn commissions on every deal.',
    stats: [
      { num: '60%', label: 'M1 commission' },
      { num: '25%', label: 'M2 commission' },
      { num: '15%', label: 'M3 commission' },
    ],
  },
  {
    badgeIcon: 'trending_up', badgeIconClass: 'icon-trending',
    badgeText: 'Real-time', badgeSuffix: 'Tracking',
    lines: ['Follow your', 'leads in'],
    accent: 'real time.',
    desc: 'See exactly where every referral stands — from first contact to closed deal. Full transparency, zero guesswork.',
    stats: [
      { num: 'Live', label: 'Lead updates' },
      { num: '18', label: 'Pipeline stages' },
      { num: '24/7', label: 'Access' },
    ],
  },
  {
    badgeIcon: 'payments', badgeIconClass: 'icon-payments',
    badgeText: 'Transparent', badgeSuffix: 'Commissions',
    lines: ['Track your', 'earnings'],
    accent: 'effortlessly.',
    desc: 'Multi-tier commissions calculated automatically. See what you\'ve earned, what\'s pending, and what\'s coming next.',
    stats: [
      { num: '3', label: 'Commission tiers' },
      { num: 'Auto', label: 'Calculation' },
      { num: 'Fast', label: 'Payouts' },
    ],
  },
  {
    badgeIcon: 'group_add', badgeIconClass: 'icon-network',
    badgeText: 'Grow', badgeSuffix: 'Your Network',
    lines: ['Invite others,', 'earn'],
    accent: 'more.',
    desc: 'Build your own referral network. When your referrals bring in new partners, you earn commissions on their deals too.',
    stats: [
      { num: 'M1', label: 'Direct referrals' },
      { num: 'M2', label: 'Second tier' },
      { num: 'M3', label: 'Third tier' },
    ],
  },
];

const currentSlide = ref(0);
let slideTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  previousDarkMode = $q.dark.isActive;
  $q.dark.set(false);
  slideTimer = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % slides.length;
  }, 3500);
});

onUnmounted(() => {
  $q.dark.set(previousDarkMode);
  if (slideTimer) clearInterval(slideTimer);
});

// Auth state
const inviteCode = props.code || (route.query.ref as string) || '';
const authTab = ref(inviteCode ? 'register' : 'login');
const error = ref('');

// Login state
const loginEmail = ref('');
const loginPassword = ref('');
const showLoginPass = ref(false);
const loginLoading = ref(false);

// Register state
const regName = ref('');
const regEmail = ref('');
const regPhone = ref('');
const regPassword = ref('');
const regConfirmPassword = ref('');
const showRegPass = ref(false);
const showRegConfirm = ref(false);
const regLoading = ref(false);
const registerSuccess = ref(false);


function onlyNumbers(evt: KeyboardEvent) {
  if (!/\d/.test(evt.key)) evt.preventDefault();
}

async function handleLogin() {
  loginLoading.value = true;
  error.value = '';
  try {
    await authStore.login(loginEmail.value, loginPassword.value);
    await userStore.loadUser();
    router.push('/home');
  } catch (err: unknown) {
    const axErr = err as { response?: { status?: number; data?: { message?: string } } };
    const status = axErr?.response?.status;
    const apiMsg = axErr?.response?.data?.message;
    if (apiMsg?.includes('locked')) {
      error.value = 'Account temporarily locked. Please try again in 15 minutes.';
    } else if (status === 401 || status === 403) {
      error.value = 'Invalid email or password. Please try again.';
    } else if (status === 429) {
      error.value = 'Too many login attempts. Please wait a moment.';
    } else if (apiMsg && !apiMsg.includes('status code') && !apiMsg.includes('Request failed')) {
      error.value = apiMsg;
    } else {
      error.value = 'Unable to connect. Please check your internet and try again.';
    }
  } finally {
    loginLoading.value = false;
  }
}

async function handleRegister() {
  if (regPassword.value !== regConfirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }
  regLoading.value = true;
  error.value = '';
  try {
    await authStore.signUp(regEmail.value, regPassword.value, {
      name: regName.value,
      phone: regPhone.value || undefined,
      role: 'REFERRAL_PARTNER',
      inviteCode,
      autoLogin: true,
    });
    registerSuccess.value = true;
    // Auto-redirect after brief success screen
    await userStore.loadUser();
    setTimeout(() => router.push('/home'), 1500);
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: { message?: string } } };
    error.value = axErr?.response?.data?.message || 'Registration failed. Please try again.';
  } finally {
    regLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '@/css/login-animations.scss';

.partner-auth {
  display: flex;
  min-height: 100vh;

  @media (max-width: 768px) {
    flex-direction: column;
  }
}

// -- Left branding --
.brand-side {
  flex: 1;
  background: linear-gradient(145deg, #0A1929 0%, #0D2137 35%, #14344A 70%, #1B6B6E 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    flex: none;
    height: 200px;
    padding: 24px 28px;
    align-items: center;
    justify-content: center;
  }
}

.brand-content {
  position: relative;
  z-index: 1;
  max-width: 480px;

  @media (max-width: 768px) {
    display: none;
  }
}

.brand-mobile {
  display: none;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
  }
}

.brand-mobile-name {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 4px;
  letter-spacing: -0.03em;
  background: linear-gradient(90deg, #00D4AA, #7EFF4A);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-mobile-tag {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(0, 212, 170, 0.25);
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 32px;
  backdrop-filter: blur(8px);
}

.badge-text {
  background: linear-gradient(90deg, #00E5C8, #34D399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

.badge-suffix {
  background: linear-gradient(90deg, #00D4AA, #7EFF4A);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

.brand-headline {
  font-size: 48px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin: 0 0 20px;

  .text-accent {
    background: linear-gradient(90deg, #00D4AA, #7EFF4A, #00D4AA);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }
}

.brand-description {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0 0 32px;
}

@keyframes shimmer {
  from { background-position: 0% center; }
  to   { background-position: 200% center; }
}

// -- Badge icon animations --
.icon-handshake {
  color: #00D4AA;
  animation: handshake-rock 2s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(0, 212, 170, 0.6));
}
@keyframes handshake-rock {
  0%, 100% { transform: rotate(0deg); }
  20%      { transform: rotate(-8deg); }
  40%      { transform: rotate(8deg); }
  60%      { transform: rotate(-4deg); }
  80%      { transform: rotate(4deg); }
}

.icon-trending {
  color: #7EFF4A;
  animation: trending-pulse 2.2s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(126, 255, 74, 0.5));
}
@keyframes trending-pulse {
  0%, 100% { transform: scale(1) translateY(0); }
  50%      { transform: scale(1.1) translateY(-3px); filter: drop-shadow(0 0 10px rgba(126, 255, 74, 0.9)); }
}

.icon-payments {
  color: #00D4AA;
  animation: payments-shine 2.5s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(0, 212, 170, 0.5));
}
@keyframes payments-shine {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(0, 212, 170, 0.5)); }
  50%      { transform: scale(1.15); filter: drop-shadow(0 0 12px rgba(0, 212, 170, 1)); }
}

.icon-network {
  color: #34D399;
  animation: network-bounce 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.5));
}
@keyframes network-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  40%      { transform: translateY(-3px) scale(1.1); filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.9)); }
  60%      { transform: translateY(-1px) scale(1.05); }
}

// -- Slide stats --
.slide-stats {
  display: flex;
  gap: 28px;
}

.slide-stat-num {
  font-size: 24px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: -0.02em;
  line-height: 1;
}

.slide-stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 500;
  margin-top: 3px;
}

// -- Dots --
.slide-dots {
  display: flex;
  gap: 6px;
  margin-top: 28px;
}

.slide-dot {
  height: 5px;
  width: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 450ms ease;

  &.active {
    width: 24px;
    background: #00D4AA;
  }
}

// -- Slide transition --
.slide-content-enter-active {
  transition: opacity 0.4s ease 0.05s, transform 0.4s ease 0.05s;
}
.slide-content-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.slide-content-enter-from {
  opacity: 0;
  transform: translateY(18px);
}
.slide-content-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

// -- Decorations --
.brand-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.deco-1 { width: 400px; height: 400px; top: -100px; right: -100px; }
.deco-2 { width: 300px; height: 300px; bottom: -80px; left: -60px; }
.deco-3 { width: 200px; height: 200px; top: 50%; left: 60%; border-color: rgba(52, 211, 153, 0.1); }

// -- Right form --
.form-side {
  flex: 0 0 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: #FFFFFF;
  overflow-y: auto;

  @media (max-width: 768px) {
    flex: 1;
    padding: 32px 24px 40px;
    align-items: flex-start;
  }
}

.form-container {
  width: 100%;
  max-width: 400px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
}

.form-header {
  text-align: center;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    display: none;
  }
}

.form-logo {
  height: 36px;
  margin-bottom: 8px;
}

.partner-badge-wrapper {
  margin-bottom: 12px;
}

.partner-badge-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, rgba(0, 137, 123, 0.08) 0%, rgba(0, 105, 92, 0.12) 100%);
  border: 1px solid rgba(0, 137, 123, 0.18);
  border-radius: 16px;
  padding: 5px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #00796B;
  box-shadow: 0 1px 4px rgba(0, 137, 123, 0.12);

  :deep(.q-icon) {
    color: #00897B !important;
    animation: handshake-wave 2.5s ease-in-out infinite;
  }
}

@keyframes handshake-wave {
  0%, 100% { transform: rotate(0deg); }
  15%      { transform: rotate(-10deg); }
  30%      { transform: rotate(8deg); }
  45%      { transform: rotate(-6deg); }
  60%      { transform: rotate(4deg); }
  75%      { transform: rotate(0deg); }
}

.form-title {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}

.form-subtitle {
  margin: 0;
  font-size: 14px;
  color: #9CA3AF;
}

.auth-tabs {
  :deep(.q-tab) {
    font-weight: 600;
    font-size: 14px;
  }
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.partner-input {
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

.forgot-link {
  font-size: 13px;
  color: #00897B;
  font-weight: 500;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.text-hint {
  color: #9CA3AF;
  font-size: 14px;
}

.text-accent {
  background: linear-gradient(90deg, #00D4AA, #7EFF4A);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.success-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.success-subtitle {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
}

.form-footer {
  text-align: center;
  margin-top: 32px;
  font-size: 12px;
  color: #9CA3AF;
}
</style>
