<template>
  <q-layout view="hHh LpR fFf">
    <q-header elevated class="bg-secondary">
      <q-toolbar>
        <q-btn flat round dense icon="menu" @click="drawerOpen = !drawerOpen" class="lt-md" />
        <q-toolbar-title class="text-weight-bold">
          <q-icon name="eco" class="q-mr-sm" />
          Loop Admin
        </q-toolbar-title>
        <q-space />
        <q-btn flat round dense icon="notifications">
          <q-badge color="negative" floating>3</q-badge>
        </q-btn>
        <q-btn flat round dense class="q-ml-sm" @click="$router.push('/profile')">
          <q-avatar size="28px" color="white" text-color="secondary">
            <span class="text-caption text-weight-bold">A</span>
          </q-avatar>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" show-if-above bordered class="bg-grey-1">
      <q-list padding>
        <q-item-label header class="text-grey-7 text-weight-bold q-pb-md">
          CRM
        </q-item-label>

        <q-item
          v-for="item in navItems"
          :key="item.route"
          clickable
          v-ripple
          :to="item.route"
          active-class="text-primary bg-teal-1"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <q-item-label header class="text-grey-7 text-weight-bold q-pb-md">
          Admin
        </q-item-label>

        <q-item
          v-for="item in adminItems"
          :key="item.route"
          clickable
          v-ripple
          :to="item.route"
          active-class="text-primary bg-teal-1"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const drawerOpen = ref(false);

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', route: '/crm' },
  { label: 'Pipeline', icon: 'view_kanban', route: '/crm/pipeline' },
  { label: 'Customers', icon: 'people', route: '/crm/customers' },
];

const adminItems = [
  { label: 'Scoreboard', icon: 'leaderboard', route: '/admin/scoreboard' },
  { label: 'Users', icon: 'manage_accounts', route: '/admin/users' },
  { label: 'Notifications', icon: 'notifications', route: '/admin/notifications' },
  { label: 'Settings', icon: 'settings', route: '/admin/settings' },
];
</script>
