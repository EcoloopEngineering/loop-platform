<template>
  <q-page class="home-page q-pa-md">
    <!-- Greeting -->
    <div class="q-mb-md">
      <div class="greeting-text">{{ greeting }}<span v-if="displayName" class="greeting-name">, {{ displayName }}</span></div>
      <div class="greeting-sub">Here's your sales overview</div>
    </div>

    <!-- Stats -->
    <div class="row q-col-gutter-sm q-mb-lg">
      <div class="col-6" v-for="stat in stats" :key="stat.label">
        <div class="stat-card">
          <div class="row items-center q-mb-xs" style="gap: 6px">
            <q-icon :name="stat.icon" :color="stat.color" size="16px" />
            <span class="stat-label">{{ stat.label }}</span>
          </div>
          <div class="stat-value">{{ stat.value }}</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="q-mb-lg">
      <div class="section-title q-mb-sm">Quick Actions</div>
      <div class="row q-col-gutter-sm">
        <div class="col-6">
          <q-btn unelevated no-caps color="primary" text-color="white" icon="add" label="New Lead" class="full-width action-btn" @click="$router.push('/leads/new')" />
        </div>
        <div class="col-6">
          <q-btn outline no-caps color="primary" icon="share" label="Invite" class="full-width action-btn" @click="$router.push('/referrals')" />
        </div>
      </div>
    </div>

    <!-- My Leads -->
    <div class="q-mb-lg">
      <div class="row items-center q-mb-sm">
        <div class="section-title">My Leads</div>
        <q-space />
        <q-btn flat dense no-caps color="primary" label="View all" @click="$router.push('/crm/pipeline')" size="sm" />
      </div>

      <div v-if="loadingLeads" class="text-center q-pa-md">
        <q-spinner-dots color="primary" size="30px" />
      </div>

      <div v-else-if="myLeads.length === 0">
        <q-card flat>
          <q-card-section class="text-center q-pa-lg">
            <q-icon name="person_search" size="40px" color="grey-4" />
            <div class="text-grey-6 q-mt-sm" style="font-size: 13px">No leads assigned to you yet</div>
          </q-card-section>
        </q-card>
      </div>

      <div v-else class="lead-list">
        <q-card v-for="lead in myLeads" :key="lead.id" flat class="lead-card q-mb-xs" clickable @click="$router.push(`/crm/leads/${lead.id}`)">
          <q-card-section class="q-pa-sm">
            <div class="row items-center no-wrap">
              <q-avatar size="32px" color="primary" text-color="white" style="font-size: 12px" class="q-mr-sm">
                {{ lead.initials }}
              </q-avatar>
              <div class="col">
                <div class="text-weight-medium" style="font-size: 13px">{{ lead.name }}</div>
                <div class="text-caption text-grey-5">{{ lead.source }} · {{ lead.timeAgo }}</div>
              </div>
              <q-badge
                :style="{ background: stageColor(lead.stage) }"
                text-color="white"
                style="border-radius: 6px; padding: 2px 8px; font-size: 10px"
              >
                {{ formatStage(lead.stage) }}
              </q-badge>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Recent Activity -->
    <div>
      <div class="section-title q-mb-sm">Recent Activity</div>
      <q-card flat>
        <q-list v-if="activities.length" separator>
          <q-item v-for="a in activities" :key="a.id" dense>
            <q-item-section avatar>
              <q-avatar size="28px" :color="activityColor(a.event)" text-color="white">
                <q-icon :name="activityIcon(a.event)" size="14px" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label style="font-size: 12px">{{ a.message || a.title }}</q-item-label>
              <q-item-label caption style="font-size: 11px">{{ timeAgo(a.createdAt) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <q-card-section v-else class="text-center q-pa-lg">
          <q-icon name="inbox" size="40px" color="grey-4" />
          <div class="text-grey-6 q-mt-sm" style="font-size: 13px">No recent activity</div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue';
import type { Ref } from 'vue';
import { api } from '@/boot/axios';

const loadingLeads = ref(true);
const leads = ref<any[]>([]);
const activities = ref<any[]>([]);
const injectedName = inject<Ref<string>>('userName', ref(''));
const displayName = computed(() => injectedName?.value || '');

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
});

