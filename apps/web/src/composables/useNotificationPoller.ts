import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

export interface AppNotification {
  id: string;
  event: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

const ICON_MAP: Record<string, string> = {
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

export function useNotificationPoller(intervalMs = 30000) {
  const notifications = ref<AppNotification[]>([]);
  const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length);
  let timer: ReturnType<typeof setInterval> | null = null;

  const $q = useQuasar();

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/notifications');
      notifications.value = Array.isArray(data) ? data : ((data as { data?: AppNotification[] }).data ?? []);
    } catch {
      // silent — notifications are non-critical
    }
  }

  async function openNotification(n: AppNotification) {
    if (!n.isRead) {
      try {
        await api.put(`/notifications/${n.id}/read`);
        n.isRead = true;
      } catch { /* ignore */ }
    }
    $q.dialog({
      title: n.title,
      message: n.message,
      ok: 'Close',
    });
  }

  function iconFor(type: string): string {
    return ICON_MAP[type] ?? 'notifications';
  }

  function timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function start() {
    fetchNotifications();
    timer = setInterval(fetchNotifications, intervalMs);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  onMounted(start);
  onUnmounted(stop);

  return { notifications, unreadCount, fetchNotifications, openNotification, iconFor, timeAgo };
}
