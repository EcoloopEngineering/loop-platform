<template>
  <q-page class="q-pa-md">
    <div v-if="leadStore.loading && !lead" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <template v-else-if="lead">
      <!-- Stage selector -->
      <div class="row items-center q-mb-md q-gutter-x-sm">
        <q-select
          v-model="currentStage"
          :options="stageOptions"
          emit-value
          map-options
          dense
          outlined
          class="stage-select"
          @update:model-value="onStageChange"
        />
        <q-space />
        <div class="text-caption text-grey-6">
          Created {{ formatDate(lead.createdAt) }}
        </div>
      </div>

      <!-- Tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        align="left"
        active-color="primary"
        indicator-color="primary"
        class="q-mb-md"
        no-caps
      >
        <q-tab name="about" label="About" />
        <q-tab name="project" label="Project" />
        <q-tab name="files" label="Files" />
        <q-tab name="commission" label="Commission" />
        <q-tab name="timeline" label="Timeline" />
      </q-tabs>

      <q-tab-panels v-model="activeTab" animated>
        <!-- About Tab -->
        <q-tab-panel name="about" class="q-px-none">
          <q-card flat bordered class="rounded-card q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 text-weight-bold q-mb-sm">Customer</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey-6">Name</div>
                  <div>{{ lead.firstName }} {{ lead.lastName }}</div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey-6">Email</div>
                  <div>{{ lead.email || '--' }}</div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey-6">Phone</div>
                  <div>{{ lead.phone || '--' }}</div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey-6">Source</div>
                  <div>{{ lead.source || '--' }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card v-if="lead.notes" flat bordered class="rounded-card">
            <q-card-section>
              <div class="text-subtitle2 text-weight-bold q-mb-xs">Notes</div>
              <div class="text-body2 text-grey-8">{{ lead.notes }}</div>
            </q-card-section>
          </q-card>
        </q-tab-panel>

        <!-- Project Tab -->
        <q-tab-panel name="project" class="q-px-none">
          <q-card flat bordered class="rounded-card">
            <q-card-section>
              <div class="text-subtitle2 text-weight-bold q-mb-sm">Design Status</div>
              <div class="text-body2 text-grey-6 q-mb-md">
                {{ projectData.designStatus || 'No design submitted yet.' }}
              </div>

              <div class="text-subtitle2 text-weight-bold q-mb-xs">Aurora Link</div>
              <div v-if="projectData.auroraLink">
                <a
                  :href="projectData.auroraLink"
                  target="_blank"
                  class="text-primary"
                >
                  Open in Aurora
                </a>
              </div>
              <div v-else class="text-grey-6 text-body2">No Aurora project linked.</div>
            </q-card-section>
          </q-card>
        </q-tab-panel>

        <!-- Files Tab -->
        <q-tab-panel name="files" class="q-px-none">
          <div class="row items-center q-mb-md">
            <span class="text-subtitle2 text-weight-bold col">Documents</span>
            <q-btn
              color="primary"
              unelevated
              no-caps
              size="sm"
              icon="upload_file"
              label="Upload"
              class="rounded-btn"
              @click="uploadFile"
            />
          </div>

          <q-list v-if="files.length" separator bordered class="rounded-borders">
            <q-item v-for="file in files" :key="file.id">
              <q-item-section avatar>
                <q-icon name="insert_drive_file" color="grey-6" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ file.name }}</q-item-label>
                <q-item-label caption>{{ formatDate(file.uploadedAt) }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat dense round icon="download" @click="downloadFile(file)" />
              </q-item-section>
            </q-item>
          </q-list>

          <div v-else class="text-grey-6 text-center q-pa-lg">
            No documents uploaded yet.
          </div>
        </q-tab-panel>

        <!-- Commission Tab -->
        <q-tab-panel name="commission" class="q-px-none">
          <q-card flat bordered class="rounded-card">
            <q-card-section>
              <div class="text-subtitle2 text-weight-bold q-mb-md">Commission Breakdown</div>

              <q-list dense separator>
                <q-item v-for="line in commissionLines" :key="line.label">
                  <q-item-section>
                    <q-item-label>{{ line.label }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-item-label class="text-weight-bold">{{ line.value }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <q-separator class="q-my-sm" />

              <div class="row items-center">
                <span class="col text-subtitle2 text-weight-bold">Total</span>
                <span class="text-h6 text-weight-bold text-primary">
                  {{ commissionTotal }}
                </span>
              </div>
            </q-card-section>
          </q-card>
        </q-tab-panel>

        <!-- Timeline Tab -->
        <q-tab-panel name="timeline" class="q-px-none">
          <LeadTimeline :activities="activities" />
        </q-tab-panel>
      </q-tab-panels>
    </template>

    <div v-else class="text-grey-6 text-center q-pa-xl">
      Lead not found.
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLeadStore } from '@/stores/lead.store';
import { api } from '@/boot/axios';
import LeadTimeline from '@/components/lead/LeadTimeline.vue';

const props = defineProps<{ id: string }>();
const leadStore = useLeadStore();

const lead = computed(() => leadStore.currentLead);
const activeTab = ref('about');
const currentStage = ref('');

const stageOptions = [
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Proposal', value: 'proposal' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
];

interface FileItem {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userName?: string;
}

const projectData = ref({ designStatus: '', auroraLink: '' });
const files = ref<FileItem[]>([]);
const activities = ref<Activity[]>([]);
const commissionLines = ref<{ label: string; value: string }[]>([]);
const commissionTotal = ref('$0');

onMounted(async () => {
  await leadStore.fetchLead(props.id);
  if (lead.value) {
    currentStage.value = lead.value.stage;
  }
  loadExtras();
});

async function loadExtras() {
  try {
    const [projRes, filesRes, actRes, commRes] = await Promise.all([
      api.get(`/leads/${props.id}/project`).catch(() => ({ data: {} })),
      api.get<FileItem[]>(`/leads/${props.id}/files`).catch(() => ({ data: [] })),
      api.get<Activity[]>(`/leads/${props.id}/activities`).catch(() => ({ data: [] })),
      api.get(`/leads/${props.id}/commission`).catch(() => ({ data: { lines: [], total: '$0' } })),
    ]);
    projectData.value = projRes.data;
    files.value = filesRes.data;
    activities.value = actRes.data;
    commissionLines.value = commRes.data.lines ?? [];
    commissionTotal.value = commRes.data.total ?? '$0';
  } catch {
    // Non-critical data
  }
}

async function onStageChange(newStage: string) {
  await leadStore.changeStage(props.id, newStage);
}

function uploadFile() {
  // Trigger file input - placeholder for upload logic
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx,.jpg,.png';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post<FileItem>(`/leads/${props.id}/files`, form);
      files.value.unshift(data);
    } catch {
      // Handle error
    }
  };
  input.click();
}

function downloadFile(file: FileItem) {
  window.open(file.url, '_blank');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
</script>

<style lang="scss" scoped>
.rounded-card {
  border-radius: 12px;
}
.rounded-btn {
  border-radius: 10px;
}
.stage-select {
  min-width: 160px;
  :deep(.q-field__control) {
    border-radius: 10px;
  }
}
</style>
