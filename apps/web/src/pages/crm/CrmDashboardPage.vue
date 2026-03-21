<template>
  <q-page class="q-pa-md">
    <h5 class="q-my-none text-weight-bold q-mb-md">CRM Dashboard</h5>

    <!-- Metric cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="card in metricCards" :key="card.label" class="col-6 col-sm-3">
        <q-card flat bordered class="stat-card">
          <q-card-section>
            <div class="row items-center q-gutter-x-sm q-mb-xs">
              <q-icon :name="card.icon" :color="card.color" size="20px" />
              <span class="text-caption text-grey-6">{{ card.label }}</span>
            </div>
            <div class="text-h5 text-weight-bold">{{ card.value }}</div>
            <div v-if="card.subtitle" class="text-caption text-grey-5">
              {{ card.subtitle }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Recent activity -->
    <q-card flat bordered class="rounded-card">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Recent Activity</div>

        <q-list v-if="recentActivity.length" separator>
          <q-item v-for="item in recentActivity" :key="item.id">
            <q-item-section avatar>
              <q-avatar size="32px" :color="activityColor(item.type)" text-color="white">
                <q-icon :name="activityIcon(item.type)" size="16px" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ item.description }}</q-item-label>
              <q-item-label caption>{{ formatDate(item.createdAt) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div v-else class="text-grey-6 text-center q-pa-lg">
          No recent activity.
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/boot/axios';

interface Metrics {
  totalLeads: number;
  wonLeads: number;
  conversionRate: number;
  avgCommission: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

const metrics = ref<Metrics>({
  totalLeads: 0,
  wonLeads: 0,
  conversionRate: 0,
  avgCommission: 0,
});
const recentActivity = ref<Activity[]>([]);

const metricCards = ref([
  { label: 'Total Leads', icon: 'people', color: 'primary', value: '--', subtitle: '' },
  { label: 'Won Deals', icon: 'emoji_events', color: 'positive', value: '--', subtitle: '' },
  { label: 'Conversion Rate', icon: 'trending_up', color: 'warning', value: '--%', subtitle: '' },
  { label: 'Avg Commission', icon: 'attach_money', color: 'blue', value: '--', subtitle: '' },
]);

const ICONS: Record<string, string> = {
  stage_change: 'swap_horiz',
  note: 'sticky_note_2',
  document: 'attach_file',
  lead_created: 'person_add',
};

const COLORS: Record<string, string> = {
  stage_change: 'primary',
  note: 'amber-8',
  document: 'blue',
  lead_created: 'positive',
};

function activityIcon(type: string) {
  return ICONS[type] ?? 'circle';
}

function activityColor(type: string) {
  return COLORS[type] ?? 'grey-6';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(async () => {
  try {
    const [metricsRes, activityRes] = await Promise.all([
      api.get<Metrics>('/crm/metrics'),
      api.get<Activity[]>('/crm/activity'),
    ]);
    metrics.value = metricsRes.data;
    recentActivity.value = activityRes.data;

    metricCards.value[0].value = String(metrics.value.totalLeads);
    metricCards.value[1].value = String(metrics.value.wonLeads);
    metricCards.value[2].value = `${metrics.value.conversionRate}%`;
    metricCards.value[3].value = `$${metrics.value.avgCommission.toLocaleString()}`;
  } catch {
    // Metrics will remain at defaults
  }
});
</script>

<style lang="scss" scoped>
.stat-card {
  border-radius: 12px;
}
.rounded-card {
  border-radius: 12px;
}
</style>
