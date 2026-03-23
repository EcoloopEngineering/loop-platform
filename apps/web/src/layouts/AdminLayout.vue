<template>
  <q-layout view="hHh LpR fFf">
    <q-header class="admin-header" bordered>
      <q-toolbar>
        <q-btn flat round dense icon="menu" color="grey-7" @click="drawerOpen = !drawerOpen" class="lt-md" />
        <img src="/logo_short_dark.svg" alt="ecoLoop" style="height: 24px" class="q-mr-sm" />
        <span class="text-weight-bold text-grey-8" style="font-size: 15px">Admin</span>
        <q-space />
        <q-btn flat round dense icon="notifications_none" color="grey-7">
          <q-badge v-if="unreadCount > 0" color="negative" floating>{{ unreadCount }}</q-badge>
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
                <q-item-section class="text-center text-grey-5" style="font-size: 13px">No notifications</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-ripple v-close-popup @click="$router.push('/admin/notifications')">
                <q-item-section class="text-center text-primary text-weight-medium" style="font-size: 13px">View all</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-avatar size="30px" color="primary" text-color="white" class="q-ml-sm cursor-pointer" @click="$router.push('/profile')">
          <span style="font-size: 12px; font-weight: 600">A</span>
        </q-avatar>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" show-if-above bordered class="admin-drawer" :width="220" :mini-width="60">
      <q-list padding>
        <q-item-label header class="text-grey-5 text-weight-bold text-uppercase" style="font-size: 11px; letter-spacing: 0.06em">
          CRM
        </q-item-label>

        <q-item
          v-for="item in navItems"
          :key="item.route"
          clickable
          v-ripple
          :to="item.route"
          active-class="active-item"
          class="nav-item"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" size="20px" />
          </q-item-section>
          <q-item-section class="text-weight-medium" style="font-size: 14px">{{ item.label }}</q-item-section>
        </q-item>

        <q-separator class="q-my-md" style="background: #E5E7EB" />

        <q-item-label header class="text-grey-5 text-weight-bold text-uppercase" style="font-size: 11px; letter-spacing: 0.06em">
          Admin
        </q-item-label>

        <q-item
          v-for="item in adminItems"
          :key="item.route"
          clickable
          v-ripple
          :to="item.route"
          active-class="active-item"
          class="nav-item"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" size="20px" />
          </q-item-section>
          <q-item-section class="text-weight-medium" style="font-size: 14px">{{ item.label }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

const $q = useQuasar();

interface Notification {
  id: string;
  event: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

const drawerOpen = ref(false);
const notifications = ref<Notification[]>([]);
const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length);

let pollInterval: ReturnType<typeof setInterval> | null = null;

async function fetchNotifications() {
  try {
    const { data } = await api.get('/notifications');
    notifications.value = Array.isArray(data) ? data : (data as any).data ?? [];
  } catch {
    // API may not have notifications
  }
}

onMounted(() => {
  fetchNotifications();
  pollInterval = setInterval(fetchNotifications, 30000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

async function openNotification(n: Notification) {
  if (!n.isRead) {
    try { await api.put(`/notifications/${n.id}/read`); n.isRead = true; } catch { /* ignore */ }
  }
  $q.dialog({
    title: n.title,
    message: n.message,
    html: false,
    ok: 'Close',
  });
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

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', route: '/crm' },
  { label: 'Pipeline', icon: 'view_kanban', route: '/crm/pipeline' },
  { label: 'Customers', icon: 'people', route: '/crm/customers' },
];

const adminItems = [
  { label: 'Scoreboard', icon: 'leaderboard', route: '/admin/scoreboard' },
  { label: 'Users', icon: 'manage_accounts', route: '/admin/users' },
  { label: 'Live Chat', icon: 'forum', route: '/admin/live-chat' },
  { label: 'Notifications', icon: 'notifications', route: '/admin/notifications' },
  { label: 'Settings', icon: 'settings', route: '/admin/settings' },
];
</script>

<style lang="scss" scoped>
.admin-header {
  background: #FFFFFF;
  border-bottom: 1px solid #E5E7EB;
}

.admin-drawer {
  background: #FFFFFF;
  border-right: 1px solid #E5E7EB;
}

.nav-item {
  border-radius: 8px;
  margin: 2px 8px;
  color: #6B7280;
  min-height: 42px;

  &:hover {
    background: #F3F4F6;
  }
}

.active-item {
  color: #00897B !important;
  background: #E0F2F1 !important;
}
</style>
