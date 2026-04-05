<template>
  <q-page class="q-pa-md page-bg">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold">CRM Dashboard</h5>
      <q-space />
      <q-btn unelevated no-caps color="primary" icon="add" label="New Lead" @click="$router.push('/leads/new')" class="radius-10" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="error" class="bg-negative text-white q-ma-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

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
              <div class="text-h4 text-weight-bold metric-value">{{ card.value }}</div>
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
                    class="progress-thin"
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

      <!-- Stage Velocity + Lead Aging + Rep Performance -->
      <div class="row q-col-gutter-md q-mb-lg">
        <!-- Stage Velocity -->
        <div class="col-12 col-md-4">
          <q-card flat class="dashboard-card">
            <q-card-section>
              <div class="card-title q-mb-md">Stage Velocity</div>
              <div class="text-caption text-grey-5 q-mb-sm">Avg days per stage (last 30 days)</div>
              <div v-if="stageVelocity.length === 0" class="text-grey-5 text-center q-pa-md">No data</div>
              <div v-else>
                <div v-for="item in stageVelocity" :key="item.stage" class="q-mb-sm">
                  <div class="row items-center q-mb-xs">
                    <span class="text-caption col">{{ item.label }}</span>
                    <span class="text-caption text-weight-bold" :class="item.days > 7 ? 'text-negative' : item.days > 3 ? 'text-warning' : 'text-positive'">
                      {{ item.days }}d
                    </span>
                  </div>
                  <q-linear-progress
                    :value="Math.min(item.days / 14, 1)"
                    :color="item.days > 7 ? 'negative' : item.days > 3 ? 'warning' : 'positive'"
                    track-color="grey-2"
                    rounded class="progress-thin"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Lead Aging -->
        <div class="col-12 col-md-4">
          <q-card flat class="dashboard-card">
            <q-card-section>
              <div class="card-title q-mb-md">Lead Aging</div>
              <div class="text-caption text-grey-5 q-mb-sm">Active leads by time in current stage</div>
              <div v-for="bucket in agingBuckets" :key="bucket.label" class="row items-center q-mb-sm">
                <q-badge :color="bucket.color" :label="bucket.label" class="q-mr-sm" style="min-width: 80px" />
                <div class="col">
                  <q-linear-progress
                    :value="bucket.count / Math.max(activeLeads, 1)"
                    :color="bucket.color"
                    track-color="grey-2"
                    rounded class="progress-thin"
                  />
                </div>
                <span class="text-caption text-weight-bold q-ml-sm" style="min-width: 24px; text-align: right">{{ bucket.count }}</span>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Conversion by Source -->
        <div class="col-12 col-md-4">
          <q-card flat class="dashboard-card">
            <q-card-section>
              <div class="card-title q-mb-md">Conversion by Source</div>
              <div v-if="conversionBySource.length === 0" class="text-grey-5 text-center q-pa-md">No data</div>
              <div v-else>
                <div v-for="item in conversionBySource" :key="item.source" class="q-mb-sm">
                  <div class="row items-center q-mb-xs">
                    <q-icon name="circle" :color="item.color" size="8px" class="q-mr-sm" />
                    <span class="text-caption col">{{ item.label }}</span>
                    <span class="text-caption text-weight-bold">{{ item.rate }}%</span>
                    <span class="text-caption text-grey-5 q-ml-xs">({{ item.won }}/{{ item.total }})</span>
                  </div>
                  <q-linear-progress
                    :value="item.rate / 100"
                    :color="item.color"
                    track-color="grey-2"
                    rounded class="progress-thin"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Rep Performance -->
      <q-card flat class="dashboard-card q-mb-lg">
        <q-card-section>
          <div class="card-title q-mb-md">Rep Performance</div>
          <q-table
            :rows="repPerformance"
            :columns="repColumns"
            row-key="name"
            flat dense
            :pagination="{ rowsPerPage: 10 }"
            hide-bottom
          >
            <template #body-cell-convRate="props">
              <q-td :props="props">
                <span :class="props.row.convRate >= 50 ? 'text-positive' : props.row.convRate >= 25 ? 'text-warning' : 'text-grey-6'" class="text-weight-bold">
                  {{ props.row.convRate }}%
                </span>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

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
                      class="badge-pill-sm"
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
                    <q-item-label class="text-12">{{ item.description }}</q-item-label>
                    <q-item-label caption class="text-11">{{ timeAgo(item.createdAt) }}</q-item-label>
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
import { titleCase } from '@/composables/useLeadFormatting';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { useLeadFormatting } from '@/composables/useLeadFormatting';

