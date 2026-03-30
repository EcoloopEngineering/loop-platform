<template>
  <div class="portal-login">
    <!-- Left side — Branding -->
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
        <div class="brand-mobile-tag">Your solar <span class="text-accent">journey starts here.</span></div>
      </div>

      <!-- Decorative elements + animations -->
      <div class="brand-decoration">
        <div class="deco-circle deco-1" />
        <div class="deco-circle deco-2" />
        <div class="deco-circle deco-3" />

        <div class="pulse-ring pr1" />
        <div class="pulse-ring pr2" />

        <div class="particle p1">☀</div>
        <div class="particle p2">⚡</div>
        <div class="particle p3">☀</div>
        <div class="particle p4">⚡</div>
        <div class="particle p5">☀</div>
        <div class="particle p6">⚡</div>

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
          <h2 class="form-title">Welcome</h2>
          <p class="form-subtitle">Sign in or create your account</p>
        </div>

        <div class="form-card">
          <!-- Tabs: shown only for login / register -->
          <q-tabs v-if="view !== 'forgot'" v-model="authTab" dense no-caps active-color="primary" indicator-color="primary" class="auth-tabs q-mb-lg">
            <q-tab name="login" label="Sign In" />
            <q-tab name="register" label="Create Account" />
          </q-tabs>

          <!-- Forgot password view -->
          <div v-if="view === 'forgot'" class="forgot-view">
            <div class="forgot-back" @click="view = 'login'">
              <q-icon name="arrow_back" size="16px" />
              <span>Back to Sign In</span>
            </div>
            <div class="forgot-title">Forgot your password?</div>
            <div class="forgot-sub">Enter your email and we'll send you a reset link.</div>

            <q-form v-if="!forgotSent" @submit.prevent="handleForgot" class="form-fields q-mt-md">
              <q-input v-model="forgotEmail" label="Email" type="email" outlined dense class="portal-input" :rules="[v => !!v || 'Required']">
                <template #prepend><q-icon name="email" color="grey-5" size="18px" /></template>
              </q-input>
              <q-btn unelevated no-caps color="primary" label="Send Reset Link" type="submit" :loading="forgotLoading" class="full-width submit-btn" />
            </q-form>

            <q-banner v-if="forgotSent" class="bg-positive text-white q-mt-md" rounded dense style="font-size: 13px">
              <template #avatar><q-icon name="mark_email_read" /></template>
              Check your email for the reset link. It expires in 1 hour.
            </q-banner>
          </div>

          <q-tab-panels v-if="view !== 'forgot'" v-model="authTab" animated>
            <!-- Login -->
            <q-tab-panel name="login" class="q-pa-none">
              <PortalLoginForm @forgot="view = 'forgot'" @error="error = $event" />
            </q-tab-panel>

            <!-- Register -->
            <q-tab-panel name="register" class="q-pa-none">
              <PortalRegisterForm @error="error = $event" />
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
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import PortalLoginForm from '@/components/portal/PortalLoginForm.vue';
import PortalRegisterForm from '@/components/portal/PortalRegisterForm.vue';

const $q = useQuasar();

// Portal login always stays in light mode — isolated from admin dark mode
let previousDarkMode = false;

