<template>
  <!-- Change Order Dialog -->
  <q-dialog v-model="showChangeOrder" persistent @keyup.esc="showChangeOrder = false" aria-label="Generate change order dialog">
    <q-card style="min-width: 420px; border-radius: 16px">
      <q-card-section><div class="text-h6 text-weight-bold">Generate Change Order</div></q-card-section>
      <q-card-section class="q-gutter-md q-pt-none">
        <q-input v-model="changeOrderNote" label="Changes (one per line)" type="textarea" outlined autogrow />
        <q-input v-model="changeOrderNotes" label="Additional notes" outlined dense />
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup aria-label="Cancel change order" />
        <q-btn unelevated no-caps label="Generate PDF" color="orange-8" :loading="generatingDoc" @click="generateChangeOrder" style="border-radius: 10px" aria-label="Generate change order PDF" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- CAP Dialog -->
  <q-dialog v-model="showCap" persistent @keyup.esc="showCap = false" aria-label="Generate CAP document dialog">
    <q-card style="min-width: 420px; border-radius: 16px">
      <q-card-section><div class="text-h6 text-weight-bold">Generate CAP</div></q-card-section>
      <q-card-section class="q-gutter-md q-pt-none">
        <q-option-group v-model="capMode" :options="[{ label: 'Send for e-signature (ZapSign)', value: 'approval' }, { label: 'Send informative email', value: 'informative' }]" color="primary" />
        <q-input v-model="capSystemSize" label="System Size (kW)" outlined dense />
        <q-input v-model="capMonthlyPayment" label="Monthly Payment" outlined dense />
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup aria-label="Cancel CAP generation" />
        <q-btn unelevated no-caps label="Generate CAP" color="purple" :loading="generatingDoc" @click="generateCAP" style="border-radius: 10px" aria-label="Generate CAP document" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Mark as Lost Dialog -->
  <q-dialog v-model="showLost" persistent @keyup.esc="showLost = false" aria-label="Mark lead as lost dialog">
    <q-card style="min-width: 420px; border-radius: 16px">
      <q-card-section><div class="text-h6 text-weight-bold">Mark as Lost</div></q-card-section>
      <q-card-section class="q-pt-none">
        <q-input v-model="lostReason" label="Reason for losing this lead" type="textarea" outlined autogrow />
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup aria-label="Cancel marking as lost" />
        <q-btn unelevated no-caps label="Mark as Lost" color="red" :loading="markingStatus" @click="markAsLost" style="border-radius: 10px" aria-label="Confirm mark lead as lost" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Mark as Cancelled Dialog -->
  <q-dialog v-model="showCancelled" persistent @keyup.esc="showCancelled = false" aria-label="Mark lead as cancelled dialog">
    <q-card style="min-width: 420px; border-radius: 16px">
      <q-card-section><div class="text-h6 text-weight-bold">Mark as Cancelled</div></q-card-section>
      <q-card-section class="q-pt-none">
        <q-input v-model="cancelledReason" label="Reason for cancellation" type="textarea" outlined autogrow />
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup aria-label="Cancel marking as cancelled" />
        <q-btn unelevated no-caps label="Mark as Cancelled" color="grey-7" :loading="markingStatus" @click="markAsCancelled" style="border-radius: 10px" aria-label="Confirm mark lead as cancelled" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Schedule Dialog -->
  <q-dialog v-model="showSchedule" persistent @keyup.esc="showSchedule = false" aria-label="Schedule appointment dialog">
    <q-card style="min-width: 420px; border-radius: 16px">
      <q-card-section><div class="text-h6 text-weight-bold">Schedule Appointment</div></q-card-section>
      <q-card-section class="q-gutter-md q-pt-none">
        <q-select v-model="scheduleType" :options="['SITE_AUDIT', 'INSTALLATION']" label="Type" outlined dense />
        <q-input v-model="scheduleDate" label="Date & Time" type="datetime-local" outlined dense />
        <q-input v-model="scheduleDuration" label="Duration (minutes)" type="number" outlined dense />
        <q-input v-model="scheduleNotes" label="Notes" outlined dense />
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup aria-label="Cancel scheduling" />
        <q-btn unelevated no-caps label="Book Appointment" color="blue" :loading="scheduling" @click="bookAppointment" style="border-radius: 10px" aria-label="Confirm and book appointment" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import type { Document } from '@/types/api';

const props = defineProps<{
  leadId: string;
}>();

