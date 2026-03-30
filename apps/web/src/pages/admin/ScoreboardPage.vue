<template>
  <q-page class="q-pa-md page-bg">
    <h5 class="q-my-none text-weight-bold q-mb-md">Scoreboard</h5>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="error" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

    <template v-else>
      <!-- Section 1: My Stats -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <q-icon name="monetization_on" color="amber-8" size="32px" />
            <div class="text-h5 text-weight-bold q-mt-sm">{{ balance.coins ?? 0 }}</div>
            <div class="text-caption" style="color: var(--text-secondary)">Coin Balance</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <q-icon name="trending_up" color="primary" size="32px" />
            <div class="text-h5 text-weight-bold q-mt-sm">{{ weeklyPoints }}</div>
            <div class="text-caption" style="color: var(--text-secondary)">Points This Week</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <q-icon name="emoji_events" color="amber" size="32px" />
            <div class="text-h5 text-weight-bold q-mt-sm">#{{ myRank || '--' }}</div>
            <div class="text-caption" style="color: var(--text-secondary)">Rank</div>
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
              <q-tr :props="props" :class="{ 'my-row': props.row.userId === currentUserId }">
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
                  <div class="text-body2 text-weight-medium">{{ milestoneDescription(m) }}</div>
                  <div class="text-caption" style="color: var(--text-tertiary)">{{ timeAgo(m.createdAt) }}</div>
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
import { titleCase } from '@/composables/useLeadFormatting';
import { useLeadFormatting } from '@/composables/useLeadFormatting';
const { timeAgo } = useLeadFormatting();
import { useUserStore } from '@/stores/user.store';

interface Balance {
  coins: number;
  points: number;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  rank: number;
}

interface MilestoneEvent {
  id: string;
  eventType: string;
  points: number;
  createdAt: string;
  user: { firstName: string; lastName: string; closedDealEmoji?: string };
  lead?: { customer?: { firstName: string; lastName: string }; kw?: number } | null;
}

const userStore = useUserStore();
const currentUserId = computed(() => userStore.user?.id ?? '');

const loading = ref(false);
const error = ref<string | null>(null);
const balance = ref<Balance>({ coins: 0, points: 0 });
const period = ref<'weekly' | 'monthly'>('weekly');
const leaderboard = ref<LeaderboardEntry[]>([]);
const milestones = ref<MilestoneEvent[]>([]);

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
    const { data } = await api.get('/gamification/leaderboard', {
      params: { period: period.value },
    });
    const raw = Array.isArray(data) ? data : [];
    interface RawLeaderEntry { userId: string; firstName?: string; lastName?: string; totalPoints?: number; points?: number }
    leaderboard.value = (raw as RawLeaderEntry[]).map((e, i: number) => ({
      userId: e.userId,
      name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || 'Unknown',
      points: e.totalPoints ?? e.points ?? 0,
      rank: i + 1,
    }));
  } catch {
    leaderboard.value = [];
  }
}

function milestoneDescription(m: MilestoneEvent): string {
  const userName = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim();
  const emoji = m.user?.closedDealEmoji ?? '';
  const kw = m.lead?.kw;
  const customer = m.lead?.customer
    ? `${m.lead.customer.firstName} ${m.lead.customer.lastName}`.trim()
    : null;

  switch (m.eventType) {
    case 'SALE':
      return `${emoji} ${userName} closed a ${kw ? kw + 'kW ' : ''}deal${customer ? ' with ' + customer : ''}!`;
    case 'CONNECTED':
      return `${userName} connected with a customer${customer ? ': ' + customer : ''}.`;
    case 'CUSTOMER_SUCCESS':
      return `${userName} completed a project${customer ? ' for ' + customer : ''}! 🎉`;
    default:
      return `${userName} earned ${m.points} points.`;
  }
}

async function fetchScoreboard() {
  try {
    const { data } = await api.get('/gamification/scoreboard');
    milestones.value = Array.isArray(data) ? data : (data as { data?: typeof milestones.value }).data ?? [];
  } catch {
    milestones.value = [];
  }
}

watch(period, () => fetchLeaderboard());

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([fetchBalance(), fetchLeaderboard(), fetchScoreboard()]);
  } catch {
    error.value = 'Failed to load scoreboard data. Please try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => { loadData(); });
</script>

<style lang="scss" scoped>
.page-bg {
  background: var(--bg-page, #F8FAFB);
}
.rounded-card {
  border-radius: 12px;
  border-color: var(--border-default, #E5E7EB);
  background: var(--bg-card, #FFFFFF);
}

// Linha do usuário logado — funciona em light e dark mode
.my-row {
  background: rgba(0, 137, 123, 0.08) !important;

  .body--dark & {
    background: rgba(0, 229, 200, 0.1) !important;
  }
}

:deep(.q-table thead tr th) {
  color: var(--text-tertiary, #9CA3AF);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom-color: var(--border-light, #F3F4F6);
}

:deep(.q-table tbody tr td) {
  border-bottom-color: var(--border-light, #F3F4F6);
  color: var(--text-primary, #111827);
}

:deep(.q-table) {
  background: transparent;
  color: var(--text-primary, #111827);
}
</style>
