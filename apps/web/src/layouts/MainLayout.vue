<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="main-header" bordered>
      <q-toolbar class="q-px-md">
        <img src="/logo_short_dark.svg" alt="ecoLoop" style="height: 26px" class="q-mr-sm" />
        <span class="text-weight-bold text-grey-8" style="font-size: 15px">Sales</span>
        <q-space />
        <q-btn flat round dense icon="notifications_none" color="grey-7" class="q-mr-xs">
          <q-badge v-if="unreadCount > 0" floating color="negative" :label="unreadCount" />
          <q-menu anchor="bottom right" self="top right" style="min-width: 320px; border-radius: 12px">
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
                <q-item-section class="text-center text-grey-5" style="font-size: 13px">No new notifications</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-ripple v-close-popup @click="$router.push('/notifications')">
                <q-item-section class="text-center text-primary text-weight-medium" style="font-size: 13px">View all</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-avatar size="34px" color="primary" text-color="white" class="cursor-pointer">
          <span style="font-size: 13px; font-weight: 600">{{ userInitials }}</span>
          <q-menu anchor="bottom right" self="top right" style="min-width: 180px; border-radius: 12px">
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
      <router-view />
    </q-page-container>

    <q-footer class="main-footer" bordered>
      <q-tabs
        v-model="activeTab"
        active-color="primary"
        indicator-color="primary"
        class="footer-tabs"
        dense
        no-caps
      >
        <q-tab name="home" icon="home" label="Home" @click="$router.push('/home')" />
        <q-tab name="leads" icon="add_circle" label="New Lead" @click="$router.push('/leads/new')" />
        <q-tab name="referrals" icon="group_add" label="Referrals" @click="$router.push('/referrals')" />
        <q-tab name="support" icon="chat" label="Support" @click="$router.push('/support')" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/boot/axios';

const router = useRouter();
const authStore = useAuthStore();

const $q = useQuasar();

interface AppNotification {
  id: string;
  event: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

const route = useRoute();
const activeTab = ref('home');
const notifications = ref<AppNotification[]>([]);
const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length);
const userName = ref('');
provide('userName', userName);
const userInitials = computed(() => {
  if (!userName.value) return 'U';
  return userName.value.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
});

let pollInterval: ReturnType<typeof setInterval> | null = null;

async function fetchNotifications() {
  try {
    const { data } = await api.get('/notifications');
    const items = Array.isArray(data) ? data : (data as any).data ?? [];
    notifications.value = items;
  } catch {
    // No notifications
  }
}

async function fetchUser() {
  try {
    const { data } = await api.get('/users/me');
    userName.value = data.nickname || data.firstName || `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
    // Persist for chat and other components
    localStorage.setItem('user', JSON.stringify({
      id: data.id,
      name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role,
    }));
  } catch { /* ignore */ }
}

onMounted(() => {
  fetchUser();
  fetchNotifications();
  pollInterval = setInterval(fetchNotifications, 30000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

async function openNotification(n: AppNotification) {
  if (!n.isRead) {
    try { await api.put(`/notifications/${n.id}/read`); n.isRead = true; } catch { /* ignore */ }
  }
  $q.dialog({
    title: n.title,
    message: n.message,
    ok: 'Close',
  });
}

function handleLogout() {
  authStore.logout();
  router.push('/auth/login');
}

function iconFor(type: string) {
  const map: Record<string, string> = {
    LEAD_CREATED: 'person_add',
    LEAD_ASSIGNED: 'person_add',
    LEAD_UNASSIGNED: 'person_remove',
    LEAD_STAGE_CHANGED: 'swap_horiz',
    LEAD_PM_ASSIGNED: 'manage_accounts',
    LEAD_PM_REMOVED: 'person_off',
    LEAD_UPDATED: 'edit',
    LEAD_NOTE_ADDED: 'comment',
    DESIGN_COMPLETED: 'check_circle',
    APPOINTMENT_BOOKED: 'event',
    COMMISSION_FINALIZED: 'payments',
    SYSTEM: 'info',
  };
  return map[type] ?? 'notifications';
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
.main-header {
  background: #FFFFFF;
  border-bottom: 1px solid #E5E7EB;
}

.main-footer {
  background: #FFFFFF;
  border-top: 1px solid #E5E7EB;
}

.footer-tabs {
  :deep(.q-tab) {
    font-size: 11px;
    min-height: 56px;
    color: #9CA3AF;

    &.q-tab--active {
      color: #00897B;
    }
  }
}
</style>
