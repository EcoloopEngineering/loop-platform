<template>
  <q-page>
    <div class="q-pa-md">
      <q-input
        v-model="search"
        dense
        outlined
        placeholder="Search leads..."
        class="q-mb-sm filter-input"
        @update:model-value="debouncedSearch"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
        <template v-if="search" #append>
          <q-icon name="close" class="cursor-pointer" @click="search = ''; loadLeads()" />
        </template>
      </q-input>
    </div>

    <q-tabs
      v-model="activeTab"
      dense
      align="justify"
      active-color="primary"
      indicator-color="primary"
      class="q-px-md"
    >
      <q-tab name="all" label="All" />
      <q-tab name="open" label="Open" />
      <q-tab name="won" label="Won" />
      <q-tab name="lost" label="Lost" />
    </q-tabs>

    <q-separator />

    <q-pull-to-refresh @refresh="onRefresh">
      <div class="q-pa-md">
        <div v-if="leadStore.loading && !leads.length" class="row justify-center q-pa-xl">
          <q-spinner-dots color="primary" size="40px" />
        </div>

        <template v-else-if="leads.length">
          <LeadCard v-for="lead in leads" :key="lead.id" :lead="lead" />
        </template>

        <div v-else class="text-grey-6 text-center q-pa-xl">
          No leads found.
        </div>
      </div>
    </q-pull-to-refresh>
  </q-page>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useLeadStore } from '@/stores/lead.store';
import LeadCard from '@/components/lead/LeadCard.vue';

const leadStore = useLeadStore();
const search = ref('');
const activeTab = ref('all');
const leads = ref(leadStore.leads);

const STAGE_MAP: Record<string, string | undefined> = {
  all: undefined,
  open: 'new,contacted,qualified,proposal',
  won: 'won',
  lost: 'lost',
};

onMounted(() => loadLeads());

watch(activeTab, () => loadLeads());

async function loadLeads() {
  await leadStore.fetchLeads({
    stage: STAGE_MAP[activeTab.value],
  });
  leads.value = leadStore.leads;
}

let searchTimeout: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadLeads(), 300);
}

async function onRefresh(done: () => void) {
  await loadLeads();
  done();
}
</script>

<style lang="scss" scoped>
.filter-input {
  :deep(.q-field__control) {
    border-radius: 10px;
  }
}
</style>
