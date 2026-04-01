<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="auth-page">
        <div class="auth-split">
          <!-- Left side — Branding (desktop full / mobile compact) -->
          <div class="brand-side">
            <div class="brand-content">
              <transition name="slide-content" mode="out-in">
                <div :key="currentSlide" class="slide-block">
                  <!-- Badge -->
                  <div class="brand-badge">
                    <q-icon :name="slides[currentSlide].badgeIcon" size="18px" :class="slides[currentSlide].badgeIconClass" />
                    <span class="eco-brand">{{ slides[currentSlide].badgeText }}</span>
                    <span class="badge-suffix"> {{ slides[currentSlide].badgeSuffix }}</span>
                  </div>

                  <!-- Headline -->
                  <h1 class="brand-headline">
                    <span v-for="(line, i) in slides[currentSlide].lines" :key="i">{{ line }}<br /></span>
                    <span class="accent">{{ slides[currentSlide].accent }}</span>
                  </h1>

                  <!-- Description -->
                  <p class="brand-desc">{{ slides[currentSlide].desc }}</p>

                  <!-- Stats -->
                  <div class="slide-stats">
                    <div v-for="stat in slides[currentSlide].stats" :key="stat.label" class="slide-stat">
                      <div class="slide-stat-num">{{ stat.num }}</div>
                      <div class="slide-stat-label">{{ stat.label }}</div>
                    </div>
                  </div>
                </div>
              </transition>

              <!-- Dots navigation — always visible -->
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
              <img src="/logo_short_dark.svg" alt="ecoLoop" class="brand-mobile-logo" />
              <div class="brand-mobile-name">ecoLoop</div>
              <div class="brand-mobile-tag">Power your solar <span class="accent">pipeline.</span></div>
            </div>

            <div class="brand-deco">
              <div class="circle c1" />
              <div class="circle c2" />
              <div class="circle c3" />

              <!-- Energy pulse rings -->
              <div class="pulse-ring pr1" />
              <div class="pulse-ring pr2" />

              <!-- Floating solar particles -->
              <div class="particle p1">☀</div>
              <div class="particle p2">⚡</div>
              <div class="particle p3">☀</div>
              <div class="particle p4">⚡</div>
              <div class="particle p5">☀</div>
              <div class="particle p6">⚡</div>

              <!-- Energy flow lines -->
              <svg class="energy-lines" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
                <path class="eline e1" d="M0,400 Q150,200 300,350 T600,300" fill="none" stroke="rgba(0,212,170,0.15)" stroke-width="1.5"/>
                <path class="eline e2" d="M0,600 Q200,400 400,500 T600,450" fill="none" stroke="rgba(126,255,74,0.1)" stroke-width="1"/>
                <path class="eline e3" d="M100,0 Q250,300 150,500 T200,800" fill="none" stroke="rgba(0,212,170,0.08)" stroke-width="1"/>
              </svg>
            </div>
          </div>

          <!-- Right side — Form -->
          <div class="form-side">
            <div class="form-wrapper">
              <div class="form-header">
                <img src="/logo_short_dark.svg" alt="ecoLoop" class="auth-logo" />
                <div class="role-badge-wrapper">
                  <div class="role-badge">
                    <q-icon name="bolt" size="16px" class="role-badge-icon" />
                    <span>Employee Platform</span>
                  </div>
                </div>
              </div>
              <router-view />
              <div class="form-footer">
                &copy; {{ new Date().getFullYear() }} ecoLoop Solar Energy
              </div>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const slides = [
  {
    badgeIcon: 'bolt', badgeIconClass: 'icon-bolt',
    badgeText: 'ecoLoop', badgeSuffix: 'Platform',
    lines: ['Power your', 'solar sales'],
    accent: 'pipeline.',
    desc: 'CRM built for solar energy teams. Manage leads, track installs, close deals faster.',
    stats: [
      { num: '500+', label: 'Projects delivered' },
      { num: '98%',  label: 'Customer satisfaction' },
      { num: '24/7', label: 'Support available' },
    ],
  },
  {
    badgeIcon: 'view_kanban', badgeIconClass: 'icon-pipeline',
    badgeText: 'Lead', badgeSuffix: 'Pipeline',
    lines: ['Every lead.', 'Every stage.'],
    accent: 'Every deal.',
    desc: 'Track your entire sales pipeline from first contact to closed contract, in real time.',
    stats: [
      { num: '18',   label: 'Pipeline stages' },
      { num: 'Live', label: 'Real-time updates' },
      { num: 'Full', label: 'Team visibility' },
    ],
  },
  {
    badgeIcon: 'auto_awesome', badgeIconClass: 'icon-ai',
    badgeText: 'Aurora', badgeSuffix: 'AI Design',
    lines: ['Solar proposals', 'ready in'],
    accent: 'seconds.',
    desc: 'AI-powered solar design via Aurora integration. Professional proposals, instantly generated.',
    stats: [
      { num: 'AI',  label: 'Auto-design' },
      { num: '3×',  label: 'Faster proposals' },
      { num: 'PDF', label: 'Branded output' },
    ],
  },
  {
    badgeIcon: 'phone_iphone', badgeIconClass: 'icon-mobile',
    badgeText: 'Mobile', badgeSuffix: 'First',
    lines: ['Close deals', 'from'],
    accent: 'anywhere.',
    desc: 'iOS and Android apps for your field team. Manage pipeline, track commissions, stay synced.',
    stats: [
      { num: 'iOS',  label: 'App ready' },
      { num: 'APK',  label: 'Android ready' },
      { num: '24/7', label: 'Access' },
    ],
  },
];

