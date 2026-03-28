<template>
  <q-page class="portal-notifications q-pa-md">
    <h5 class="page-title q-mb-md">Notifications</h5>

    <div v-if="notifications.length === 0" class="text-center q-pa-xl">
      <q-icon name="notifications_none" size="64px" color="grey-4" />
      <div class="text-grey-6 q-mt-md" style="font-size: 15px">No notifications yet</div>
      <div class="text-grey-5" style="font-size: 13px">You'll receive updates about your solar project here</div>
    </div>

    <q-list v-else separator>
      <q-item v-for="n in notifications" :key="n.id" :class="{ 'unread': !n.isRead }">
        <q-item-section avatar>
          <q-avatar size="36px" :color="n.color" text-color="white">
            <q-icon :name="n.icon" size="16px" />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium" style="font-size: 14px">{{ n.title }}</q-item-label>
          <q-item-label style="font-size: 13px; color: #6B7280">{{ n.message }}</q-item-label>
          <q-item-label caption>{{ n.date }}</q-item-label>
        </q-item-section>
        <q-item-section side v-if="!n.isRead">
          <q-badge color="primary" rounded />
        </q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const notifications = ref([
  {
    id: '1',
    title: 'Welcome to ecoLoop!',
    message: 'Your customer account has been created. Track your solar project here.',
    date: 'Just now',
    icon: 'celebration',
    color: 'primary',
    isRead: false,
  },
  {
    id: '2',
    title: 'Project Created',
    message: 'Your solar project has been initiated. We\'ll keep you updated on the progress.',
    date: 'Just now',
    icon: 'solar_power',
    color: 'positive',
    isRead: true,
  },
]);
</script>

<style lang="scss" scoped>
.portal-notifications {
  background: #F8FAFB;
  padding: 24px 5% !important;
  max-width: 100%;
  margin: 0 auto;
}

.page-title {
  margin: 0;
  font-weight: 700;
  color: #111827;
}

.unread {
  background: rgba(0, 137, 123, 0.04);
}
</style>
