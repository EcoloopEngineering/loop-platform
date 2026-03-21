<template>
  <q-page class="q-pa-md">
    <h5 class="q-my-none text-weight-bold q-mb-md">Referrals</h5>

    <!-- Invite link -->
    <q-card flat bordered class="rounded-card q-mb-lg">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-sm">Your Referral Link</div>
        <div class="row items-center q-gutter-x-sm">
          <q-input
            :model-value="inviteLink"
            readonly
            dense
            outlined
            class="col filter-input"
          />
          <q-btn
            color="primary"
            unelevated
            no-caps
            icon="content_copy"
            label="Copy"
            class="rounded-btn"
            @click="copyLink"
          />
        </div>
        <div v-if="copied" class="text-positive text-caption q-mt-xs">
          Link copied!
        </div>
      </q-card-section>
    </q-card>

    <!-- Referral tree -->
    <div class="text-subtitle1 text-weight-bold q-mb-sm">Referral Hierarchy</div>

    <div v-if="loading" class="row justify-center q-pa-lg">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <q-tree
      v-else-if="treeData.length"
      :nodes="treeData"
      node-key="id"
      label-key="name"
      children-key="children"
      default-expand-all
    >
      <template #default-header="prop">
        <div class="row items-center q-gutter-x-sm">
          <q-avatar size="28px" color="primary" text-color="white">
            <span class="text-caption" style="font-size: 10px">
              {{ initials(prop.node.name) }}
            </span>
          </q-avatar>
          <div>
            <div class="text-body2 text-weight-bold">{{ prop.node.name }}</div>
            <div class="text-caption text-grey-6">
              {{ prop.node.leadsCount ?? 0 }} leads
            </div>
          </div>
        </div>
      </template>
    </q-tree>

    <div v-else class="text-grey-6 text-center q-pa-lg">
      No referrals yet. Share your link to get started!
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/boot/axios';
import { useUserStore } from '@/stores/user.store';

interface ReferralNode {
  id: string;
  name: string;
  leadsCount: number;
  children: ReferralNode[];
}

const userStore = useUserStore();
const treeData = ref<ReferralNode[]>([]);
const loading = ref(false);
const copied = ref(false);

const inviteLink = ref('');

onMounted(async () => {
  const userId = userStore.user?.id ?? '';
  inviteLink.value = `${window.location.origin}/auth/invite/${userId}`;

  loading.value = true;
  try {
    const { data } = await api.get<ReferralNode[]>('/referrals/tree');
    treeData.value = data;
  } catch {
    // No referrals
  } finally {
    loading.value = false;
  }
});

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Fallback
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
</script>

<style lang="scss" scoped>
.rounded-card {
  border-radius: 12px;
}
.rounded-btn {
  border-radius: 10px;
}
.filter-input {
  :deep(.q-field__control) {
    border-radius: 10px;
  }
}
</style>
