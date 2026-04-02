<template>
  <q-page class="home-page q-pa-md">
    <!-- Greeting -->
    <div class="q-mb-md">
      <div class="greeting-text">{{ greeting }}<span v-if="displayName" class="greeting-name">, {{ displayName }}</span></div>
      <div class="greeting-sub">Here's your sales overview</div>
    </div>

    <!-- Error -->
    <q-banner v-if="errorLeads" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ errorLeads }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

    <!-- Stats -->
    <div class="row q-col-gutter-sm q-mb-sm">
      <div class="col-6" v-for="stat in topStats" :key="stat.label">
        <div class="stat-card">
          <div class="row items-center q-mb-xs gap-xs">
            <q-icon :name="stat.icon" :color="stat.color" size="16px" />
            <span class="stat-label">{{ stat.label }}</span>
          </div>
          <div class="stat-value">{{ stat.value }}</div>
        </div>
      </div>
    </div>
    <div class="row q-col-gutter-sm q-mb-lg">
      <div class="col-4" v-for="stat in bottomStats" :key="stat.label">
        <div class="stat-card">
          <div class="row items-center q-mb-xs gap-xs">
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
        <div v-if="showInvite" class="col-6">
          <q-btn outline no-caps color="primary" icon="share" label="Invite" class="full-width action-btn" aria-label="Invite a referral partner" @click="$router.push('/referrals')" />
        </div>
        <div :class="showInvite ? 'col-6' : 'col-12'">
          <q-btn unelevated no-caps color="primary" text-color="white" icon="add" label="New Lead" class="full-width action-btn" aria-label="Create a new lead" @click="$router.push('/leads/new')" />
        </div>
      </div>
    </div>

    <!-- My Leads -->
    <div class="q-mb-lg">
      <div class="row items-center q-mb-sm">
        <div class="section-title">My Leads</div>
        <q-badge v-if="myLeads.length" color="grey-3" text-color="grey-7" class="q-ml-sm text-11">
          {{ myLeads.length }}
        </q-badge>
        <q-space />
        <q-btn v-if="myLeads.length > LEADS_PER_PAGE" flat dense no-caps color="primary" label="View all" @click="$router.push('/leads')" size="sm" aria-label="View all leads" />
      </div>

      <div v-if="loadingLeads" class="text-center q-pa-md">
        <q-spinner-dots color="primary" size="30px" />
      </div>

      <div v-else-if="myLeads.length === 0">
        <q-card flat>
          <q-card-section class="text-center q-pa-lg">
            <q-icon name="person_search" size="40px" color="grey-4" />
            <div class="text-grey-6 q-mt-sm text-13">No leads assigned to you yet</div>
          </q-card-section>
        </q-card>
      </div>

      <div v-else class="lead-list">
        <q-card v-for="lead in paginatedLeads" :key="lead.id" flat class="lead-card q-mb-xs" clickable @click="$router.push(`/crm/leads/${lead.id}`)">
          <q-card-section class="q-pa-sm">
            <div class="row items-center no-wrap">
              <UserAvatar :name="titleCase(lead.name)" size="36px" class="q-mr-sm" />
              <div class="col">
                <div class="text-weight-medium text-13">{{ titleCase(lead.name) }}</div>
                <div class="text-caption text-grey-5">{{ lead.source }} · {{ lead.timeAgo }}</div>
              </div>
              <q-badge
                :style="{ background: stageColor(lead.stage) }"
                text-color="white"
                class="badge-pill-sm"
              >
                {{ formatStage(lead.stage) }}
              </q-badge>
            </div>
          </q-card-section>
        </q-card>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="row justify-center q-mt-sm gap-xxs">
          <q-btn
            v-for="p in totalPages"
            :key="p"
            :flat="p !== leadsPage"
            :unelevated="p === leadsPage"
            :color="p === leadsPage ? 'primary' : 'grey-5'"
            :text-color="p === leadsPage ? 'white' : 'grey-7'"
            dense
            round
            size="xs"
            :label="String(p)"
            :aria-label="`Go to page ${p}`"
            :aria-current="p === leadsPage ? 'page' : undefined"
            @click="leadsPage = p"
          />
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div>
      <div class="section-title q-mb-sm">Recent Activity</div>
      <q-card flat>
        <q-list v-if="activities.length" separator>
          <q-item v-for="a in activities.slice(0, 5)" :key="a.id" dense>
            <q-item-section avatar>
              <q-avatar size="34px" :color="activityColor(a.event)" text-color="white">
                <q-icon :name="activityIcon(a.event)" size="14px" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-12">{{ a.message || a.title }}</q-item-label>
              <q-item-label caption class="text-11">{{ timeAgo(a.createdAt) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <q-card-section v-else class="text-center q-pa-lg">
          <q-icon name="inbox" size="40px" color="grey-4" />
          <div class="text-grey-6 q-mt-sm text-13">No recent activity</div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue';
import type { Ref } from 'vue';
import { api } from '@/boot/axios';
import type { Lead, LeadAssignment } from '@/types/api';
import { titleCase } from '@/composables/useLeadFormatting';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { useLeadFormatting } from '@/composables/useLeadFormatting';

interface CurrentUserInfo {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface ActivityItem {
  id: string;
  event: string;
  title?: string;
  message?: string;
  createdAt: string;
}

const { stageColor, formatStage, formatSource, timeAgo } = useLeadFormatting();

const loadingLeads = ref(true);
const errorLeads = ref<string | null>(null);
const leads = ref<Lead[]>([]);
const activities = ref<ActivityItem[]>([]);
const currentUser = ref<CurrentUserInfo | null>(null);
const prospectCount = ref(0);
const injectedName = inject<Ref<string>>('userName', ref(''));
const displayName = computed(() => injectedName?.value || '');

const isEmployee = computed(() => {
  return currentUser.value?.email?.endsWith('@ecoloop.us') ?? false;
});

const showInvite = computed(() => {
  return isEmployee.value && currentUser.value?.role !== 'REFERRAL_PARTNER';
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
});

const totalLeads = computed(() => filteredLeads.value.length);
const wonLeads = computed(() => filteredLeads.value.filter((l) => l.currentStage === 'WON').length);
const conversionRate = computed(() => {
  if (totalLeads.value === 0) return 0;
  return Math.round((wonLeads.value / totalLeads.value) * 100);
});

const topStats = computed(() => [
  { label: 'Prospects', value: String(prospectCount.value), icon: 'person_search', color: 'teal' },
  { label: 'Total Leads', value: String(totalLeads.value), icon: 'people', color: 'primary' },
]);

const referralLeads = computed(() => filteredLeads.value.filter((l) => l.source === 'REFERRAL').length);

const bottomStats = computed(() => [
  { label: 'Referrals', value: String(referralLeads.value), icon: 'group_add', color: 'purple' },
  { label: 'Closed Won', value: String(wonLeads.value), icon: 'emoji_events', color: 'positive' },
  { label: 'Conversion', value: `${conversionRate.value}%`, icon: 'trending_up', color: 'orange-8' },
]);

const LEADS_PER_PAGE = 5;
const leadsPage = ref(1);
const totalPages = computed(() => Math.ceil(myLeads.value.length / LEADS_PER_PAGE));
const paginatedLeads = computed(() => {
  const start = (leadsPage.value - 1) * LEADS_PER_PAGE;
  return myLeads.value.slice(start, start + LEADS_PER_PAGE);
});

// Sales page always shows MY leads only (regardless of role)
// CRM Dashboard/Pipeline is where admins see all leads
const filteredLeads = computed(() => {
  const userId = currentUser.value?.id;
  if (!userId) return [];

  return leads.value.filter((l) => {
    if (l.createdById === userId) return true;
    if (l.assignments?.some((a: LeadAssignment) => a.userId === userId)) return true;
    if (l.projectManagerId === userId) return true;
    return false;
  });
});

const myLeads = computed(() =>
  filteredLeads.value
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((l) => ({
      id: l.id,
      name: `${l.customer?.firstName ?? ''} ${l.customer?.lastName ?? ''}`.trim() || 'Unknown',
      initials: `${l.customer?.firstName?.charAt(0) ?? ''}${l.customer?.lastName?.charAt(0) ?? ''}`.toUpperCase() || '?',
      stage: l.currentStage,
      source: formatSource(l.source),
      timeAgo: timeAgo(l.createdAt),
    })),
);

async function loadData() {
  loadingLeads.value = true;
  errorLeads.value = null;

  try {
    const { data: me } = await api.get('/auth/me');
    currentUser.value = me;
  } catch { /* dev bypass user */ }

  try {
    const [leadsRes, notifsRes, prospectsRes] = await Promise.all([
      api.get('/leads', { params: { limit: 100 } }),
      api.get('/notifications').catch(() => ({ data: { data: [] } })),
      api.get('/customers', { params: { type: 'PROSPECT', limit: 1 } }).catch(() => ({ data: { meta: { total: 0 } } })),
    ]);
    const leadsData = leadsRes.data;
    leads.value = Array.isArray(leadsData) ? leadsData : leadsData.data ?? [];

    const notifsData = notifsRes.data;
    activities.value = (Array.isArray(notifsData) ? notifsData : notifsData.data ?? []).slice(0, 5);

    const prospectsData = prospectsRes.data;
    prospectCount.value = prospectsData?.meta?.total ?? prospectsData?.total ?? 0;
  } catch {
    errorLeads.value = 'Failed to load your sales data. Please try again.';
  } finally {
    loadingLeads.value = false;
  }
}

onMounted(() => { loadData(); });

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
  border: 1px solid #F3F4F6;
  border-radius: 10px;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;

  &:hover {
    border-color: #00897B;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }
}
</style>
