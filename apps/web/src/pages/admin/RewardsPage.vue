<template>
  <q-page class="q-pa-md page-bg">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold">Rewards Store</h5>
      <q-space />
      <q-btn
        v-if="isAdmin"
        label="Add Product"
        icon="add"
        color="primary"
        unelevated
        no-caps
        class="rounded-btn"
        aria-label="Add a new reward product"
        @click="showAddDialog = true"
      />
    </div>

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

    <!-- Error -->
    <q-banner v-else-if="pageError" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ pageError }}
      <template #action>
        <q-btn flat label="Retry" @click="loadData" />
      </template>
    </q-banner>

    <!-- Rewards grid -->
    <template v-else>
      <div v-if="products.length === 0" class="text-grey-5 text-center q-pa-xl">
        No rewards available yet.
      </div>
      <div class="row q-col-gutter-md q-mb-xl">
        <div v-for="p in products" :key="p.id" class="col-12 col-sm-6 col-md-4 col-lg-3">
          <q-card flat bordered class="rounded-card full-height column">
            <q-img
              v-if="p.imageUrl"
              :src="p.imageUrl"
              :ratio="16 / 9"
              class="rounded-card-top"
              fit="cover"
            />
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
                  unelevated
                  no-caps
                  size="sm"
                  class="rounded-btn"
                  :disable="(balance.coins ?? 0) < p.price"
                  :aria-label="`Redeem ${p.name} for ${p.price} coins`"
                  @click="confirmRedeem(p)"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- My Orders section -->
      <div class="text-subtitle1 text-weight-bold q-mb-sm">My Orders</div>
      <q-table
        :rows="orders"
        :columns="orderColumns"
        row-key="id"
        flat
        bordered
        class="rounded-card"
        :loading="loadingOrders"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="statusColor(props.row.status)"
              :label="props.row.status"
            />
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

      <!-- Admin: All Orders Management -->
      <template v-if="isAdmin">
        <q-separator class="q-my-lg" />
        <div class="text-subtitle1 text-weight-bold q-mb-sm">All Orders (Admin)</div>
        <q-table
          :rows="allOrders"
          :columns="adminOrderColumns"
          row-key="id"
          flat
          bordered
          class="rounded-card"
          :loading="loadingAllOrders"
          :pagination="{ rowsPerPage: 10 }"
        >
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="statusColor(props.row.status)"
                :label="props.row.status"
              />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                v-if="props.row.status === 'PENDING'"
                flat
                dense
                color="positive"
                icon="check_circle"
                label="Fulfill"
                size="sm"
                aria-label="Fulfill this order"
                @click="handleFulfillOrder(props.row.id)"
              />
              <q-btn
                v-if="props.row.status === 'PENDING'"
                flat
                dense
                color="negative"
                icon="cancel"
                label="Cancel"
                size="sm"
                class="q-ml-xs"
                aria-label="Cancel this order"
                @click="handleCancelOrder(props.row.id)"
              />
              <span v-if="props.row.status !== 'PENDING'" class="text-grey-5">--</span>
            </q-td>
          </template>
          <template #no-data>
            <div class="text-grey-5 q-pa-md text-center full-width">No orders.</div>
          </template>
        </q-table>
      </template>
    </template>

    <!-- Add Product Dialog (Admin only) -->
    <q-dialog v-model="showAddDialog" persistent @keyup.esc="showAddDialog = false" aria-label="Add reward product dialog">
      <q-card class="dialog-card-lg">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Add Reward Product</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="newProduct.name" label="Name" outlined dense class="q-mb-sm" />
          <q-input v-model="newProduct.description" label="Description" outlined dense type="textarea" autogrow class="q-mb-sm" />
          <q-input v-model.number="newProduct.price" label="Price (coins)" outlined dense type="number" class="q-mb-sm" />
          <q-input v-model="newProduct.imageUrl" label="Image URL" outlined dense class="q-mb-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-7" no-caps v-close-popup aria-label="Cancel adding product" />
          <q-btn
            label="Create"
            color="primary"
            unelevated
            no-caps
            :disable="!newProduct.name || !newProduct.price"
            :loading="savingProduct"
            aria-label="Confirm create reward product"
            @click="handleCreateProduct"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRewardsApi } from '@/composables/useRewardsApi';
import { useUserStore } from '@/stores/user.store';
import type { RewardProduct, RewardOrder, RewardBalance } from '@/types/api';

const $q = useQuasar();
const rewardsApi = useRewardsApi();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.role === 'ADMIN');