const totalLeads = computed(() => leads.value.length);
const wonLeads = computed(() => leads.value.filter((l) => l.currentStage === 'WON').length);
const referralLeads = computed(() => leads.value.filter((l) => l.source === 'REFERRAL').length);
const conversionRate = computed(() => {
  if (totalLeads.value === 0) return 0;
  return Math.round((wonLeads.value / totalLeads.value) * 100);
});

const stats = computed(() => [
  { label: 'Total Leads', value: String(totalLeads.value), icon: 'people', color: 'primary' },
  { label: 'Referrals', value: String(referralLeads.value), icon: 'group_add', color: 'purple' },
  { label: 'Closed Won', value: String(wonLeads.value), icon: 'emoji_events', color: 'positive' },
  { label: 'Conversion', value: `${conversionRate.value}%`, icon: 'trending_up', color: 'orange-8' },
]);

const myLeads = computed(() =>
  leads.value
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((l) => ({
      id: l.id,
      name: `${l.customer?.firstName ?? ''} ${l.customer?.lastName ?? ''}`.trim() || 'Unknown',
      initials: `${l.customer?.firstName?.charAt(0) ?? ''}${l.customer?.lastName?.charAt(0) ?? ''}`.toUpperCase() || '?',
      stage: l.currentStage,
      source: formatSource(l.source),
      timeAgo: timeAgo(l.createdAt),
    })),
);

onMounted(async () => {
  try {
    const [leadsRes, notifsRes] = await Promise.all([
      api.get('/leads', { params: { limit: 100 } }),
      api.get('/notifications').catch(() => ({ data: { data: [] } })),
    ]);
    const leadsData = leadsRes.data;
    leads.value = Array.isArray(leadsData) ? leadsData : leadsData.data ?? [];

    const notifsData = notifsRes.data;
    activities.value = (Array.isArray(notifsData) ? notifsData : notifsData.data ?? []).slice(0, 5);
  } catch {
    // fallback
  } finally {
    loadingLeads.value = false;
  }
});

const STAGE_COLORS: Record<string, string> = {
  NEW_LEAD: '#4CAF50', REQUEST_DESIGN: '#2196F3', DESIGN_IN_PROGRESS: '#FF9800',
  DESIGN_READY: '#9C27B0', PENDING_SIGNATURE: '#F44336', SIT: '#607D8B',
  WON: '#00897B', LOST: '#EF4444',
};

function stageColor(s: string) { return STAGE_COLORS[s] ?? '#9E9E9E'; }
function formatStage(s: string) { return (s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
function formatSource(s: string) { return (s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ICONS: Record<string, string> = {
  LEAD_ASSIGNED: 'person_add', STAGE_CHANGE: 'swap_horiz', DESIGN_COMPLETED: 'check_circle',
  APPOINTMENT_BOOKED: 'event', ASSIGNMENT_CHANGED: 'group',
};
const COLORS: Record<string, string> = {
  LEAD_ASSIGNED: 'positive', STAGE_CHANGE: 'primary', DESIGN_COMPLETED: 'purple',
  APPOINTMENT_BOOKED: 'blue', ASSIGNMENT_CHANGED: 'teal',
};
function activityIcon(t: string) { return ICONS[t] ?? 'info'; }
function activityColor(t: string) { return COLORS[t] ?? 'grey-6'; }
</script>

<style lang="scss" scoped>
.home-page { background: #F8FAFB; min-height: 100vh; }
.greeting-text {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A2E;
  .greeting-name { color: #00897B; }
}
.greeting-sub { font-size: 14px; color: #9CA3AF; margin-top: 2px; }

.stat-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 14px;
  padding: 14px 16px;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    border-color: rgba(0, 137, 123, 0.2);
  }

  .stat-label { font-size: 12px; color: #9CA3AF; font-weight: 500; }
  .stat-value { font-size: 26px; font-weight: 700; color: #1A1A2E; margin-top: 2px; }
}
.section-title { font-size: 14px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em; }
.action-btn { border-radius: 12px; font-weight: 600; padding: 10px 16px; }

.lead-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  transition: all 0.15s;
  cursor: pointer;
  &:hover { border-color: #00897B; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
}
</style>
