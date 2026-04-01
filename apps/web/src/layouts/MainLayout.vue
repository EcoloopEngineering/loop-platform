<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="main-header" bordered>
      <q-toolbar class="q-px-md">
        <img src="/logo_short_dark.svg" alt="ecoLoop" class="main-logo q-mr-sm" />
        <span class="text-weight-bold text-grey-8 text-15">Sales</span>
        <q-space />
        <q-btn v-if="userRole === 'ADMIN'" flat dense round icon="admin_panel_settings" color="grey-7" @click="$router.push('/crm')" aria-label="Admin Panel">
          <q-tooltip>Admin Panel</q-tooltip>
        </q-btn>
        <q-btn v-if="!isPartner" flat dense no-caps color="amber-8" class="q-mr-xs coin-btn" @click="$router.push('/admin/rewards')" aria-label="Your coins">
          <q-icon name="monetization_on" size="20px" class="q-mr-xs" />
          <span class="text-weight-bold">{{ coinBalance }}</span>
          <q-tooltip>Your coins — Visit Store</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="notifications_none" color="grey-7" class="q-mr-xs" aria-label="Notifications">
          <q-badge v-if="unreadCount > 0" floating color="negative" :label="unreadCount" />
          <q-menu anchor="bottom right" self="top right" class="min-w-320 radius-lg">
            <q-list>
              <q-item-label header class="text-weight-bold">Notifications</q-item-label>
              <template v-if="notifications.length > 0">
                <q-item v-for="n in notifications.slice(0, 5)" :key="n.id" clickable v-ripple v-close-popup :class="{ 'bg-blue-1': !n.isRead }" @click="openNotification(n)">
                  <q-item-section avatar>
                    <q-icon :name="iconFor(n.event)" :color="!n.isRead ? 'primary' : 'grey-5'" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ n.title }}</q-item-label>
                    <q-item-label caption>{{ n.message }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-item-label caption>{{ timeAgo(n.createdAt) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
              <q-item v-else>
                <q-item-section class="text-center text-grey-5 text-13">No new notifications</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-ripple v-close-popup @click="$router.push('/notifications')">
                <q-item-section class="text-center text-primary text-weight-medium text-13">View all</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-avatar size="36px" color="primary" text-color="white" class="cursor-pointer" role="button" aria-label="User menu" tabindex="0">
          <q-img v-if="userAvatar" :src="userAvatar" />
          <span v-else class="avatar-text-lg text-weight-bold">{{ userInitials }}</span>
          <q-menu anchor="bottom right" self="top right" class="menu-md radius-lg">
            <q-list>
              <q-item clickable v-close-popup @click="$router.push('/profile')">
                <q-item-section avatar><q-icon name="person" size="20px" /></q-item-section>
                <q-item-section>Profile</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="handleLogout">
                <q-item-section avatar><q-icon name="logout" size="20px" color="negative" /></q-item-section>
                <q-item-section class="text-negative">Log Out</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-avatar>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-if="!showTerms" />
      <q-page v-else class="flex flex-center" style="min-height: 80vh">
        <div class="text-center">
          <q-spinner-dots color="primary" size="40px" />
          <div class="text-grey-6 q-mt-md">Loading...</div>
        </div>
      </q-page>
    </q-page-container>

    <TermsDialog v-model="showTerms" @accepted="onTermsAccepted" />

    <q-footer class="main-footer" bordered>
      <div class="footer-gradient-bar" />
      <q-tabs
        v-model="activeTab"
        active-color="primary"
        indicator-color="primary"
        class="footer-tabs"
        dense
        no-caps
      >
        <q-tab name="home" icon="home" label="Home" aria-label="Go to home page" @click="$router.push('/home')" />
        <q-tab name="leads" icon="add_circle" label="New Lead" aria-label="Create a new lead" @click="$router.push('/leads/new')" />
        <q-tab v-if="isEmployee && !isPartner" name="referrals" icon="group_add" label="Referrals" aria-label="View referrals" @click="$router.push('/referrals')" />
        <q-tab name="support" icon="chat" label="Support" aria-label="Open support chat" @click="$router.push('/support')" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useUserStore } from '@/stores/user.store';
import { useNotificationPoller } from '@/composables/useNotificationPoller';
import { useThemeSync } from '@/composables/useThemeSync';
import { api } from '@/boot/axios';
import TermsDialog from '@/components/common/TermsDialog.vue';

const router = useRouter();
const authStore = useAuthStore();
const userStore = useUserStore();

const userRole = computed(() => userStore.user?.role ?? 'SALES_REP');

const route = useRoute();
const activeTab = ref('home');

// Notification polling (30s interval)
const { notifications, unreadCount, openNotification, iconFor, timeAgo } = useNotificationPoller();

// User identity + dark mode sync
const { userName, userEmail, userAvatar, userInitials } = useThemeSync();

const isEmployee = computed(() => userEmail.value.endsWith('@ecoloop.us'));
const isPartner = computed(() => userRole.value === 'REFERRAL');
provide('userName', userName);

// Terms acceptance — block UI until accepted
const termsNeeded = computed(() => !!userStore.user && !userStore.user.termsAcceptedAt);
const showTerms = ref(false);

watch(termsNeeded, (v) => { if (v) showTerms.value = true; }, { immediate: true });

function onTermsAccepted() {
  showTerms.value = false;
}

// Coin balance
const coinBalance = ref(0);
onMounted(async () => {
  try {
    const { data } = await api.get('/gamification/balance');
    coinBalance.value = data?.balance ?? data?.coins ?? 0;
  } catch { /* ignore */ }
});

function handleLogout() {
  authStore.logout();
  router.push('/auth/login');
}

watch(
  () => route.path,
  (path) => {
    if (path.includes('/home')) activeTab.value = 'home';
    else if (path.includes('/leads')) activeTab.value = 'leads';
    else if (path.includes('/referrals')) activeTab.value = 'referrals';
    else if (path.includes('/support')) activeTab.value = 'support';
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.main-logo {
  height: 26px;
}

.main-header {
  background: #FFFFFF;
  border-bottom: 1px solid #F3F4F6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.main-footer {
  background: #FFFFFF;
  border: none;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
}

.footer-gradient-bar {
  height: 2px;
  background: linear-gradient(90deg, #042F1E 0%, #00897B 60%, #34D399 100%);
}

.footer-tabs {
  max-width: 480px;
  margin: 0 auto;

  :deep(.q-tab) {
    font-size: 11px;
    min-height: 56px;
    color: #9CA3AF;
    font-weight: 500;
    transition: color 150ms, transform 150ms;

    &.q-tab--active {
      color: #00897B;
      font-weight: 600;
    }

    &:active {
      transform: scale(0.92);
    }
  }
}
</style>
