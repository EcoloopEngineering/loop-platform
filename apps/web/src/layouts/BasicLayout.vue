<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-secondary">
      <q-toolbar>
        <q-btn flat round dense icon="arrow_back" @click="goBack" />
        <q-toolbar-title class="text-weight-bold">{{ title }}</q-toolbar-title>
        <slot name="header-right" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer v-if="$slots.footer" class="bg-white">
      <slot name="footer" />
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const title = computed(() => {
  return (route.meta.title as string) ?? '';
});

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/home');
  }
}
</script>
