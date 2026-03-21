<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="auth-layout flex flex-center">
        <div class="auth-container full-width" style="max-width: 420px">
          <div class="text-center q-mb-xl">
            <q-icon name="eco" color="primary" size="64px" />
            <h4 class="q-mt-md q-mb-none text-weight-bold text-secondary">Loop</h4>
            <p class="text-grey-6 q-mt-sm">Grow your network, close more deals</p>
          </div>

          <q-card flat bordered class="q-pa-lg auth-card">
            <router-view />
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// Clean auth layout with centered card and logo
</script>

<style lang="scss" scoped>
.auth-layout {
  background: linear-gradient(135deg, #e0f2f1 0%, #ffffff 100%);
  min-height: 100vh;
}

.auth-card {
  border-radius: 16px;
}
</style>