const { stageColor, stageQColor, formatStage, formatSource, timeAgo } = useLeadFormatting();

interface LeadData {
  id: string;
  currentStage: string;
  status?: string;
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
const error = ref<string | null>(null);
const leads = ref<LeadData[]>([]);
const recentActivity = ref<Activity[]>([]);

const PM_AND_BEYOND_STAGES = [
  'SITE_AUDIT', 'PROGRESS_REVIEW', 'NTP', 'ENGINEERING', 'PERMIT_AND_ICE', 'FINAL_APPROVAL',
  'INSTALL_READY', 'INSTALL', 'COMMISSION', 'SITE_COMPLETE', 'INITIAL_SUBMISSION_AND_INSPECTION',
  'WAITING_FOR_PTO', 'FINAL_SUBMISSION', 'CUSTOMER_SUCCESS',
  'FIN_TICKETS_OPEN', 'FIN_IN_PROGRESS', 'FIN_POST_INITIAL_NURTURE', 'FIN_TICKETS_CLOSED',
  'MAINT_TICKETS_OPEN', 'MAINT_IN_PROGRESS', 'MAINT_POST_INSTALL_NURTURE', 'MAINT_TICKETS_CLOSED',
];

const totalLeads = computed(() => leads.value.length);
const wonLeads = computed(() => leads.value.filter((l) => l.currentStage === 'WON' || PM_AND_BEYOND_STAGES.includes(l.currentStage)).length);
const lostLeads = computed(() => leads.value.filter((l) => l.status === 'LOST').length);
const activeLeads = computed(() => leads.value.filter((l) => l.status !== 'LOST' && l.status !== 'CANCELLED' && l.currentStage !== 'WON' && !PM_AND_BEYOND_STAGES.includes(l.currentStage)).length);
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
    subtitle: lostLeads.value > 0 ? `${lostLeads.value} lost` : '\u00A0',
  },
  {
    label: 'Conversion Rate',
    icon: 'trending_up',
    bgColor: 'orange-8',
    value: `${conversionRate.value}%`,
    subtitle: totalLeads.value > 0 ? `${wonLeads.value} of ${totalLeads.value}` : '\u00A0',
  },
  {
    label: 'Avg Score',
    icon: 'speed',
    bgColor: 'blue',
    value: String(avgScore.value),
    subtitle: 'out of 100',
  },
]);

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
      color: stageColor(stage),
      qColor: stageQColor(stage),
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
  { label: 'Lost', value: lostLeads.value, icon: 'cancel', color: 'red' },
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

