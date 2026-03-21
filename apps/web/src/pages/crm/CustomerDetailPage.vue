<template>
  <q-page class="q-pa-md">
    <div v-if="customerStore.loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <template v-else-if="customer">
      <div class="row items-center q-mb-md">
        <q-btn flat round dense icon="arrow_back" @click="$router.push('/crm/customers')" class="q-mr-sm" />
        <h5 class="q-my-none text-weight-bold col">{{ customer.name }}</h5>
      </div>

      <!-- Contact Info Card -->
      <q-card flat bordered class="rounded-card q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 text-weight-bold q-mb-sm">Contact Information</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-4">
              <div class="text-caption text-grey-6">Email</div>
              <div>{{ customer.email }}</div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="text-caption text-grey-6">Phone</div>
              <div>{{ customer.phone || '--' }}</div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="text-caption text-grey-6">Customer since</div>
              <div>{{ formatDate(customer.createdAt) }}</div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Properties -->
      <q-card flat bordered class="rounded-card q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 text-weight-bold q-mb-sm">
            Properties ({{ customer.properties.length }})
          </div>
          <q-list v-if="customer.properties.length" separator dense>
            <q-item v-for="prop in customer.properties" :key="prop.id">
              <q-item-section>
                <q-item-label>{{ prop.address }}</q-item-label>
                <q-item-label caption>{{ prop.city }}, {{ prop.state }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else class="text-grey-6 text-caption">No properties registered.</div>
        </q-card-section>
      </q-card>

      <!-- Leads -->
      <q-card flat bordered class="rounded-card q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 text-weight-bold q-mb-sm">
            Leads ({{ customer.leads.length }})
          </div>
          <q-list v-if="customer.leads.length" separator dense>
            <q-item
              v-for="lead in customer.leads"
              :key="lead.id"
              clickable
              v-ripple
              @click="$router.push(`/crm/leads/${lead.id}`)"
            >
              <q-item-section>
                <q-item-label class="row items-center q-gutter-x-sm">
                  <q-badge :color="stageColor(lead.stage)" :label="lead.stage" />
                  <span class="text-caption text-grey-6">{{ lead.source }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge
                  :color="lead.score >= 70 ? 'positive' : lead.score >= 40 ? 'warning' : 'grey-6'"
                  text-color="white"
                >
                  {{ lead.score }}%
                </q-badge>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else class="text-grey-6 text-caption">No leads.</div>
        </q-card-section>
      </q-card>

      <!-- Activity Timeline -->
      <q-card flat bordered class="rounded-card">
        <q-card-section>
          <div class="text-subtitle2 text-weight-bold q-mb-sm">Activity</div>
          <LeadTimeline :activities="customer.activities" />
        </q-card-section>
      </q-card>
    </template>

    <div v-else class="text-grey-6 text-center q-pa-xl">
      Customer not found.
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCustomerStore } from '@/stores/customer.store';
import LeadTimeline from '@/components/lead/LeadTimeline.vue';

const props = defineProps<{ id: string }>();
const customerStore = useCustomerStore();
const customer = computed(() => customerStore.currentCustomer);

const STAGE_COLORS: Record<string, string> = {
  new: 'blue',
  contacted: 'orange',
  qualified: 'purple',
  proposal: 'cyan',
  won: 'positive',
  lost: 'negative',
};

function stageColor(stage: string) {
  return STAGE_COLORS[stage] ?? 'grey-6';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

onMounted(() => {
  customerStore.fetchCustomer(props.id);
});
</script>

<style lang="scss" scoped>
.rounded-card {
  border-radius: 12px;
}
</style>
