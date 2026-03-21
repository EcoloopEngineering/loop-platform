<template>
  <q-page class="q-pa-md">
    <h5 class="q-my-none text-weight-bold q-mb-md">Scoreboard</h5>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <template v-else>
      <!-- Bar chart visualization -->
      <q-card flat bordered class="rounded-card q-mb-lg">
        <q-card-section>
          <div class="text-subtitle2 text-weight-bold q-mb-md">Won Deals</div>
          <div
            v-for="(user, idx) in rankings"
            :key="user.id"
            class="row items-center q-mb-sm"
          >
            <span class="text-caption text-weight-bold q-mr-sm" style="min-width: 24px">
              {{ idx + 1 }}
            </span>
            <span class="text-body2 col-3 ellipsis">{{ user.name }}</span>
            <div class="col">
              <q-linear-progress
                :value="maxWon ? user.wonDeals / maxWon : 0"
                color="primary"
                rounded
                size="20px"
                class="bar-progress"
              >
                <div class="absolute-full flex flex-center">
                  <span class="text-caption text-white text-weight-bold">
                    {{ user.wonDeals }}
                  </span>
                </div>
              </q-linear-progress>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Ranking table -->
      <q-table
        :rows="rankings"
        :columns="columns"
        row-key="id"
        flat
        bordered
        class="rounded-borders"
        :pagination="{ rowsPerPage: 20 }"
      >
        <template #body-cell-rank="props">
          <q-td :props="props">
            <q-badge
              v-if="props.rowIndex < 3"
              :color="['amber', 'grey-5', 'brown-4'][props.rowIndex]"
              text-color="white"
            >
              {{ props.rowIndex + 1 }}
            </q-badge>
            <span v-else>{{ props.rowIndex + 1 }}</span>
          </q-td>
        </template>

        <template #body-cell-conversionRate="props">
          <q-td :props="props">
            {{ props.row.conversionRate }}%
          </q-td>
        </template>

        <template #body-cell-totalCommission="props">
          <q-td :props="props">
            ${{ props.row.totalCommission.toLocaleString() }}
          </q-td>
        </template>
      </q-table>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/boot/axios';

interface Ranking {
  id: string;
  name: string;
  wonDeals: number;
  totalCommission: number;
  conversionRate: number;
}

const rankings = ref<Ranking[]>([]);
const loading = ref(false);

const maxWon = computed(() => Math.max(...rankings.value.map((r) => r.wonDeals), 1));

const columns = [
  { name: 'rank', label: '#', field: 'id', align: 'center' as const, style: 'width: 50px' },
  { name: 'name', label: 'Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'wonDeals', label: 'Won Deals', field: 'wonDeals', align: 'center' as const, sortable: true },
  { name: 'totalCommission', label: 'Commission', field: 'totalCommission', align: 'right' as const, sortable: true },
  { name: 'conversionRate', label: 'Conversion', field: 'conversionRate', align: 'center' as const, sortable: true },
];

onMounted(async () => {
  loading.value = true;
  try {
    const { data } = await api.get<Ranking[]>('/admin/scoreboard');
    rankings.value = data;
  } catch {
    // Empty
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.rounded-card {
  border-radius: 12px;
}
.bar-progress {
  border-radius: 6px;
}
</style>
