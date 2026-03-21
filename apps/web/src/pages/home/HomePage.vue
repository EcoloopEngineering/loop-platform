<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h5 class="q-my-none text-weight-bold">{{ greeting }}</h5>
        <p class="text-grey-6 q-mb-none">Here's your overview</p>
      </div>
    </div>

    <q-tabs v-model="activeTab" dense align="left" active-color="primary" indicator-color="primary" class="q-mb-md">
      <q-tab name="overview" label="Overview" />
      <q-tab name="leads" label="Leads" />
      <q-tab name="performance" label="Performance" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>
      <q-tab-panel name="overview" class="q-px-none">
        <div class="row q-col-gutter-md">
          <div class="col-6">
            <q-card flat bordered class="stat-card">
              <q-card-section>
                <div class="text-caption text-grey-6">Total Leads</div>
                <div class="text-h5 text-weight-bold">--</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6">
            <q-card flat bordered class="stat-card">
              <q-card-section>
                <div class="text-caption text-grey-6">Referrals</div>
                <div class="text-h5 text-weight-bold">--</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6">
            <q-card flat bordered class="stat-card">
              <q-card-section>
                <div class="text-caption text-grey-6">Closed Won</div>
                <div class="text-h5 text-weight-bold">--</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6">
            <q-card flat bordered class="stat-card">
              <q-card-section>
                <div class="text-caption text-grey-6">Conversion</div>
                <div class="text-h5 text-weight-bold">--%</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="leads" class="q-px-none">
        <q-list separator>
          <q-item class="text-grey-6 text-center">
            <q-item-section>No leads yet. Create your first lead to get started.</q-item-section>
          </q-item>
        </q-list>
      </q-tab-panel>

      <q-tab-panel name="performance" class="q-px-none">
        <div class="text-grey-6 text-center q-pa-xl">
          Performance charts coming soon.
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/user.store';

defineProps<{ manager?: string }>();

const userStore = useUserStore();
const activeTab = ref('overview');

const greeting = computed(() => {
  const name = userStore.user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
});
</script>

<style lang="scss" scoped>
.stat-card {
  border-radius: 12px;
}
</style>
