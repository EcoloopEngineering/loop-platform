<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="auth-layout flex flex-center">
        <div class="auth-container animate-fadeInUp">
          <!-- Logo -->
          <div class="text-center q-mb-xl">
            <img src="/logo_short_dark.svg" alt="ecoLoop" class="auth-logo" />
          </div>

          <!-- Auth Card -->
          <div class="auth-card">
            <router-view />
          </div>

          <!-- Footer -->
          <div class="auth-footer">
            &copy; {{ new Date().getFullYear() }} EcoLoop Solar Energy. All rights reserved.
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
  background: linear-gradient(135deg, #F9FAFB 0%, #F0FDFA 50%, #F9FAFB 100%);
  min-height: 100vh;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  padding: 24px 16px;
}

.auth-logo {
  height: 40px;
  width: auto;
  opacity: 0.9;
}

.auth-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  padding: 32px;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: #9CA3AF;
}
</style>
