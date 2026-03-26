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
        <q-avatar size="36px" color="primary" text-color="white" class="q-ml-sm cursor-pointer">
          <q-img v-if="userAvatar" :src="userAvatar" />
          <span v-else style="font-size: 13px; font-weight: 600">{{ userInitials }}</span>
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
          :exact="item.exact"
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
      <router-view :key="$route.fullPath" />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth.store';
import { useUserStore } from '@/stores/user.store';
import { api } from '@/boot/axios';

const router = useRouter();
const authStore = useAuthStore();
const userStore = useUserStore();

const userInitials = computed(() => {
  const u = userStore.user;
  if (!u?.name) return 'A';
  return u.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
});

const apiBase = (process.env.API_URL ?? 'http://localhost:3000');
const userAvatar = ref<string | null>(null);

function handleLogout() {
  authStore.logout();
  router.push('/auth/login');
}

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

async function fetchUser() {
  try {
    const { data } = await api.get('/users/me');
    // Update store
    userStore.$patch({
      user: {
        id: data.id,
        name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
        email: data.email,
        role: data.role,
        profileImage: data.profileImage ?? null,
      },
    });
    // Persist for avatar
    localStorage.setItem('user', JSON.stringify({
      id: data.id,
      name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role,
      profileImage: data.profileImage ?? null,
    }));
    // Update avatar reactively
    const img = data.profileImage;
    userAvatar.value = img?.startsWith('/api/') ? `${apiBase}${img}` : img || null;
    // Restore dark mode from user profile
    if (data.darkMode !== undefined) {
      localStorage.setItem('darkMode', data.darkMode ? '1' : '0');
      $q.dark.set(!!data.darkMode);
    }
    if (data.compactView !== undefined) {
      localStorage.setItem('compactView', data.compactView ? '1' : '0');
      document.body.classList.toggle('compact-view', !!data.compactView);
    }
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

// Role-based navigation
const userRole = computed(() => {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.user?.role ?? parsed?.role ?? 'SALES_REP';
    }
  } catch { /* ignore */ }
  return 'SALES_REP';
});

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', route: '/crm', exact: true },
  { label: 'Pipeline', icon: 'view_kanban', route: '/crm/pipeline', exact: false },
  { label: 'Tasks', icon: 'task_alt', route: '/crm/tasks', exact: false },
  { label: 'Customers', icon: 'people', route: '/crm/customers', exact: false },
  { label: 'Financiers', icon: 'account_balance', route: '/crm/financiers', exact: false },
];

const allAdminItems = [
  { label: 'Scoreboard', icon: 'leaderboard', route: '/admin/scoreboard', roles: ['ADMIN', 'MANAGER'] },
  { label: 'Rewards', icon: 'card_giftcard', route: '/admin/rewards', roles: ['ADMIN', 'MANAGER', 'SALES_REP'] },
  { label: 'Users', icon: 'manage_accounts', route: '/admin/users', roles: ['ADMIN'] },
  { label: 'Commissions', icon: 'payments', route: '/admin/commissions', roles: ['ADMIN'] },
  { label: 'Live Chat', icon: 'forum', route: '/admin/live-chat', roles: ['ADMIN'] },
  { label: 'Notifications', icon: 'notifications', route: '/admin/notifications', roles: ['ADMIN', 'MANAGER'] },
  { label: 'Settings', icon: 'settings', route: '/admin/settings', roles: ['ADMIN', 'MANAGER'] },
];

const adminItems = computed(() =>
  allAdminItems.filter((item) => item.roles.includes(userRole.value)),
);
</script>

<style lang="scss" scoped>
.admin-header {
  background: #FFFFFF;
  border-bottom: 1px solid #F3F4F6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.admin-drawer {
  background: #FAFBFC;
  border-right: 1px solid #F3F4F6;
}

.nav-item {
  border-radius: 8px;
  margin: 2px 10px;
  color: #6B7280;
  min-height: 40px;
  font-size: 14px;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: #F3F4F6;
    color: #374151;
  }
}

.active-item {
  color: #00897B !important;
  background: rgba(0, 137, 123, 0.1) !important;
  font-weight: 600;

  :deep(.q-icon) {
    color: #00897B;
  }
}

.body--dark .active-item {
  color: #00E5C8 !important;
  background: rgba(0, 137, 123, 0.12) !important;

  :deep(.q-icon) {
    color: #00E5C8;
  }
}
</style>