const balance = ref<RewardBalance>({ coins: 0 });
const pageError = ref<string | null>(null);
const products = ref<RewardProduct[]>([]);
const orders = ref<RewardOrder[]>([]);
const allOrders = ref<RewardOrder[]>([]);
const loadingOrders = ref(false);
const loadingAllOrders = ref(false);

// Add product dialog
const showAddDialog = ref(false);
const savingProduct = ref(false);
const newProduct = ref({ name: '', description: '', price: 0, imageUrl: '' });

const orderColumns = [
  { name: 'productName', label: 'Product', field: 'productName', align: 'left' as const },
  { name: 'price', label: 'Price', field: 'price', align: 'center' as const },
  { name: 'status', label: 'Status', field: 'status', align: 'center' as const },
  {
    name: 'createdAt',
    label: 'Date',
    field: 'createdAt',
    align: 'left' as const,
    format: (val: string) => val ? new Date(val).toLocaleDateString() : '',
  },
];

function statusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: 'orange',
    PROCESSING: 'blue',
    COMPLETED: 'green',
    CANCELLED: 'grey',
  };
  return map[status] ?? 'grey';
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

async function handleCreateProduct() {
  savingProduct.value = true;
  const ok = await rewardsApi.createProduct({
    name: newProduct.value.name,
    description: newProduct.value.description || undefined,
    price: newProduct.value.price,
    imageUrl: newProduct.value.imageUrl || undefined,
  });
  if (ok) {
    $q.notify({ type: 'positive', message: 'Product created!' });
    showAddDialog.value = false;
    newProduct.value = { name: '', description: '', price: 0, imageUrl: '' };
    products.value = await rewardsApi.fetchProducts();
  } else {
    $q.notify({ type: 'negative', message: rewardsApi.error.value ?? 'Failed to create product' });
  }
  savingProduct.value = false;
}

const adminOrderColumns = [
  { name: 'user', label: 'User', field: (row: RewardOrder) => row.userName ?? '--', align: 'left' as const },
  { name: 'productName', label: 'Product', field: 'productName', align: 'left' as const },
  { name: 'coinsSpent', label: 'Coins', field: 'coinsSpent', align: 'center' as const },
  { name: 'status', label: 'Status', field: 'status', align: 'center' as const },
  { name: 'createdAt', label: 'Date', field: 'createdAt', align: 'left' as const, format: (val: string) => val ? new Date(val).toLocaleDateString() : '' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' as const },
];

async function handleFulfillOrder(orderId: string) {
  const ok = await rewardsApi.fulfillOrder(orderId);
  if (ok) {
    $q.notify({ type: 'positive', message: 'Order fulfilled!' });
    allOrders.value = await rewardsApi.fetchAllOrders();
  } else {
    $q.notify({ type: 'negative', message: rewardsApi.error.value ?? 'Failed' });
  }
}

async function handleCancelOrder(orderId: string) {
  const ok = await rewardsApi.cancelOrder(orderId);
  if (ok) {
    $q.notify({ type: 'positive', message: 'Order cancelled. Coins refunded.' });
    [allOrders.value, balance.value] = await Promise.all([
      rewardsApi.fetchAllOrders(),
      rewardsApi.fetchBalance(),
    ]);
  } else {
    $q.notify({ type: 'negative', message: rewardsApi.error.value ?? 'Failed' });
  }
}

async function loadData() {
  pageError.value = null;
  try {
    loadingOrders.value = true;
    loadingAllOrders.value = true;

    const [bal, prods, ords, adminOrds] = await Promise.all([
      rewardsApi.fetchBalance(),
      rewardsApi.fetchProducts(),
      rewardsApi.fetchOrders(),
      isAdmin.value ? rewardsApi.fetchAllOrders() : Promise.resolve([]),
    ]);

    balance.value = bal;
    products.value = prods;
    orders.value = ords;
    allOrders.value = adminOrds;
  } catch {
    pageError.value = 'Failed to load rewards data. Please try again.';
  } finally {
    loadingOrders.value = false;
    loadingAllOrders.value = false;
  }
}

onMounted(() => { loadData(); });
</script>

<style lang="scss" scoped>
.rounded-card {
  border-radius: 12px;
  border-color: #E5E7EB;
}
.rounded-card-top {
  border-radius: 12px 12px 0 0;
}
.rounded-btn {
  border-radius: 8px;
}
.product-placeholder {
  height: 120px;
  background: #F3F4F6;
}
.product-description {
  flex: 1;
}
</style>
