<template>
  <q-page class="q-pa-md page-bg">
    <h5 class="q-my-none text-weight-bold q-mb-md">Rewards Store</h5>

    <!-- Balance banner -->
    <q-card flat bordered class="rounded-card q-mb-lg">
      <q-card-section class="text-center q-py-lg">
        <q-icon name="monetization_on" color="amber-8" size="48px" />
        <div class="text-h4 text-weight-bold q-mt-sm">{{ balance.coins ?? 0 }}</div>
        <div class="text-body2 text-grey-6">Available Coins</div>
      </q-card-section>
    </q-card>

    <div v-if="rewardsApi.loading.value" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <q-banner v-else-if="pageError" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ pageError }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

    <template v-else>
      <div v-if="products.length === 0" class="text-grey-5 text-center q-pa-xl">
        No rewards available yet.
      </div>
      <div class="row q-col-gutter-md q-mb-xl">
        <div v-for="p in products" :key="p.id" class="col-12 col-sm-6 col-md-4 col-lg-3">
          <q-card flat bordered class="rounded-card full-height column">
            <q-img v-if="p.imageUrl" :src="p.imageUrl" :ratio="16 / 9" class="rounded-card-top" fit="cover" />
            <div v-else class="row justify-center items-center product-placeholder">
              <q-icon name="card_giftcard" size="48px" color="grey-4" />
            </div>
            <q-card-section class="col column">
              <div class="text-subtitle2 text-weight-bold">{{ p.name }}</div>
              <div v-if="p.description" class="text-caption text-grey-6 q-mt-xs product-description">{{ p.description }}</div>
              <div class="row items-center q-mt-sm">
                <q-icon name="monetization_on" color="amber-8" size="18px" class="q-mr-xs" />
                <span class="text-weight-bold text-body1">{{ p.price }}</span>
                <q-space />
                <q-btn
                  label="Redeem"
                  color="primary"
                  unelevated no-caps size="sm"
                  class="rounded-btn"
                  :disable="(balance.coins ?? 0) < p.price"
                  @click="confirmRedeem(p)"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- My Orders -->
      <div class="text-subtitle1 text-weight-bold q-mb-sm">My Orders</div>
      <q-table
        :rows="orders"
        :columns="orderColumns"
        row-key="id"
        flat bordered
        class="rounded-card"
        :loading="loadingOrders"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="props.row.status" />
          </q-td>
        </template>
        <template #body-cell-price="props">
          <q-td :props="props">
            <q-icon name="monetization_on" color="amber-8" size="14px" class="q-mr-xs" />
            {{ props.row.price }}
          </q-td>
        </template>
        <template #no-data>
          <div class="text-grey-5 q-pa-md text-center full-width">No orders yet.</div>
        </template>
      </q-table>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRewardsApi } from '@/composables/useRewardsApi';
import type { RewardProduct, RewardOrder, RewardBalance } from '@/types/api';

const $q = useQuasar();
const rewardsApi = useRewardsApi();

const balance = ref<RewardBalance>({ coins: 0 });
const pageError = ref<string | null>(null);
const products = ref<RewardProduct[]>([]);
const orders = ref<RewardOrder[]>([]);
const loadingOrders = ref(false);

const orderColumns = [
  { name: 'productName', label: 'Product', field: 'productName', align: 'left' as const },
  { name: 'price', label: 'Price', field: 'price', align: 'center' as const },
  { name: 'status', label: 'Status', field: 'status', align: 'center' as const },
  { name: 'createdAt', label: 'Date', field: 'createdAt', align: 'left' as const, format: (val: string) => val ? new Date(val).toLocaleDateString() : '' },
];

function statusColor(status: string) {
  return { PENDING: 'orange', PROCESSING: 'blue', COMPLETED: 'green', FULFILLED: 'green', CANCELLED: 'grey' }[status] ?? 'grey';
}

function confirmRedeem(product: RewardProduct) {
  $q.dialog({
    title: 'Confirm Redemption',
    message: `Redeem "${product.name}" for ${product.price} coins?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const ok = await rewardsApi.createOrder(product.id);
    if (ok) {
      $q.notify({ type: 'positive', message: 'Order placed successfully!' });
      balance.value = await rewardsApi.fetchBalance();
      orders.value = await rewardsApi.fetchOrders();
    } else {
      $q.notify({ type: 'negative', message: rewardsApi.error.value ?? 'Failed to place order' });
    }
  });
}

async function loadData() {
  pageError.value = null;
  try {
    loadingOrders.value = true;
    const [bal, prods, ords] = await Promise.all([
      rewardsApi.fetchBalance(),
      rewardsApi.fetchProducts(),
      rewardsApi.fetchOrders(),
    ]);
    balance.value = bal;
    products.value = prods;
    orders.value = ords;
  } catch {
    pageError.value = 'Failed to load rewards data. Please try again.';
  } finally {
    loadingOrders.value = false;
  }
}

onMounted(() => { loadData(); });
</script>

<style lang="scss" scoped>
.rounded-card { border-radius: 12px; border-color: #E5E7EB; }
.rounded-card-top { border-radius: 12px 12px 0 0; }
.rounded-btn { border-radius: 8px; }
.product-placeholder { height: 120px; background: #F3F4F6; }
.product-description { flex: 1; }
</style>
