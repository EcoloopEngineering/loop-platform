<template>
  <q-page class="q-pa-md page-bg">
    <h5 class="q-my-none text-weight-bold q-mb-md">Referrals</h5>

    <!-- Invite link -->
    <q-card flat class="invite-card q-mb-lg">
      <q-card-section>
        <div class="text-weight-bold q-mb-sm text-14">Your Referral Link</div>
        <div class="text-caption text-grey-5 q-mb-md">
          Share this link with people you want to invite. When they sign up and create leads, those leads will be linked to you.
        </div>
        <div class="row items-center q-gutter-x-sm">
          <q-input
            :model-value="inviteLink"
            readonly
            dense
            outlined
            class="col invite-input"
          />
          <q-btn
            color="primary"
            unelevated
            no-caps
            :icon="copied ? 'check' : 'content_copy'"
            :label="copied ? 'Copied!' : 'Copy'"
            class="radius-10"
            @click="copyLink"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Stats -->
    <div class="row q-col-gutter-sm q-mb-lg">
      <div class="col-4">
        <div class="stat-mini">
          <div class="stat-mini-value">{{ referrals.length }}</div>
          <div class="stat-mini-label">Invited</div>
        </div>
      </div>
      <div class="col-4">
        <div class="stat-mini">
          <div class="stat-mini-value">{{ totalLeads }}</div>
          <div class="stat-mini-label">Their Leads</div>
        </div>
      </div>
      <div class="col-4">
        <div class="stat-mini">
          <div class="stat-mini-value">{{ activeCount }}</div>
          <div class="stat-mini-label">Active</div>
        </div>
      </div>
    </div>

    <!-- People I invited -->
    <div class="text-weight-bold q-mb-sm section-label">
      People You Invited
    </div>

    <div v-if="loading" class="text-center q-pa-xl">
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

    <div v-else-if="referrals.length === 0" class="text-center q-pa-xl">
      <q-icon name="group_add" size="56px" color="grey-4" />
      <div class="text-grey-6 q-mt-sm text-15">No referrals yet</div>
      <div class="text-grey-5 text-13">Share your link above to invite people</div>
    </div>

    <div v-else class="referral-list">
      <q-card
        v-for="ref in referrals"
        :key="ref.id"
        flat
        class="referral-card q-mb-sm"
      >
        <q-card-section class="q-pa-md">
          <div class="row items-center no-wrap">
            <UserAvatar :name="titleCase(ref.name)" size="40px" color="orange-7" class="q-mr-md" />
            <div class="col">
              <div class="text-weight-bold text-15">{{ titleCase(ref.name) }}</div>
              <div class="text-caption text-grey-5">{{ ref.email }}</div>
            </div>
            <div class="column items-end gap-xxs">
              <q-badge
                :color="ref.isActive ? 'positive' : 'grey-4'"
                :text-color="ref.isActive ? 'white' : 'grey-7'"
                :label="ref.isActive ? 'Active' : 'Inactive'"
                class="badge-pill-sm"
              />
              <div class="text-caption text-grey-5">{{ ref.leadCount }} leads</div>
            </div>
          </div>

          <!-- Leads from this person -->
          <div v-if="ref.leads && ref.leads.length > 0" class="q-mt-sm q-ml-xl">
            <q-list dense separator>
              <q-item
                v-for="lead in ref.leads"
                :key="lead.id"
                clickable
                @click="$router.push(`/leads/${lead.id}`)"
                class="q-px-none"
              >
                <q-item-section>
                  <q-item-label class="text-13">{{ titleCase(lead.customerName) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge
                    :style="{ background: stageColor(lead.stage) }"
                    text-color="white"
                    class="badge-pill-xs"
                  >
                    {{ formatStage(lead.stage) }}
                  </q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/boot/axios';
import { useUserStore } from '@/stores/user.store';
import { titleCase } from '@/composables/useLeadFormatting';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { useLeadFormatting } from '@/composables/useLeadFormatting';

const { stageColor, formatStage } = useLeadFormatting();

interface ReferralLead {
  id: string;
  customerName: string;
  stage: string;
}

interface ReferralPerson {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  leadCount: number;
  leads: ReferralLead[];
}

const userStore = useUserStore();
const referrals = ref<ReferralPerson[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const copied = ref(false);
const inviteLink = ref('');

const totalLeads = computed(() => referrals.value.reduce((sum, r) => sum + r.leadCount, 0));
const activeCount = computed(() => referrals.value.filter((r) => r.isActive).length);

async function loadData() {
  loading.value = true;
  error.value = null;
  const userId = userStore.user?.id ?? '';
  inviteLink.value = `${window.location.origin}/auth/invite/${userId}`;

  try {
    const { data } = await api.get('/referrals');
    const list = Array.isArray(data) ? data : data.data ?? [];

    interface RawReferralLead {
      id: string;
      customer?: { firstName: string; lastName: string };
      customerName?: string;
      currentStage?: string;
      stage?: string;
    }
    interface RawReferral {
      id: string;
      inviteeId?: string;
      invitee?: { firstName?: string; lastName?: string; email?: string; isActive?: boolean; _count?: { leadAssignments?: number } };
      name?: string;
      email?: string;
      leadCount?: number;
      leads?: RawReferralLead[];
    }
    referrals.value = (list as RawReferral[]).map((r) => ({
      id: r.inviteeId ?? r.id,
      name: r.invitee
        ? `${r.invitee.firstName ?? ''} ${r.invitee.lastName ?? ''}`.trim()
        : r.name ?? 'Unknown',
      email: r.invitee?.email ?? r.email ?? '--',
      isActive: r.invitee?.isActive ?? true,
      leadCount: r.invitee?._count?.leadAssignments ?? r.leadCount ?? 0,
      leads: (r.leads ?? []).map((l) => ({
        id: l.id,
        customerName: l.customer
          ? `${l.customer.firstName} ${l.customer.lastName}`
          : l.customerName ?? 'Unknown',
        stage: l.currentStage ?? l.stage ?? 'NEW_LEAD',
      })),
    }));
  } catch {
    error.value = 'Failed to load referrals. Please try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => { loadData(); });

async function copyLink() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(inviteLink.value);
    } else {
      // Fallback for HTTP
      const ta = document.createElement('textarea');
      ta.value = inviteLink.value;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch { /* ignore */ }
}

</script>

<style lang="scss" scoped>
.invite-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 14px;
}

.invite-input {
  :deep(.q-field__control) {
    border-radius: 10px;
    font-size: 13px;
  }
}

.stat-mini {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 14px;
  text-align: center;

  .stat-mini-value {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
  }

  .stat-mini-label {
    font-size: 11px;
    color: #9CA3AF;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
}

.referral-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  transition: all 200ms ease;

  &:hover {
    border-color: rgba(0, 137, 123, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
}
</style>
