<template>
  <q-page class="portal-project q-pa-md">
    <h5 class="page-title q-mb-md">My Project</h5>

    <!-- Stage Progress -->
    <q-card flat class="q-mb-lg">
      <q-card-section>
        <div class="text-weight-bold q-mb-md" style="font-size: 15px">Project Stages</div>
        <q-stepper v-model="activeStageIdx" vertical flat color="primary" done-color="positive" animated>
          <q-step
            v-for="(stage, idx) in visibleStages"
            :key="stage.key"
            :name="idx"
            :title="stage.name"
            :caption="stage.description"
            :icon="idx < activeStageIdx ? 'check_circle' : stage.icon"
            :done="idx < activeStageIdx"
            :active-color="idx === activeStageIdx ? 'primary' : undefined"
          />
        </q-stepper>
      </q-card-section>
    </q-card>

    <!-- Project Details -->
    <q-card flat class="q-mb-lg">
      <q-card-section>
        <div class="text-weight-bold q-mb-md" style="font-size: 15px">Project Details</div>
        <q-list separator>
          <q-item v-for="detail in projectDetails" :key="detail.label">
            <q-item-section>
              <q-item-label caption>{{ detail.label }}</q-item-label>
              <q-item-label>{{ detail.value }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Documents -->
    <q-card flat class="q-mb-lg">
      <q-card-section>
        <div class="text-weight-bold q-mb-md" style="font-size: 15px">Documents</div>
        <div v-if="documents.length === 0" class="text-center q-pa-md">
          <q-icon name="folder_open" size="40px" color="grey-4" />
          <div class="text-grey-5 q-mt-sm">No documents yet</div>
        </div>
        <q-list v-else separator>
          <q-item v-for="doc in documents" :key="doc.id" clickable>
            <q-item-section avatar>
              <q-icon :name="docIcon(doc.type)" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ doc.name }}</q-item-label>
              <q-item-label caption>{{ doc.date }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="download" color="grey-6" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const currentStage = ref('NEW_LEAD');
const activeStageIdx = computed(() => {
  const idx = visibleStages.value.findIndex(s => s.key === currentStage.value);
  return idx >= 0 ? idx : 0;
});

const visibleStages = ref([
  { key: 'NEW_LEAD', name: 'Project Created', description: 'Your solar project has been initiated', icon: 'add_circle' },
  { key: 'DESIGN_IN_PROGRESS', name: 'Design Phase', description: 'Solar panel layout being designed', icon: 'design_services' },
  { key: 'DESIGN_READY', name: 'Design Complete', description: 'Your custom design is ready for review', icon: 'check_circle' },
  { key: 'WON', name: 'Contract Signed', description: 'Agreement finalized', icon: 'handshake' },
  { key: 'ENGINEERING', name: 'Engineering', description: 'Technical plans being prepared', icon: 'engineering' },
  { key: 'PERMIT_AND_ICE', name: 'Permitting', description: 'Permits being processed with local authorities', icon: 'gavel' },
  { key: 'INSTALL_READY', name: 'Installation Scheduled', description: 'Your installation date is set', icon: 'event' },
  { key: 'INSTALL', name: 'Installing', description: 'Solar panels being installed at your property', icon: 'construction' },
  { key: 'CUSTOMER_SUCCESS', name: 'Complete!', description: 'Your solar system is live and generating energy', icon: 'solar_power' },
]);

const projectDetails = ref([
  { label: 'System Size', value: '--' },
  { label: 'Estimated Production', value: '--' },
  { label: 'Address', value: '--' },
  { label: 'Sales Representative', value: '--' },
  { label: 'Project Manager', value: '--' },
]);

const documents = ref<any[]>([]);

function docIcon(type: string) {
  if (type === 'pdf') return 'picture_as_pdf';
  if (type === 'image') return 'image';
  return 'description';
}
</script>

<style lang="scss" scoped>
.portal-project {
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
</style>
