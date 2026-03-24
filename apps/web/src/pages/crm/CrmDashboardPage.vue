<template>
  <q-page class="q-pa-md" style="background: #F8FAFB">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold">CRM Dashboard</h5>
      <q-space />
      <q-btn unelevated no-caps color="primary" icon="add" label="New Lead" @click="$router.push('/leads/new')" style="border-radius: 10px" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <template v-else>
      <!-- Metric cards -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div v-for="card in metricCards" :key="card.label" class="col-6 col-md-3">
          <q-card flat class="metric-card">
            <q-card-section>
              <div class="row items-center q-gutter-x-sm q-mb-sm">
                <q-avatar size="36px" :color="card.bgColor" text-color="white">
                  <q-icon :name="card.icon" size="16px" />
                </q-avatar>
                <span class="text-caption text-grey-6 text-weight-medium">{{ card.label }}</span>
              </div>
              <div class="text-h4 text-weight-bold" style="color: #1A1A2E">{{ card.value }}</div>
              <div v-if="card.subtitle" class="text-caption text-grey-5 q-mt-xs">
                {{ card.subtitle }}
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md q-mb-lg">
        <!-- Pipeline Distribution -->
        <div class="col-12 col-md-5">
          <q-card flat class="dashboard-card">
            <q-card-section>
              <div class="card-title q-mb-md">Pipeline Distribution</div>
              <div v-if="stageDistribution.length === 0" class="text-grey-5 text-center q-pa-md">
                No leads in pipeline
              </div>
              <div v-else>
                <div v-for="item in stageDistribution" :key="item.stage" class="stage-bar-row q-mb-sm">
                  <div class="row items-center q-mb-xs">
                    <div class="stage-dot" :style="{ background: item.color }" />
                    <span class="text-caption text-weight-medium col">{{ item.label }}</span>
                    <span class="text-caption text-weight-bold">{{ item.count }}</span>
                  </div>
                  <q-linear-progress
                    :value="item.count / Math.max(totalLeads, 1)"
                    :color="item.qColor"
                    track-color="grey-2"
                    rounded
                    style="height: 8px"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Source Breakdown -->
        <div class="col-12 col-md-3">
          <q-card flat class="dashboard-card">
            <q-card-section>
              <div class="card-title q-mb-md">Lead Sources</div>
              <div v-if="sourceBreakdown.length === 0" class="text-grey-5 text-center q-pa-md">
                No data
              </div>
              <div v-else>
                <div v-for="item in sourceBreakdown" :key="item.source" class="q-mb-sm">
                  <div class="row items-center">
                    <q-icon name="circle" :color="item.color" size="10px" class="q-mr-sm" />
                    <span class="text-caption col">{{ item.label }}</span>
                    <q-badge :color="item.color" text-color="white" :label="item.count" />
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Quick Stats -->
        <div class="col-12 col-md-4">
          <q-card flat class="dashboard-card">
            <q-card-section>
              <div class="card-title q-mb-md">Quick Stats</div>
              <q-list dense>
                <q-item v-for="stat in quickStats" :key="stat.label">
                  <q-item-section avatar>
                    <q-icon :name="stat.icon" :color="stat.color" size="20px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-caption">{{ stat.label }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-item-label class="text-weight-bold">{{ stat.value }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Recent Leads + Recent Activity -->
      <div class="row q-col-gutter-md">
        <!-- Recent Leads -->
        <div class="col-12 col-md-7">
          <q-card flat class="dashboard-card">
            <q-card-section>
              <div class="row items-center q-mb-md">
                <div class="card-title">Recent Leads</div>
                <q-space />
                <q-btn flat dense no-caps color="primary" label="View all" @click="$router.push('/crm/pipeline')" />
              </div>

              <q-list v-if="recentLeads.length" separator>
                <q-item v-for="lead in recentLeads" :key="lead.id" clickable @click="$router.push(`/crm/leads/${lead.id}`)">
                  <q-item-section avatar>
                    <UserAvatar :name="titleCase(lead.name)" size="36px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ titleCase(lead.name) }}</q-item-label>
                    <q-item-label caption>{{ lead.email }} · {{ formatSource(lead.source) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge
                      :style="{ background: stageColor(lead.stage) }"
                      text-color="white"
                      style="border-radius: 6px; padding: 3px 8px; font-size: 10px"
                    >
                      {{ formatStage(lead.stage) }}
                    </q-badge>
                    <q-item-label caption class="q-mt-xs">{{ timeAgo(lead.createdAt) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-else class="text-grey-5 text-center q-pa-lg">
                No leads yet. Create your first lead!
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Recent Activity -->
        <div class="col-12 col-md-5">
          <q-card flat class="dashboard-card">
            <q-card-section>
              <div class="card-title q-mb-md">Recent Activity</div>

              <q-list v-if="recentActivity.length" separator>
                <q-item v-for="item in recentActivity" :key="item.id" dense>
                  <q-item-section avatar>
                    <q-avatar size="34px" :color="activityColor(item.type)" text-color="white">
                      <q-icon :name="activityIcon(item.type)" size="14px" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label style="font-size: 12px">{{ item.description }}</q-item-label>
                    <q-item-label caption style="font-size: 11px">{{ timeAgo(item.createdAt) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-else class="text-grey-5 text-center q-pa-lg">
                No recent activity.
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/boot/axios';
import { titleCase } from '@/utils/format';
import UserAvatar from '@/components/common/UserAvatar.vue';

interface LeadData {
  id: string;
  currentStage: string;
  source: string;
  createdAt: string;
  customer?: { firstName: string; lastName: string; email: string };
  score?: { totalScore: string };
  assignments?: { isPrimary: boolean; user: { firstName: string; lastName: string } }[];
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

const loading = ref(true);
const leads = ref<LeadData[]>([]);
const recentActivity = ref<Activity[]>([]);

const totalLeads = computed(() => leads.value.length);
const wonLeads = computed(() => leads.value.filter((l) => l.currentStage === 'WON').length);
const lostLeads = computed(() => leads.value.filter((l) => l.currentStage === 'LOST').length);
const activeLeads = computed(() => leads.value.filter((l) => l.currentStage !== 'WON' && l.currentStage !== 'LOST').length);
const conversionRate = computed(() => {
  if (totalLeads.value === 0) return 0;
  return Math.round((wonLeads.value / totalLeads.value) * 100);
});
const avgScore = computed(() => {
  const scores = leads.value
    .map((l) => Number(l.score?.totalScore ?? 0))
    .filter((s) => s > 0);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
});

const metricCards = computed(() => [
  {
    label: 'Total Leads',
    icon: 'people',
    bgColor: 'primary',
    value: String(totalLeads.value),
    subtitle: `${activeLeads.value} active`,
  },
  {
    label: 'Won Deals',
    icon: 'emoji_events',
    bgColor: 'positive',
    value: String(wonLeads.value),
    subtitle: lostLeads.value > 0 ? `${lostLeads.value} lost` : '',
  },
  {
    label: 'Conversion Rate',
    icon: 'trending_up',
    bgColor: 'orange-8',
    value: `${conversionRate.value}%`,
    subtitle: totalLeads.value > 0 ? `${wonLeads.value} of ${totalLeads.value}` : '',
  },
  {
    label: 'Avg Score',
    icon: 'speed',
    bgColor: 'blue',
    value: String(avgScore.value),
    subtitle: avgScore.value > 0 ? 'out of 100' : '',
  },
]);

const STAGE_COLORS: Record<string, { color: string; qColor: string }> = {
  NEW_LEAD: { color: '#4CAF50', qColor: 'positive' },
  REQUEST_DESIGN: { color: '#2196F3', qColor: 'blue' },
  DESIGN_IN_PROGRESS: { color: '#FF9800', qColor: 'orange' },
  DESIGN_READY: { color: '#9C27B0', qColor: 'purple' },
  PENDING_SIGNATURE: { color: '#F44336', qColor: 'red' },
  SIT: { color: '#607D8B', qColor: 'blue-grey' },
  WON: { color: '#00897B', qColor: 'teal' },
  LOST: { color: '#EF4444', qColor: 'red-6' },
};

const SOURCE_COLORS: Record<string, string> = {
  DOOR_KNOCK: 'teal',
  COLD_CALL: 'blue',
  REFERRAL: 'purple',
  EVENT: 'orange',
  PUBLIC_FORM: 'cyan',
  WEBSITE: 'indigo',
  OTHER: 'grey',
};

const stageDistribution = computed(() => {
  const counts: Record<string, number> = {};
  leads.value.forEach((l) => {
    counts[l.currentStage] = (counts[l.currentStage] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([stage, count]) => ({
      stage,
      label: formatStage(stage),
      count,
      color: STAGE_COLORS[stage]?.color ?? '#6B7280',
      qColor: STAGE_COLORS[stage]?.qColor ?? 'grey',
    }))
    .sort((a, b) => b.count - a.count);
});

const sourceBreakdown = computed(() => {
  const counts: Record<string, number> = {};
  leads.value.forEach((l) => {
    counts[l.source] = (counts[l.source] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([source, count]) => ({
      source,
      label: formatSource(source),
      count,
      color: SOURCE_COLORS[source] ?? 'grey',
    }))
    .sort((a, b) => b.count - a.count);
});

const quickStats = computed(() => [
  { label: 'Active leads', value: activeLeads.value, icon: 'person', color: 'primary' },
  { label: 'In design', value: leads.value.filter((l) => ['DESIGN_IN_PROGRESS', 'REQUEST_DESIGN'].includes(l.currentStage)).length, icon: 'architecture', color: 'orange' },
  { label: 'Pending signature', value: leads.value.filter((l) => l.currentStage === 'PENDING_SIGNATURE').length, icon: 'draw', color: 'red' },
  { label: 'This week', value: leads.value.filter((l) => isThisWeek(l.createdAt)).length, icon: 'calendar_today', color: 'blue' },
  { label: 'Avg score', value: avgScore.value, icon: 'speed', color: 'purple' },
]);

const recentLeads = computed(() =>
  leads.value
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((l) => ({
      id: l.id,
      name: `${l.customer?.firstName ?? ''} ${l.customer?.lastName ?? ''}`.trim() || 'Unknown',
      email: l.customer?.email ?? '--',
      initials: `${l.customer?.firstName?.charAt(0) ?? ''}${l.customer?.lastName?.charAt(0) ?? ''}`.toUpperCase() || '?',
      stage: l.currentStage,
      source: l.source,
      createdAt: l.createdAt,
    })),
);

onMounted(async () => {
  try {
    const [leadsRes, activityRes] = await Promise.all([
      api.get('/leads', { params: { limit: 100 } }),
      api.get('/notifications').catch(() => ({ data: [] })),
    ]);

    const leadsData = leadsRes.data;
    leads.value = Array.isArray(leadsData) ? leadsData : leadsData.data ?? [];

    // Use notifications as activity feed
    const notifs = Array.isArray(activityRes.data) ? activityRes.data : activityRes.data?.data ?? [];
    recentActivity.value = notifs.slice(0, 10).map((n: any) => ({
      id: n.id,
      type: n.event ?? 'info',
      description: n.message ?? n.title ?? '',
      createdAt: n.createdAt,
    }));
  } catch {
    // fallback
  } finally {
    loading.value = false;
  }
});

const ACTIVITY_ICONS: Record<string, string> = {
  STAGE_CHANGE: 'swap_horiz',
  LEAD_ASSIGNED: 'person_add',
  DESIGN_COMPLETED: 'check_circle',
  APPOINTMENT_BOOKED: 'event',
  COMMISSION_PAID: 'payments',
  ASSIGNMENT_CHANGED: 'group',
  info: 'info',
};

const ACTIVITY_COLORS: Record<string, string> = {
  STAGE_CHANGE: 'primary',
  LEAD_ASSIGNED: 'positive',
  DESIGN_COMPLETED: 'purple',
  APPOINTMENT_BOOKED: 'blue',
  COMMISSION_PAID: 'orange',
  ASSIGNMENT_CHANGED: 'teal',
  info: 'grey-6',
};

function activityIcon(type: string) { return ACTIVITY_ICONS[type] ?? 'circle'; }
function activityColor(type: string) { return ACTIVITY_COLORS[type] ?? 'grey-6'; }

function stageColor(stage: string) { return STAGE_COLORS[stage]?.color ?? '#9E9E9E'; }
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

function isThisWeek(date: string) {
  const now = new Date();
  const d = new Date(date);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}
</script>

<style lang="scss" scoped>
.metric-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 137, 123, 0.3);
  }
}

.dashboard-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  height: 100%;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1A1A2E;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.stage-bar-row {
  .stage-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 8px;
  }
}
</style>
