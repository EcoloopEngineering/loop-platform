<template>
  <q-page class="q-pa-md page-bg">
    <div class="row items-center q-mb-lg">
      <div class="text-h6 text-weight-bold">Notifications</div>
      <q-space />
      <q-btn
        v-if="notifications.length > 0"
        flat
        no-caps
        color="primary"
        label="Mark all as read"
        icon="done_all"
        @click="markAllRead"
      />
    </div>

    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="error" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

    <div v-else-if="notifications.length === 0" class="text-center q-pa-xl">
      <q-icon name="notifications_none" size="64px" color="grey-4" />
      <div class="text-grey-6 q-mt-md text-16">No notifications yet</div>
      <div class="text-grey-5 text-13">You'll see lead updates, system alerts, and more here</div>
    </div>

    <div v-else class="notification-list">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="notification-card"
        :class="{ unread: !n.isRead, expanded: expandedId === n.id }"
        @click="toggle(n)"
      >
        <div class="notification-header">
          <div class="row items-center no-wrap gap-lg">
            <q-icon
              :name="iconFor(n.event)"
              :color="!n.isRead ? 'primary' : 'grey-5'"
              size="22px"
            />
            <div class="col">
              <div class="notification-title">{{ n.title }}</div>
              <div class="notification-time">{{ timeAgo(n.createdAt) }}</div>
            </div>
            <div class="row items-center gap-xs">
              <q-icon
                v-if="n.isRead"
                name="done"
                color="positive"
                size="18px"
              >
                <q-tooltip>Read</q-tooltip>
              </q-icon>
              <div v-else class="unread-dot" />
              <q-icon
                :name="expandedId === n.id ? 'expand_less' : 'expand_more'"
                color="grey-5"
                size="20px"
              />
            </div>
          </div>
        </div>

        <q-slide-transition>
          <div v-show="expandedId === n.id" class="notification-body">
            <q-separator class="q-my-sm" />
            <div class="notification-message">{{ n.message }}</div>
            <div class="row items-center q-mt-sm gap-sm">
              <q-chip
                dense
                :color="!n.isRead ? 'blue-1' : 'grey-2'"
                :text-color="!n.isRead ? 'primary' : 'grey-6'"
                :icon="!n.isRead ? 'circle' : 'done'"
                size="sm"
              >
                {{ n.isRead ? 'Read' : 'Unread' }}
              </q-chip>
              <q-chip dense color="grey-2" text-color="grey-6" size="sm">
                {{ formatDate(n.createdAt) }}
              </q-chip>
              <q-space />
              <q-btn
                v-if="!n.isRead"
                flat
                dense
                no-caps
                color="primary"
                label="Mark as read"
                icon="done"
                size="sm"
                @click.stop="markRead(n)"
              />
            </div>
          </div>
        </q-slide-transition>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/boot/axios';

interface Notification {
  id: string;
  event: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

const notifications = ref<Notification[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const expandedId = ref<string | null>(null);

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get<Notification[]>('/notifications');
    notifications.value = Array.isArray(data) ? data : (data as { data?: Notification[] }).data ?? [];
  } catch {
    error.value = 'Failed to load notifications. Please try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => { loadData(); });

function toggle(n: Notification) {
  expandedId.value = expandedId.value === n.id ? null : n.id;
}

async function markRead(n: Notification) {
  if (n.isRead) return;
  try {
    await api.put(`/notifications/${n.id}/read`);
    n.isRead = true;
  } catch { /* ignore */ }
}

async function markAllRead() {
  try {
    await api.put('/notifications/read-all');
    notifications.value.forEach((n) => { n.isRead = true; });
  } catch { /* ignore */ }
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

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
</script>

<style lang="scss" scoped>
.notification-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #D1D5DB;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &.unread {
    border-left: 3px solid #00897B;
    background: #F0FDFA;
  }

  &.expanded {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A2E;
}

.notification-time {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 1px;
}

.notification-body {
  padding-top: 4px;
}

.notification-message {
  font-size: 14px;
  color: #4B5563;
  line-height: 1.5;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00897B;
}
</style>
