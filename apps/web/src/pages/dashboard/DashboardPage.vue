<template>
  <q-page class="q-pa-md">
    <h5 class="q-my-none text-weight-bold q-mb-md">Dashboard</h5>

    <!-- Loading -->
    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="error" class="bg-negative text-white q-ma-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action><q-btn flat label="Retry" @click="loadData" /></template>
    </q-banner>

    <template v-else>
    <!-- Stat Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="card in statCards" :key="card.label" class="col-6 col-sm-3">
        <q-card flat bordered class="stat-card">
          <q-card-section>
            <div class="row items-center q-gutter-x-sm q-mb-xs">
              <q-icon :name="card.icon" :color="card.color" size="20px" />
              <span class="text-caption text-grey-6">{{ card.label }}</span>
            </div>
            <div class="text-h5 text-weight-bold">{{ card.value }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Charts Placeholder -->
    <q-card flat bordered class="rounded-card q-mb-lg">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Performance</div>
        <div class="chart-placeholder text-grey-5 text-center q-pa-xl">
          <q-icon name="bar_chart" size="48px" class="q-mb-sm" />
          <div>Charts coming soon</div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Goals Progress -->
    <q-card flat bordered class="rounded-card">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-md">Monthly Goals</div>

        <div v-for="goal in goals" :key="goal.label" class="q-mb-md">
          <div class="row items-center q-mb-xs">
            <span class="text-body2 col">{{ goal.label }}</span>
            <span class="text-caption text-weight-bold">
              {{ goal.current }} / {{ goal.target }}
            </span>
          </div>
          <q-linear-progress
            :value="goal.target ? goal.current / goal.target : 0"
            color="primary"
            rounded
            size="10px"
            class="goal-bar"
          />
        </div>

        <div v-if="!goals.length" class="text-grey-6 text-center q-pa-md">
          No goals set for this month.
        </div>
      </q-card-section>
    </q-card>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/boot/axios';

interface DashboardStats {
  leadsThisMonth: number;
  wonDeals: number;
  conversionPct: number;
  earnings: number;
}

interface Goal {
  label: string;
  current: number;
  target: number;
}

const loading = ref(false);
const error = ref<string | null>(null);

const statCards = ref([
  { label: 'Leads This Month', icon: 'people', color: 'primary', value: '--' },
  { label: 'Won Deals', icon: 'emoji_events', color: 'positive', value: '--' },
  { label: 'Conversion', icon: 'trending_up', color: 'warning', value: '--%' },
  { label: 'Earnings', icon: 'attach_money', color: 'blue', value: '--' },
]);

const goals = ref<Goal[]>([]);

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const [statsRes, goalsRes] = await Promise.all([
      api.get<DashboardStats>('/dashboard/stats'),
      api.get<Goal[]>('/dashboard/goals'),
    ]);

    const s = statsRes.data;
    statCards.value[0].value = String(s.leadsThisMonth);
    statCards.value[1].value = String(s.wonDeals);
    statCards.value[2].value = `${s.conversionPct}%`;
    statCards.value[3].value = `$${s.earnings.toLocaleString()}`;

    goals.value = goalsRes.data;
  } catch {
    error.value = 'Failed to load dashboard data. Please try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => { loadData(); });
</script>

<style lang="scss" scoped>
.stat-card {
  border-radius: 12px;
}
.rounded-card {
  border-radius: 12px;
}
.chart-placeholder {
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
}
.goal-bar {
  border-radius: 5px;
}
</style>