// ── Stage Velocity (avg days per stage based on activity timestamps) ──
const stageVelocity = computed(() => {
  // Estimate velocity from leads: days since createdAt for leads still in closer stages
  const CLOSER_STAGES = ['NEW_LEAD', 'ALREADY_CALLED', 'CONNECTED', 'REQUEST_DESIGN', 'DESIGN_IN_PROGRESS', 'DESIGN_READY'];
  const stageDays: Record<string, number[]> = {};
  const now = Date.now();

  leads.value.forEach((l) => {
    if (CLOSER_STAGES.includes(l.currentStage) && l.status !== 'LOST') {
      const days = Math.round((now - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (!stageDays[l.currentStage]) stageDays[l.currentStage] = [];
      stageDays[l.currentStage].push(days);
    }
  });

  return Object.entries(stageDays)
    .map(([stage, days]) => ({
      stage,
      label: formatStage(stage),
      days: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
    }))
    .sort((a, b) => b.days - a.days);
});

// ── Lead Aging (active leads by time in current stage) ──
const agingBuckets = computed(() => {
  const now = Date.now();
  const buckets = [
    { label: '< 3 days', color: 'positive', min: 0, max: 3, count: 0 },
    { label: '3-7 days', color: 'blue', min: 3, max: 7, count: 0 },
    { label: '7-14 days', color: 'warning', min: 7, max: 14, count: 0 },
    { label: '14-30 days', color: 'orange', min: 14, max: 30, count: 0 },
    { label: '30+ days', color: 'negative', min: 30, max: Infinity, count: 0 },
  ];

  leads.value
    .filter((l) => l.status !== 'LOST' && l.status !== 'CANCELLED')
    .forEach((l) => {
      const days = (now - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const bucket = buckets.find((b) => days >= b.min && days < b.max);
      if (bucket) bucket.count++;
    });

  return buckets;
});

// ── Conversion by Source ──
const conversionBySource = computed(() => {
  const sources: Record<string, { total: number; won: number }> = {};

  leads.value.forEach((l) => {
    if (!sources[l.source]) sources[l.source] = { total: 0, won: 0 };
    sources[l.source].total++;
    if (l.currentStage === 'WON' || PM_AND_BEYOND_STAGES.includes(l.currentStage)) {
      sources[l.source].won++;
    }
  });

  return Object.entries(sources)
    .filter(([, v]) => v.total >= 1)
    .map(([source, v]) => ({
      source,
      label: formatSource(source),
      total: v.total,
      won: v.won,
      rate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
      color: SOURCE_COLORS[source] ?? 'grey',
    }))
    .sort((a, b) => b.rate - a.rate);
});

// ── Rep Performance ──
const repPerformance = computed(() => {
  const reps: Record<string, { name: string; total: number; won: number; active: number }> = {};

  leads.value.forEach((l) => {
    const primary = l.assignments?.find((a) => a.isPrimary);
    const name = primary ? `${primary.user.firstName} ${primary.user.lastName}`.trim() : 'Unassigned';
    if (!reps[name]) reps[name] = { name, total: 0, won: 0, active: 0 };
    reps[name].total++;
    if (l.currentStage === 'WON' || PM_AND_BEYOND_STAGES.includes(l.currentStage)) reps[name].won++;
    if (l.status !== 'LOST' && l.status !== 'CANCELLED') reps[name].active++;
  });

  return Object.values(reps)
    .map((r) => ({ ...r, convRate: r.total > 0 ? Math.round((r.won / r.total) * 100) : 0 }))
    .sort((a, b) => b.won - a.won);
});

const repColumns = [
  { name: 'name', label: 'Rep', field: 'name', align: 'left' as const, sortable: true },
  { name: 'total', label: 'Total Leads', field: 'total', align: 'center' as const, sortable: true },
  { name: 'active', label: 'Active', field: 'active', align: 'center' as const, sortable: true },
  { name: 'won', label: 'Won', field: 'won', align: 'center' as const, sortable: true },
  { name: 'convRate', label: 'Conv. Rate', field: 'convRate', align: 'center' as const, sortable: true },
];

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const [leadsRes, activityRes] = await Promise.all([
      api.get('/leads', { params: { limit: 100 } }),
      api.get('/notifications').catch(() => ({ data: [] })),
    ]);

    const leadsData = leadsRes.data;
    leads.value = Array.isArray(leadsData) ? leadsData : leadsData.data ?? [];

    // Use notifications as activity feed
    const notifs = Array.isArray(activityRes.data) ? activityRes.data : activityRes.data?.data ?? [];
    interface RawNotification { id: string; event?: string; message?: string; title?: string; createdAt: string }
    recentActivity.value = (notifs as RawNotification[]).slice(0, 10).map((n) => ({
      id: n.id,
      type: n.event ?? 'info',
      description: n.message ?? n.title ?? '',
      createdAt: n.createdAt,
    }));
  } catch {
    error.value = 'Failed to load dashboard data. Please try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => { loadData(); });

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