const currentSlide = ref(0);
let slideTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  slideTimer = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % slides.length;
  }, 3500);
});

onUnmounted(() => {
  if (slideTimer) clearInterval(slideTimer);
});
</script>

<style lang="scss" scoped>
@use '@/css/login-animations.scss';
.auth-page {
  min-height: 100vh;
  padding: 0 !important;
}

.auth-split {
  display: flex;
  min-height: 100vh;

  @media (max-width: 900px) {
    flex-direction: column;
  }
}

// ── Left branding ──
.brand-side {
  flex: 1;
  background: linear-gradient(145deg, #0A1929 0%, #0D2137 35%, #14344A 70%, #1B6B6E 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  position: relative;
  overflow: hidden;

  @media (max-width: 900px) {
    flex: none;
    height: 220px;
    padding: 28px 32px;
    align-items: center;
    justify-content: center;
  }
}

// Hide solar grid on mobile (it looks like a weird square)
@media (max-width: 900px) {
  .solar-grid { display: none !important; }
}

.brand-content {
  position: relative;
  z-index: 1;
  max-width: 460px;

  @media (max-width: 900px) {
    display: none;
  }
}

.brand-mobile {
  display: none;
  position: relative;
  z-index: 1;

  @media (max-width: 900px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
  }
}

.brand-mobile-logo {
  height: 36px;
  margin-bottom: 6px;
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

  .accent {
    background: linear-gradient(90deg, #00D4AA, #7EFF4A);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 32px;
  backdrop-filter: blur(8px);
}

// ── Badge icons — one animation per slide ──

// Slide 0: bolt — energy flash
.icon-bolt {
  color: #34D399;
  animation: bolt-flash 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.6));
}
@keyframes bolt-flash {
  0%, 100% { opacity: 1; transform: scale(1);    filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.6)); }
  40%       { opacity: 0.4; transform: scale(0.85); filter: drop-shadow(0 0 2px rgba(52, 211, 153, 0.2)); }
  55%       { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 10px rgba(52, 211, 153, 1)); }
  70%       { opacity: 1; transform: scale(1);    filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.6)); }
}

// Slide 1: kanban — soft pulse in/out
.icon-pipeline {
  color: #00D4AA;
  animation: pipeline-pulse 2s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(0, 212, 170, 0.5));
}
@keyframes pipeline-pulse {
  0%, 100% { transform: scale(1);    opacity: 1; }
  50%       { transform: scale(1.18); opacity: 0.8; filter: drop-shadow(0 0 8px rgba(0, 212, 170, 0.9)); }
}

// Slide 2: auto_awesome — slow spin with sparkle glow
.icon-ai {
  color: #7EFF4A;
  animation: ai-spin 4s linear infinite, ai-glow 2s ease-in-out infinite alternate;
}
@keyframes ai-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes ai-glow {
  from { filter: drop-shadow(0 0 3px rgba(126, 255, 74, 0.5)); }
  to   { filter: drop-shadow(0 0 12px rgba(126, 255, 74, 1)); }
}

// Slide 3: phone — gentle float up/down
.icon-mobile {
  color: #00D4AA;
  animation: mobile-float 2.5s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(0, 212, 170, 0.5));
}
@keyframes mobile-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-4px); filter: drop-shadow(0 0 8px rgba(0, 212, 170, 0.8)); }
}

// "ecoLoop" com gradiente teal → verde
.eco-brand {
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
  font-size: 46px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.12;
  letter-spacing: -0.03em;
  margin: 0 0 20px;

  .accent {
    background: linear-gradient(90deg, #00D4AA, #7EFF4A);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.brand-desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 0 0 36px;
}

// ── Slide stats ──
.slide-stats {
  display: flex;
  gap: 28px;
}

.slide-stat-num {
  font-size: 26px;
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

// ── Dots ──
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

// ── Slide transition ──
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

.brand-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.c1 { width: 500px; height: 500px; top: -150px; right: -150px; }
.c2 { width: 350px; height: 350px; bottom: -100px; left: -80px; }
.c3 { width: 200px; height: 200px; top: 40%; left: 55%; border-color: rgba(52, 211, 153, 0.08); }

// ── Right form ──
.form-side {
  flex: 0 0 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: #FFFFFF;
  overflow-y: auto;

  @media (max-width: 900px) {
    flex: 1;
    padding: 32px 24px 40px;
    align-items: flex-start;
  }
}

.form-wrapper {
  width: 100%;
  max-width: 380px;

  @media (max-width: 900px) {
    max-width: 100%;
  }
}

.form-header {
  text-align: center;
  margin-bottom: 24px;

  @media (max-width: 900px) {
    display: none; // Logo already shown in brand header on mobile
  }
}

.auth-logo {
  height: 36px;
}

.role-badge-wrapper {
  margin-top: 8px;
  margin-bottom: 4px;
}

.role-badge {
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
}

.role-badge-icon {
  color: #00897B !important;
  animation: badge-bolt 2.4s ease-in-out infinite;
}

@keyframes badge-bolt {
  0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 2px rgba(0, 137, 123, 0.3)); }
  40%      { opacity: 0.5; transform: scale(0.85); }
  55%      { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 8px rgba(0, 137, 123, 0.7)); }
  70%      { opacity: 1; transform: scale(1); }
}

.form-footer {
  text-align: center;
  margin-top: 32px;
  font-size: 12px;
  color: #9CA3AF;
}
</style>
