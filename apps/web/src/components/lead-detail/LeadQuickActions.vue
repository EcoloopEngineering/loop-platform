<template>
  <q-btn flat dense round icon="more_horiz" size="sm" color="grey-7" aria-label="More actions">
    <q-menu>
      <q-list dense style="min-width: 180px">
        <q-item clickable v-close-popup @click="emit('changeOrder')">
          <q-item-section avatar><q-icon name="description" color="orange-8" size="18px" /></q-item-section>
          <q-item-section>Change Order</q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="emit('generateCap')">
          <q-item-section avatar><q-icon name="verified" color="purple" size="18px" /></q-item-section>
          <q-item-section>Generate CAP</q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable v-close-popup @click="emit('sendEmail')">
          <q-item-section avatar><q-icon name="forward_to_inbox" size="18px" /></q-item-section>
          <q-item-section>Send Email</q-item-section>
        </q-item>
        <q-separator />
        <q-item v-if="leadStatus !== 'LOST'" clickable v-close-popup @click="emit('markLost')">
          <q-item-section avatar><q-icon name="cancel" color="red" size="18px" /></q-item-section>
          <q-item-section class="text-red">Mark as Lost</q-item-section>
        </q-item>
        <q-item v-if="leadStatus !== 'CANCELLED'" clickable v-close-popup @click="emit('markCancelled')">
          <q-item-section avatar><q-icon name="block" color="grey-6" size="18px" /></q-item-section>
          <q-item-section class="text-grey-7">Mark as Cancelled</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
defineProps<{
  leadStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'changeOrder'): void;
  (e: 'generateCap'): void;
  (e: 'sendEmail'): void;
  (e: 'markLost'): void;
  (e: 'markCancelled'): void;
}>();
</script>