const emit = defineEmits<{
  (e: 'fileAdded', file: Document): void;
  (e: 'statusChanged', status: string): void;
  (e: 'refresh'): void;
}>();

const $q = useQuasar();

// ---- Dialog visibility (exposed so parent can open them) ----
const showChangeOrder = ref(false);
const showCap = ref(false);
const showLost = ref(false);
const showCancelled = ref(false);
const showSchedule = ref(false);

function openChangeOrder() { showChangeOrder.value = true; }
function openCap() { showCap.value = true; }
function openLost() { showLost.value = true; }
function openCancelled() { showCancelled.value = true; }
function openSchedule() { showSchedule.value = true; }

defineExpose({ openChangeOrder, openCap, openLost, openCancelled, openSchedule });

// ---- Change Order ----
const changeOrderNote = ref('');
const changeOrderNotes = ref('');
const generatingDoc = ref(false);

async function generateChangeOrder() {
  generatingDoc.value = true;
  try {
    const changes = changeOrderNote.value.split('\n').filter((l) => l.trim());
    const { data } = await api.post(`/leads/${props.leadId}/change-order`, {
      changes,
      notes: changeOrderNotes.value || undefined,
    });
    emit('fileAdded', { id: data.id, name: data.name, url: data.url, size: data.size, createdAt: new Date().toISOString() });
    showChangeOrder.value = false;
    changeOrderNote.value = '';
    changeOrderNotes.value = '';
    $q.notify({ type: 'positive', message: 'Change Order generated' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to generate Change Order' });
  } finally {
    generatingDoc.value = false;
  }
}

// ---- CAP ----
const capMode = ref('approval');
const capSystemSize = ref('');
const capMonthlyPayment = ref('');

async function generateCAP() {
  generatingDoc.value = true;
  try {
    const { data } = await api.post(`/leads/${props.leadId}/cap`, {
      mode: capMode.value,
      systemSize: capSystemSize.value || undefined,
      monthlyPayment: capMonthlyPayment.value || undefined,
    });
    emit('fileAdded', { id: data.id, name: data.name, url: data.url, size: data.size, createdAt: new Date().toISOString() });
    showCap.value = false;
    const msg = data.zapSign ? 'CAP sent for e-signature via ZapSign' : 'CAP generated and emailed';
    $q.notify({ type: 'positive', message: msg });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to generate CAP' });
  } finally {
    generatingDoc.value = false;
  }
}

// ---- Mark as Lost / Cancelled ----
const lostReason = ref('');
const cancelledReason = ref('');
const markingStatus = ref(false);

async function markAsLost() {
  markingStatus.value = true;
  try {
    await api.patch(`/leads/${props.leadId}/lost`, { reason: lostReason.value || undefined });
    emit('statusChanged', 'LOST');
    showLost.value = false;
    lostReason.value = '';
    $q.notify({ type: 'positive', message: 'Lead marked as lost' });
    emit('refresh');
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to mark as lost' });
  } finally {
    markingStatus.value = false;
  }
}

async function markAsCancelled() {
  markingStatus.value = true;
  try {
    await api.patch(`/leads/${props.leadId}/cancel`, { reason: cancelledReason.value || undefined });
    emit('statusChanged', 'CANCELLED');
    showCancelled.value = false;
    cancelledReason.value = '';
    $q.notify({ type: 'positive', message: 'Lead marked as cancelled' });
    emit('refresh');
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to mark as cancelled' });
  } finally {
    markingStatus.value = false;
  }
}

// ---- Scheduling ----
const scheduleType = ref('SITE_AUDIT');
const scheduleDate = ref('');
const scheduleDuration = ref(60);
const scheduleNotes = ref('');
const scheduling = ref(false);

async function bookAppointment() {
  if (!scheduleDate.value) {
    $q.notify({ type: 'warning', message: 'Please select a date and time' });
    return;
  }
  scheduling.value = true;
  try {
    await api.post(`/leads/${props.leadId}/appointments`, {
      type: scheduleType.value,
      scheduledAt: new Date(scheduleDate.value).toISOString(),
      duration: scheduleDuration.value,
      notes: scheduleNotes.value || undefined,
    });
    showSchedule.value = false;
    scheduleDate.value = '';
    scheduleNotes.value = '';
    $q.notify({ type: 'positive', message: 'Appointment booked (synced with Jobber)' });
    emit('refresh');
  } catch (err: unknown) {
    const message = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Failed to book appointment';
    $q.notify({ type: 'negative', message });
  } finally {
    scheduling.value = false;
  }
}
</script>
