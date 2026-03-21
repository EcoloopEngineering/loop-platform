<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-secondary">
      <q-toolbar>
        <q-avatar size="32px" class="q-mr-sm">
          <q-icon name="eco" color="white" size="24px" />
        </q-avatar>
        <q-toolbar-title class="text-weight-bold">Loop</q-toolbar-title>
        <q-space />
        <q-btn flat round dense icon="notifications" @click="$router.push('/admin/notifications')">
          <q-badge v-if="notificationCount > 0" color="negative" floating>
            {{ notificationCount }}
          </q-badge>
        </q-btn>
        <q-btn flat round dense class="q-ml-sm" @click="$router.push('/profile')">
          <q-avatar size="28px" color="white" text-color="secondary">
            <span class="text-caption text-weight-bold">{{ userInitials }}</span>
          </q-avatar>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer elevated class="bg-white text-grey-8">
      <q-tabs
        v-model="activeTab"
        dense
        active-color="primary"
        indicator-color="primary"
        class="bottom-tabs"
      >
        <q-tab name="home" icon="home" label="Home" @click="$router.push('/home')" />
        <q-tab name="leads" icon="people" label="Leads" @click="$router.push('/leads/new')" />
        <q-tab name="referrals" icon="share" label="Referrals" @click="$router.push('/referrals')" />
        <q-tab name="forms" icon="description" label="Forms" @click="$router.push('/forms')" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user.store';

const route = useRoute();
const userStore = useUserStore();

const notificationCount = ref(0);

const activeTab = computed(() => {
  const path = route.path;
  if (path.startsWith('/home') || path === '/dashboard') return 'home';
  if (path.startsWith('/leads')) return 'leads';
  if (path.startsWith('/referrals')) return 'referrals';
  if (path.startsWith('/forms')) return 'forms';
  return 'home';
});

const userInitials = computed(() => {
  const name = userStore.user?.name ?? '';
  return name
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
});
</script>

<style lang="scss" scoped>
.bottom-tabs {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
