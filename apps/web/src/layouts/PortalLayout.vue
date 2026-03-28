<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header -->
    <q-header class="portal-header" bordered>
      <q-toolbar>
        <img src="/logo_short_dark.svg" alt="ecoLoop" class="portal-logo" @click="$router.push('/portal')" />
        <q-toolbar-title class="portal-title"><span class="title-gradient">ecoLoop</span></q-toolbar-title>
        <q-space />

        <!-- Notifications bell -->
        <q-btn flat round icon="notifications" color="grey-7" size="sm" @click="$router.push('/portal/notifications')">
          <q-badge v-if="unreadCount > 0" floating color="red" :label="unreadCount" />
        </q-btn>

        <!-- User menu -->
        <q-btn flat round icon="account_circle" color="grey-7" size="sm">
          <q-menu>
            <q-list dense style="min-width: 180px">
              <q-item class="q-pa-sm">
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ customerName }}</q-item-label>
                  <q-item-label caption>{{ customerEmail }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="$router.push('/portal/profile')">
                <q-item-section avatar><q-icon name="person" size="18px" /></q-item-section>
                <q-item-section>My Profile</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="logout">
                <q-item-section avatar><q-icon name="logout" size="18px" color="negative" /></q-item-section>
                <q-item-section class="text-negative">Logout</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Page content -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Bottom navigation (mobile) -->
    <q-footer class="portal-footer" bordered>
      <div class="footer-gradient-bar" />
      <q-tabs v-model="activeTab" active-color="primary" indicator-color="primary" class="portal-tabs" dense no-caps>
        <q-tab name="home" icon="home" label="Home" @click="$router.push('/portal')" />
        <q-tab name="project" icon="solar_power" label="My Project" @click="$router.push('/portal/project')" />
        <q-tab name="faq" icon="help" label="FAQ" @click="$router.push('/portal/faq')" />
        <q-tab name="profile" icon="person" label="Profile" @click="$router.push('/portal/profile')" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const activeTab = ref('home');
const unreadCount = ref(0);
const customerName = ref('Customer');
const customerEmail = ref('');

// Portal always runs in light mode — isolated from admin dark mode setting
let previousDarkMode = false;

watch(() => route.path, (path) => {
  if (path.includes('/project')) activeTab.value = 'project';
  else if (path.includes('/faq')) activeTab.value = 'faq';
  else if (path.includes('/profile')) activeTab.value = 'profile';
  else activeTab.value = 'home';
}, { immediate: true });

onMounted(() => {
  // Force light mode in portal — never inherit admin dark mode
  previousDarkMode = $q.dark.isActive;
  $q.dark.set(false);

  const token = localStorage.getItem('portalToken');
  if (!token) {
    router.replace('/portal/login');
    return;
  }

  const stored = localStorage.getItem('portalCustomer');
  if (stored) {
    const data = JSON.parse(stored);
    customerName.value = data.name || 'Customer';
    customerEmail.value = data.email || '';
  }
});

onUnmounted(() => {
  // Restore admin dark mode preference when leaving portal
  $q.dark.set(previousDarkMode);
});

function logout() {
  localStorage.removeItem('portalToken');
  localStorage.removeItem('portalCustomer');
  router.push('/portal/login');
}
</script>

<style lang="scss" scoped>
.portal-header {
  background: #FFFFFF;
  border-bottom: 1px solid #E5E7EB;
}

.portal-logo {
  height: 28px;
  cursor: pointer;
}

.portal-title {
  font-size: 18px;
  font-weight: 700;
  margin-left: 8px;
}

.title-gradient {
  background: linear-gradient(90deg, #00D4AA, #7EFF4A);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

.portal-footer {
  background: #FFFFFF;
  border-top: 1px solid #F3F4F6;
}

.portal-tabs {
  max-width: 560px;
  margin: 0 auto;

  :deep(.q-tab) {
    font-size: 11px;
    min-height: 56px;
    color: #9CA3AF;
    font-weight: 500;

    &.q-tab--active {
      color: #00897B;
    }
  }
}

.body--dark {
  .portal-header {
    background: var(--bg-card);
    border-color: var(--border-light);
  }
  .portal-title { color: #00E5C8; }
  .portal-footer { background: var(--bg-card); border-color: var(--border-light); }
}
</style>
