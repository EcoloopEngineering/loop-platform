<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="auth-layout flex flex-center">
        <div class="auth-container">
          <!-- Logo -->
          <div class="text-center q-mb-xl">
            <img src="/logo_short_dark.svg" alt="ecoLoop" class="auth-logo" />
          </div>

          <!-- Auth Card -->
          <q-card flat class="auth-card">
            <q-card-section class="q-pa-lg">
              <router-view />
            </q-card-section>
          </q-card>

          <!-- Footer -->
          <div class="text-center q-mt-lg text-hint" style="font-size: 13px">
            &copy; {{ new Date().getFullYear() }} ecoLoop Solar Energy. All rights reserved.
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.auth-layout {
  background: #F8FAFB;
  min-height: 100vh;
}

.auth-container {
  width: 100%;
  max-width: 420px;
  padding: 24px 16px;
}

.auth-logo {
  height: 44px;
  width: auto;
}

.auth-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.text-hint {
  color: #9CA3AF;
}
</style>