const slides = [
  {
    badgeIcon: 'wb_sunny', badgeIconClass: 'icon-sun',
    badgeText: 'Customer', badgeSuffix: 'Portal',
    lines: ['Your solar', 'journey starts'],
    accent: 'here.',
    desc: 'Track your project, view documents, and stay updated — all in one place.',
    stats: [
      { num: 'Live', label: 'Project tracking' },
      { num: '24/7', label: 'Document access' },
      { num: 'Fast', label: 'Team updates' },
    ],
  },
  {
    badgeIcon: 'route', badgeIconClass: 'icon-route',
    badgeText: 'Project', badgeSuffix: 'Progress',
    lines: ['Follow every step', 'of your'],
    accent: 'installation.',
    desc: 'See exactly where your project stands at every stage, from design to commissioning.',
    stats: [
      { num: '18',   label: 'Project stages' },
      { num: '100%', label: 'Transparency' },
      { num: 'Live', label: 'Stage updates' },
    ],
  },
  {
    badgeIcon: 'folder_open', badgeIconClass: 'icon-docs',
    badgeText: 'Your', badgeSuffix: 'Documents',
    lines: ['All your files,', 'always'],
    accent: 'available.',
    desc: 'Contracts, permits, design reports and more — securely stored and accessible anytime.',
    stats: [
      { num: 'Safe', label: 'Secure storage' },
      { num: 'PDF',  label: 'Easy download' },
      { num: '24/7', label: 'Access' },
    ],
  },
  {
    badgeIcon: 'support_agent', badgeIconClass: 'icon-support',
    badgeText: 'Your', badgeSuffix: 'Team',
    lines: ["We're here", 'whenever you'],
    accent: 'need us.',
    desc: 'Chat directly with your project team, get answers fast, and stay in control.',
    stats: [
      { num: 'Chat', label: 'Direct contact' },
      { num: 'FAQ',  label: 'Quick answers' },
      { num: '24/7', label: 'Support' },
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

const authTab = ref('login');
const view = ref<'login' | 'forgot'>('login');
const error = ref('');

const forgotEmail = ref('');
const forgotSent = ref(false);
const forgotLoading = ref(false);

async function handleForgot() {
  forgotLoading.value = true;
  error.value = '';
  try {
    await api.post('/portal/auth/forgot-password', { email: forgotEmail.value });
    forgotSent.value = true;
  } catch {
    forgotSent.value = true; // Always show success to avoid email enumeration
  } finally {
    forgotLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '@/css/login-animations.scss';

.portal-login {
  display: flex;
  min-height: 100vh;

  @media (max-width: 768px) {
    flex-direction: column;
  }
}

// -- Left branding --
.brand-side {
  flex: 1;
  background: linear-gradient(145deg, #042F1E 0%, #064E32 35%, #00897B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    flex: none;
    height: 220px;
    padding: 24px 28px;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .solar-grid { display: none !important; }
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
  margin-bottom: 8px;
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

// Hide form logo on mobile (shown in brand header)
@media (max-width: 768px) {
  .form-header { display: none; }
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

// -- Badge icons — one animation per slide --

// Slide 0: sun — slow spin with color glow
.icon-sun {
  color: #00D4AA;
  animation: sun-spin 8s linear infinite, sun-glow 3s ease-in-out infinite alternate;
}
@keyframes sun-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes sun-glow {
  from { filter: drop-shadow(0 0 4px rgba(0, 212, 170, 0.6)); }
  to   { filter: drop-shadow(0 0 12px rgba(126, 255, 74, 1)); }
}

// Slide 1: route — soft pulse
.icon-route {
  color: #00D4AA;
  animation: route-pulse 2s ease-in-out infinite;
}
@keyframes route-pulse {
  0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 3px rgba(0, 212, 170, 0.5)); }
  50%       { transform: scale(1.2); filter: drop-shadow(0 0 8px rgba(0, 212, 170, 0.9)); }
}

// Slide 2: folder — gentle bounce open
.icon-docs {
  color: #7EFF4A;
  animation: docs-bounce 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(126, 255, 74, 0.5));
}
@keyframes docs-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  40%       { transform: translateY(-3px) scale(1.1); filter: drop-shadow(0 0 8px rgba(126, 255, 74, 0.9)); }
  60%       { transform: translateY(-1px) scale(1.05); }
}

// Slide 3: support_agent — wave side-to-side
.icon-support {
  color: #00D4AA;
  animation: support-wave 2.2s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(0, 212, 170, 0.5));
}
@keyframes support-wave {
  0%, 100% { transform: rotate(0deg); }
  20%       { transform: rotate(-12deg); }
  40%       { transform: rotate(12deg); filter: drop-shadow(0 0 8px rgba(0, 212, 170, 0.9)); }
  60%       { transform: rotate(-6deg); }
  80%       { transform: rotate(6deg); }
}

// Decorative circles
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
  flex: 0 0 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: #FFFFFF;

  @media (max-width: 768px) {
    flex: 1;
    padding: 32px 24px 40px;
    align-items: flex-start;
  }
}

.form-container {
  width: 100%;
  max-width: 380px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-logo {
  height: 40px;
  margin-bottom: 16px;
}

.form-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #111827;
}

.form-subtitle {
  margin: 4px 0 0;
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

.form-footer {
  text-align: center;
  margin-top: 32px;
  font-size: 12px;
  color: #9CA3AF;
}

.forgot-view {
  padding-bottom: 8px;
}

.forgot-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6B7280;
  cursor: pointer;
  margin-bottom: 20px;
  font-weight: 500;

  &:hover { color: #374151; }
}

.forgot-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 6px;
}

.forgot-sub {
  font-size: 14px;
  color: #9CA3AF;
  margin-bottom: 4px;
}

</style>
