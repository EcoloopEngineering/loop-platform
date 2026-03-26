<template>
  <q-page class="q-pa-md page-bg">
    <h5 class="q-my-none text-weight-bold q-mb-md">Scoreboard</h5>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <template v-else>
      <!-- Section 1: My Stats -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <q-icon name="monetization_on" color="amber-8" size="32px" />
            <div class="text-h5 text-weight-bold q-mt-sm">{{ balance.coins ?? 0 }}</div>
            <div class="text-caption text-grey-6">Coin Balance</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <q-icon name="trending_up" color="primary" size="32px" />
            <div class="text-h5 text-weight-bold q-mt-sm">{{ weeklyPoints }}</div>
            <div class="text-caption text-grey-6">Points This Week</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <q-icon name="emoji_events" color="amber" size="32px" />
            <div class="text-h5 text-weight-bold q-mt-sm">#{{ myRank || '--' }}</div>
            <div class="text-caption text-grey-6">Rank</div>
          </q-card>
        </div>
      </div>

      <!-- Section 2: Leaderboard -->
      <q-card flat bordered class="rounded-card q-mb-lg">
        <q-card-section>
          <div class="row items-center q-mb-md">
            <div class="text-subtitle1 text-weight-bold">Leaderboard</div>
            <q-space />
            <q-tabs v-model="period" dense inline-label class="text-grey-7" active-color="primary" indicator-color="primary">
              <q-tab name="weekly" label="Weekly" />
              <q-tab name="monthly" label="Monthly" />
            </q-tabs>
          </div>

          <q-table
            :rows="leaderboard"
            :columns="leaderColumns"
            row-key="userId"
            flat
            :pagination="{ rowsPerPage: 20 }"
            hide-bottom
          >
            <template #body="props">
              <q-tr :props="props" :class="{ 'bg-teal-1': props.row.userId === currentUserId }">
                <q-td key="rank" :props="props">
                  <q-badge
                    v-if="props.row.rank <= 3"
                    :color="['amber', 'grey-5', 'brown-4'][props.row.rank - 1]"
                    text-color="white"
                  >
                    {{ props.row.rank }}
                  </q-badge>
                  <span v-else>{{ props.row.rank }}</span>
                </q-td>
                <q-td key="user" :props="props">
                  <div class="row items-center no-wrap">
                    <UserAvatar :user-id="props.row.userId" :name="props.row.name" size="28px" class="q-mr-sm" />
                    <span class="text-weight-medium">{{ titleCase(props.row.name) }}</span>
                  </div>
                </q-td>
                <q-td key="points" :props="props">
                  <span class="text-weight-bold">{{ props.row.points }}</span>
                </q-td>
                <q-td key="coins" :props="props">
                  <q-icon name="monetization_on" color="amber-8" size="16px" class="q-mr-xs" />
                  {{ props.row.coins }}
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <!-- Section 3: Recent Milestones -->
      <div class="text-subtitle1 text-weight-bold q-mb-sm">Recent Milestones</div>
      <div v-if="milestones.length === 0" class="text-grey-5 text-center q-pa-lg">No milestones yet.</div>
      <div class="row q-col-gutter-md">
        <div v-for="m in milestones" :key="m.id" class="col-12 col-sm-6 col-md-4">
          <q-card flat bordered class="rounded-card">
            <q-card-section>
              <div class="row items-center no-wrap">
                <q-icon name="emoji_events" color="amber" size="24px" class="q-mr-sm" />
                <div class="col">
                  <div class="text-body2 text-weight-medium">{{ m.description }}</div>
                  <div class="text-caption text-grey-5">{{ timeAgo(m.createdAt) }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@/boot/axios';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { titleCase, timeAgo } from '@/utils/format';
import { useUserStore } from '@/stores/user.store';

interface Balance {
  coins: number;
  points: number;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  coins: number;
  rank: number;
}

interface Milestone {
  id: string;
  description: string;
  createdAt: string;
}

const userStore = useUserStore();
const currentUserId = computed(() => userStore.user?.id ?? '');

const loading = ref(false);
const balance = ref<Balance>({ coins: 0, points: 0 });
const period = ref<'weekly' | 'monthly'>('weekly');
const leaderboard = ref<LeaderboardEntry[]>([]);
const milestones = ref<Milestone[]>([]);

const weeklyPoints = computed(() => {
  const me = leaderboard.value.find((e) => e.userId === currentUserId.value);
  return me?.points ?? balance.value.points ?? 0;
});

const myRank = computed(() => {
  const me = leaderboard.value.find((e) => e.userId === currentUserId.value);
  return me?.rank ?? 0;
});

const leaderColumns = [
  { name: 'rank', label: '#', field: 'rank', align: 'center' as const, style: 'width: 60px' },
  { name: 'user', label: 'Name', field: 'name', align: 'left' as const },
  { name: 'points', label: 'Points', field: 'points', align: 'center' as const, sortable: true },
  { name: 'coins', label: 'Coins', field: 'coins', align: 'center' as const, sortable: true },
];

async function fetchBalance() {
  try {
    const { data } = await api.get<Balance>('/gamification/balance');
    balance.value = data;
  } catch {
    // endpoint may not exist yet
  }
}

async function fetchLeaderboard() {
  try {
    const { data } = await api.get<LeaderboardEntry[]>('/gamification/leaderboard', {
      params: { period: period.value },
    });
    leaderboard.value = Array.isArray(data)
      ? data.map((e, i) => ({ ...e, rank: e.rank ?? i + 1 }))
      : [];
  } catch {
    leaderboard.value = [];
  }
}

async function fetchScoreboard() {
  try {
    const { data } = await api.get('/gamification/scoreboard');
    milestones.value = Array.isArray(data) ? data : (data as any).data ?? [];
  } catch {
    milestones.value = [];
  }
}

watch(period, () => fetchLeaderboard());

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([fetchBalance(), fetchLeaderboard(), fetchScoreboard()]);
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.page-bg {
  background: #F8FAFB;
}
.rounded-card {
  border-radius: 12px;
  border-color: #E5E7EB;
}
</style>
