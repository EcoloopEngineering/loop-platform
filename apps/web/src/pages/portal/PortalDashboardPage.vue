<template>
  <q-page class="portal-dashboard q-pa-md">
    <!-- Welcome -->
    <div class="q-mb-lg">
      <h5 class="welcome-title">Welcome, {{ customerName }}</h5>
      <p class="welcome-sub">Here's your solar project overview</p>
    </div>

    <!-- Project Status Card -->
    <q-card flat class="status-card q-mb-lg">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <q-icon name="solar_power" size="28px" color="primary" class="q-mr-sm" />
          <div>
            <div class="text-weight-bold" style="font-size: 16px">My Solar Project</div>
            <div class="text-caption text-grey-6">Last updated {{ lastUpdated }}</div>
          </div>
          <q-space />
          <q-badge :color="statusColor" :label="statusLabel" style="border-radius: 8px; padding: 4px 12px; font-weight: 600" />
        </div>

        <!-- Progress bar -->
        <div class="q-mb-sm">
          <div class="row justify-between q-mb-xs">
            <span class="text-caption text-grey-6">Progress</span>
            <span class="text-caption text-weight-bold text-primary">{{ progressPct }}%</span>
          </div>
          <q-linear-progress :value="progressPct / 100" color="primary" track-color="grey-3" rounded size="10px" />
        </div>

        <!-- Current stage -->
        <div class="stage-info q-mt-md">
          <div class="text-caption text-grey-5 q-mb-xs">Current Stage</div>
          <div class="text-weight-bold text-primary" style="font-size: 18px">{{ currentStageName }}</div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Quick Info Cards -->
    <div class="row q-col-gutter-sm q-mb-lg">
      <div class="col-6">
        <q-card flat class="info-card" clickable @click="$router.push('/portal/project')">
          <q-card-section class="text-center q-pa-md">
            <q-icon name="description" size="32px" color="blue" class="q-mb-sm" />
            <div class="text-weight-medium" style="font-size: 13px">Documents</div>
            <div class="text-caption text-grey-5">{{ documentCount }} files</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6">
        <q-card flat class="info-card" clickable @click="$router.push('/portal/notifications')">
          <q-card-section class="text-center q-pa-md">
            <q-icon name="notifications" size="32px" color="orange" class="q-mb-sm" />
            <div class="text-weight-medium" style="font-size: 13px">Notifications</div>
            <div class="text-caption text-grey-5">{{ notificationCount }} new</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6">
        <q-card flat class="info-card" clickable @click="$router.push('/portal/faq')">
          <q-card-section class="text-center q-pa-md">
            <q-icon name="help_center" size="32px" color="purple" class="q-mb-sm" />
            <div class="text-weight-medium" style="font-size: 13px">FAQ</div>
            <div class="text-caption text-grey-5">Common questions</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6">
        <q-card flat class="info-card" clickable @click="$router.push('/portal/about')">
          <q-card-section class="text-center q-pa-md">
            <q-icon name="info" size="32px" color="teal" class="q-mb-sm" />
            <div class="text-weight-medium" style="font-size: 13px">About ecoLoop</div>
            <div class="text-caption text-grey-5">Company info</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Timeline Preview -->
    <div class="q-mb-lg">
      <div class="section-title q-mb-sm">Recent Activity</div>
      <q-card flat>
        <q-list v-if="timeline.length" separator>
          <q-item v-for="item in timeline.slice(0, 5)" :key="item.id" dense>
            <q-item-section avatar>
              <q-avatar size="32px" :color="item.color" text-color="white">
                <q-icon :name="item.icon" size="14px" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label style="font-size: 13px">{{ item.message }}</q-item-label>
              <q-item-label caption>{{ item.date }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <q-card-section v-else class="text-center q-pa-lg">
          <q-icon name="inbox" size="40px" color="grey-4" />
          <div class="text-grey-6 q-mt-sm" style="font-size: 13px">No activity yet</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Contact Support -->
    <q-card flat class="support-card">
      <q-card-section class="row items-center q-pa-md">
        <q-icon name="support_agent" size="36px" color="primary" class="q-mr-md" />
        <div class="col">
          <div class="text-weight-bold" style="font-size: 14px">Need Help?</div>
          <div class="text-caption text-grey-5">Contact our support team</div>
        </div>
        <q-btn unelevated no-caps color="primary" label="Contact Us" size="sm" style="border-radius: 8px" @click="$router.push('/portal/faq')" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/boot/axios';

const router = useRouter();
const customerName = ref('');
const currentStage = ref('NEW_LEAD');
const documentCount = ref(0);
const notificationCount = ref(0);
const lastUpdated = ref('--');
interface TimelineEntry {
  id: string;
  event: string;
  title: string;
  message?: string;
  createdAt: string;
}
const timeline = ref<TimelineEntry[]>([]);

const STAGE_ORDER = [
  'NEW_LEAD', 'ALREADY_CALLED', 'CONNECTED', 'REQUEST_DESIGN', 'DESIGN_IN_PROGRESS',
  'DESIGN_READY', 'WON', 'SITE_AUDIT', 'PROGRESS_REVIEW', 'NTP', 'ENGINEERING',
  'PERMIT_AND_ICE', 'FINAL_APPROVAL', 'INSTALL_READY', 'INSTALL', 'COMMISSION',
  'SITE_COMPLETE', 'CUSTOMER_SUCCESS',
];

const STAGE_NAMES: Record<string, string> = {
  NEW_LEAD: 'New Lead', ALREADY_CALLED: 'Already Called', CONNECTED: 'Connected',
  REQUEST_DESIGN: 'Design Requested', DESIGN_IN_PROGRESS: 'Design In Progress',
  DESIGN_READY: 'Design Ready', WON: 'Contract Signed', SITE_AUDIT: 'Site Audit',
  PROGRESS_REVIEW: 'Progress Review', NTP: 'Notice to Proceed', ENGINEERING: 'Engineering',
  PERMIT_AND_ICE: 'Permitting', FINAL_APPROVAL: 'Final Approval',
  INSTALL_READY: 'Installation Ready', INSTALL: 'Installing', COMMISSION: 'Commissioning',
  SITE_COMPLETE: 'Site Complete', CUSTOMER_SUCCESS: 'Complete!',
};

const progressPct = computed(() => {
  const idx = STAGE_ORDER.indexOf(currentStage.value);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
});

const currentStageName = computed(() => STAGE_NAMES[currentStage.value] ?? currentStage.value);

const statusColor = computed(() => {
  if (currentStage.value === 'CUSTOMER_SUCCESS') return 'positive';
  if (['INSTALL', 'INSTALL_READY'].includes(currentStage.value)) return 'blue';
  return 'primary';
});

const statusLabel = computed(() => {
  if (currentStage.value === 'CUSTOMER_SUCCESS') return 'Complete';
  return 'In Progress';
});

onMounted(async () => {
  // Seed name from localStorage immediately for fast render
  const stored = localStorage.getItem('portalCustomer');
  if (stored) {
    const data = JSON.parse(stored);
    customerName.value = data.name || data.firstName || 'Customer';
    if (data.currentStage) currentStage.value = data.currentStage;
  }

  // Fetch fresh data from API
  const token = localStorage.getItem('portalToken');
  if (!token) { router.replace('/portal/login'); return; }

  try {
    const { data } = await api.get('/portal/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data.statusCode === 401) { router.replace('/portal/login'); return; }

    customerName.value = data.name || `${data.firstName} ${data.lastName}`;
    if (data.currentStage) currentStage.value = data.currentStage;

    // Persist fresh data back to localStorage
    const fresh = { ...(stored ? JSON.parse(stored) : {}), ...data };
    localStorage.setItem('portalCustomer', JSON.stringify(fresh));

    lastUpdated.value = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    // Token likely expired
    localStorage.removeItem('portalToken');
    localStorage.removeItem('portalCustomer');
    router.replace('/portal/login');
  }

  timeline.value = [
    { id: '1', message: 'Welcome to ecoLoop! Your solar journey starts here.', date: 'Today', icon: 'celebration', color: 'primary' },
    { id: '2', message: 'Your project has been created.', date: 'Today', icon: 'add_circle', color: 'positive' },
  ];
});
</script>

<style lang="scss" scoped>
.portal-dashboard {
  background: #F8FAFB;
  padding: 24px 5% !important;
  max-width: 100%;
  margin: 0 auto;
}

.welcome-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.welcome-sub {
  margin: 4px 0 0;
  color: #6B7280;
  font-size: 14px;
}

.status-card, .info-card, .support-card {
  border-radius: 16px;
}

.info-card {
  cursor: pointer;
  transition: all 200ms ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.stage-info {
  background: rgba(0, 137, 123, 0.1);
  border: 1px solid rgba(0, 137, 123, 0.25);
  border-radius: 12px;
  padding: 12px 16px;

  .text-caption { color: #6B7280 !important; }

  .text-weight-bold { color: #00897B !important; }
}

.status-card {
  border-left: 4px solid #00897B;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
