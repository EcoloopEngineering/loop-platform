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

    <div v-if="loadingProducts" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

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
            <div v-else class="row justify-center items-center" style="height: 120px; background: #F3F4F6">
              <q-icon name="card_giftcard" size="48px" color="grey-4" />
            </div>
            <q-card-section class="col column">
              <div class="text-subtitle2 text-weight-bold">{{ p.name }}</div>
              <div v-if="p.description" class="text-caption text-grey-6 q-mt-xs" style="flex: 1">{{ p.description }}</div>
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
                @click="fulfillOrder(props.row.id)"
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
                @click="cancelOrder(props.row.id)"
              />
              <span v-if="props.row.status !== 'PENDING'" class="text-grey-5">—</span>
            </q-td>
          </template>
          <template #no-data>
            <div class="text-grey-5 q-pa-md text-center full-width">No orders.</div>
          </template>
        </q-table>
      </template>
    </template>

    <!-- Add Product Dialog (Admin only) -->
    <q-dialog v-model="showAddDialog" persistent>
      <q-card style="min-width: 400px; border-radius: 12px">
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
          <q-btn flat label="Cancel" color="grey-7" no-caps v-close-popup />
          <q-btn
            label="Create"
            color="primary"
            unelevated
            no-caps
            :disable="!newProduct.name || !newProduct.price"
            :loading="savingProduct"
            @click="createProduct"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import { useUserStore } from '@/stores/user.store';

interface Balance {
  coins: number;
  balance?: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

interface Order {
  id: string;
  productName: string;
  price: number;
  status: string;
  createdAt: string;
}

const $q = useQuasar();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.role === 'ADMIN');

const balance = ref<Balance>({ coins: 0 });
const products = ref<Product[]>([]);
const orders = ref<Order[]>([]);
const allOrders = ref<any[]>([]);
const loadingProducts = ref(false);
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

async function fetchBalance() {
  try {
    const { data } = await api.get<any>('/gamification/balance');
    balance.value = { coins: data.balance ?? data.coins ?? 0 };
  } catch {
    // endpoint may not exist yet
  }
}

async function fetchProducts() {
  loadingProducts.value = true;
  try {
    const { data } = await api.get<Product[]>('/rewards');
    products.value = Array.isArray(data) ? data : (data as any).data ?? [];
  } catch {
    products.value = [];
  } finally {
    loadingProducts.value = false;
  }
}

async function fetchOrders() {
  loadingOrders.value = true;
  try {
    const { data } = await api.get<any[]>('/rewards/orders');
    const raw = Array.isArray(data) ? data : (data as any).data ?? [];
    orders.value = raw.map((o: any) => ({
      ...o,
      productName: o.product?.name ?? o.productName ?? '--',
      price: o.coinsSpent ?? o.product?.price ?? o.price ?? 0,
    }));
  } catch {
    orders.value = [];
  } finally {
    loadingOrders.value = false;
  }
}

function confirmRedeem(product: Product) {
  $q.dialog({
    title: 'Confirm Redemption',
    message: `Redeem "${product.name}" for ${product.price} coins?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.post('/rewards/order', { productId: product.id });
      $q.notify({ type: 'positive', message: 'Order placed successfully!' });
      await Promise.all([fetchBalance(), fetchOrders()]);
    } catch (err: any) {
      $q.notify({
        type: 'negative',
        message: err?.response?.data?.message ?? 'Failed to place order',
      });
    }
  });
}

async function createProduct() {
  savingProduct.value = true;
  try {
    await api.post('/rewards', {
      name: newProduct.value.name,
      description: newProduct.value.description || undefined,
      price: newProduct.value.price,
      imageUrl: newProduct.value.imageUrl || undefined,
    });
    $q.notify({ type: 'positive', message: 'Product created!' });
    showAddDialog.value = false;
    newProduct.value = { name: '', description: '', price: 0, imageUrl: '' };
    await fetchProducts();
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message ?? 'Failed to create product',
    });
  } finally {
    savingProduct.value = false;
  }
}

const adminOrderColumns = [
  { name: 'user', label: 'User', field: (row: any) => row.userName ?? '--', align: 'left' as const },
  { name: 'productName', label: 'Product', field: 'productName', align: 'left' as const },
  { name: 'coinsSpent', label: 'Coins', field: 'coinsSpent', align: 'center' as const },
  { name: 'status', label: 'Status', field: 'status', align: 'center' as const },
  { name: 'createdAt', label: 'Date', field: 'createdAt', align: 'left' as const, format: (val: string) => val ? new Date(val).toLocaleDateString() : '' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' as const },
];

async function fetchAllOrders() {
  if (!isAdmin.value) return;
  loadingAllOrders.value = true;
  try {
    // Use the same endpoint but we need all orders — for now query all users' orders
    const { data } = await api.get<any[]>('/rewards/orders/all');
    const raw = Array.isArray(data) ? data : (data as any).data ?? [];
    allOrders.value = raw.map((o: any) => ({
      ...o,
      productName: o.product?.name ?? '--',
      userName: o.user ? `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim() : '--',
    }));
  } catch {
    allOrders.value = [];
  } finally {
    loadingAllOrders.value = false;
  }
}

async function fulfillOrder(orderId: string) {
  try {
    await api.patch(`/rewards/orders/${orderId}/fulfill`);
    $q.notify({ type: 'positive', message: 'Order fulfilled!' });
    await fetchAllOrders();
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err?.response?.data?.message ?? 'Failed' });
  }
}

async function cancelOrder(orderId: string) {
  try {
    await api.patch(`/rewards/orders/${orderId}/cancel`);
    $q.notify({ type: 'positive', message: 'Order cancelled. Coins refunded.' });
    await Promise.all([fetchAllOrders(), fetchBalance()]);
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err?.response?.data?.message ?? 'Failed' });
  }
}

onMounted(() => {
  Promise.all([fetchBalance(), fetchProducts(), fetchOrders(), fetchAllOrders()]);
});
</script>

<style lang="scss" scoped>
.page-bg {
  background: #F8FAFB;
}
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
</style>
