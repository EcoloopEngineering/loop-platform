<template>
  <q-page class="q-pa-md page-bg">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold">Rewards Management</h5>
      <q-space />
      <q-btn
        label="Add Product"
        icon="add"
        color="primary"
        unelevated
        no-caps
        class="rounded-btn"
        @click="showAddDialog = true"
      />
    </div>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <q-banner v-else-if="pageError" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ pageError }}
      <template #action><q-btn flat label="Retry" @click="loadData" /></template>
    </q-banner>

    <template v-else>
      <!-- Summary cards -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <div class="text-caption text-grey-6 text-uppercase" style="letter-spacing: 0.04em">Products</div>
            <div class="text-h5 text-weight-bold text-primary q-mt-xs">{{ products.length }}</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <div class="text-caption text-grey-6 text-uppercase" style="letter-spacing: 0.04em">Pending Orders</div>
            <div class="text-h5 text-weight-bold text-orange q-mt-xs">{{ pendingCount }}</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="rounded-card text-center q-pa-md">
            <div class="text-caption text-grey-6 text-uppercase" style="letter-spacing: 0.04em">Fulfilled</div>
            <div class="text-h5 text-weight-bold text-green q-mt-xs">{{ fulfilledCount }}</div>
          </q-card>
        </div>
      </div>

      <!-- Products Table -->
      <div class="text-subtitle1 text-weight-bold q-mb-sm">Products</div>
      <q-table
        :rows="products"
        :columns="productColumns"
        row-key="id"
        flat bordered
        class="rounded-card q-mb-lg"
        :pagination="{ rowsPerPage: 10 }"
        :row-class="(row: RewardProduct) => !row.isActive ? 'inactive-row' : ''"
      >
        <template #body-cell-image="props">
          <q-td :props="props">
            <q-avatar v-if="props.row.imageUrl" size="36px" square class="rounded-sm">
              <img :src="props.row.imageUrl" />
            </q-avatar>
            <q-icon v-else name="card_giftcard" size="24px" color="grey-4" />
          </q-td>
        </template>
        <template #body-cell-price="props">
          <q-td :props="props">
            <q-icon name="monetization_on" color="amber-8" size="14px" class="q-mr-xs" />
            <span class="text-weight-bold">{{ props.row.price }}</span>
          </q-td>
        </template>
        <template #body-cell-stock="props">
          <q-td :props="props">
            <q-badge v-if="!props.row.isActive" color="grey" label="Unavailable" />
            <q-badge v-else-if="props.row.stock === null || props.row.stock === undefined" color="green" label="In Stock" />
            <q-badge v-else-if="props.row.stock <= 0" color="negative" label="Out of Stock" />
            <q-badge v-else color="blue" :label="`${props.row.stock} left`" />
          </q-td>
        </template>
        <template #body-cell-status="slotProps">
          <q-td :props="slotProps">
            <q-toggle
              :model-value="slotProps.row.isActive"
              color="primary"
              dense
              @update:model-value="toggleActive(slotProps.row)"
            />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense round icon="edit" size="sm" color="grey-7" @click="startEdit(props.row)" />
            <q-btn flat dense round icon="delete" size="sm" color="negative" @click="confirmDelete(props.row)" />
          </q-td>
        </template>
        <template #no-data>
          <div class="text-grey-5 q-pa-md text-center full-width">No products yet. Click "Add Product" to create one.</div>
        </template>
      </q-table>

      <!-- Orders Table -->
      <div class="text-subtitle1 text-weight-bold q-mb-sm">All Orders</div>
      <q-table
        :rows="allOrders"
        :columns="orderColumns"
        row-key="id"
        flat bordered
        class="rounded-card"
        :loading="loadingOrders"
        :pagination="{ rowsPerPage: 15 }"
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="props.row.status" />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              v-if="props.row.status === 'PENDING'"
              flat dense color="positive" icon="check_circle" label="Fulfill" size="sm"
              @click="handleFulfillOrder(props.row.id)"
            />
            <q-btn
              v-if="props.row.status === 'PENDING'"
              flat dense color="negative" icon="cancel" label="Cancel" size="sm" class="q-ml-xs"
              @click="handleCancelOrder(props.row.id)"
            />
            <span v-if="props.row.status !== 'PENDING'" class="text-grey-5">--</span>
          </q-td>
        </template>
        <template #no-data>
          <div class="text-grey-5 q-pa-md text-center full-width">No orders yet.</div>
        </template>
      </q-table>
    </template>

    <!-- Add Product Dialog -->
    <q-dialog v-model="showAddDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px;">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Add Reward Product</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="newProduct.name" label="Name" outlined dense class="q-mb-sm" />
          <q-input v-model="newProduct.description" label="Description" outlined dense type="textarea" autogrow class="q-mb-sm" />
          <div class="row q-gutter-sm q-mb-sm">
            <q-input v-model.number="newProduct.price" label="Price (coins)" outlined dense type="number" class="col" />
            <q-input v-model.number="newProduct.stock" label="Stock (empty = unlimited)" outlined dense type="number" class="col" placeholder="Unlimited" />
          </div>
          <div class="q-mb-sm">
            <div class="text-caption text-grey-6 q-mb-xs">Product Image</div>
            <div v-if="newProduct.imageUrl" class="row items-center q-mb-xs">
              <q-avatar size="48px" square class="rounded-sm q-mr-sm"><img :src="newProduct.imageUrl" /></q-avatar>
              <q-btn flat dense size="sm" icon="close" color="negative" @click="newProduct.imageUrl = ''" />
            </div>
            <q-btn v-else outline no-caps dense icon="upload" label="Upload Image" color="primary" size="sm" :loading="uploadingImage" @click="pickImage('new')" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-7" no-caps v-close-popup />
          <q-btn label="Create" color="primary" unelevated no-caps :disable="!newProduct.name || !newProduct.price" :loading="savingProduct" @click="handleCreateProduct" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Product Dialog -->
    <q-dialog v-model="showEditDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px;">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Edit Product</div>
        </q-card-section>
        <q-card-section v-if="editingProduct" class="q-pt-none">
          <q-input v-model="editingProduct.name" label="Name" outlined dense class="q-mb-sm" />
          <q-input v-model="editingProduct.description" label="Description" outlined dense type="textarea" autogrow class="q-mb-sm" />
          <div class="row q-gutter-sm q-mb-sm">
            <q-input v-model.number="editingProduct.price" label="Price (coins)" outlined dense type="number" class="col" />
            <q-input v-model.number="editingProduct.stock" label="Stock (empty = unlimited)" outlined dense type="number" class="col" placeholder="Unlimited" />
          </div>
          <div class="q-mb-sm">
            <div class="text-caption text-grey-6 q-mb-xs">Product Image</div>
            <div v-if="editingProduct.imageUrl" class="row items-center q-mb-xs">
              <q-avatar size="48px" square class="rounded-sm q-mr-sm"><img :src="editingProduct.imageUrl" /></q-avatar>
              <q-btn flat dense size="sm" icon="close" color="negative" @click="editingProduct.imageUrl = ''" />
            </div>
            <q-btn v-else outline no-caps dense icon="upload" label="Upload Image" color="primary" size="sm" :loading="uploadingImage" @click="pickImage('edit')" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-7" no-caps v-close-popup />
          <q-btn label="Save" color="primary" unelevated no-caps :disable="!editingProduct?.name || !editingProduct?.price" :loading="savingProduct" @click="handleUpdateProduct" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRewardsApi } from '@/composables/useRewardsApi';
import { api } from '@/boot/axios';
import type { RewardProduct, RewardOrder } from '@/types/api';

const $q = useQuasar();
const rewardsApi = useRewardsApi();

const loading = ref(false);
const pageError = ref<string | null>(null);
const products = ref<RewardProduct[]>([]);
const allOrders = ref<RewardOrder[]>([]);
const loadingOrders = ref(false);

const showAddDialog = ref(false);
const savingProduct = ref(false);
const uploadingImage = ref(false);
const newProduct = ref({ name: '', description: '', price: 0, imageUrl: '', stock: null as number | null });

const pendingCount = computed(() => allOrders.value.filter(o => o.status === 'PENDING').length);
const fulfilledCount = computed(() => allOrders.value.filter(o => o.status === 'FULFILLED' || o.status === 'COMPLETED').length);

const editingProduct = ref<RewardProduct | null>(null);
const showEditDialog = ref(false);

const productColumns = [
  { name: 'image', label: '', field: 'imageUrl', align: 'center' as const, style: 'width: 50px' },
  { name: 'name', label: 'Name', field: 'name', align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
  { name: 'price', label: 'Price', field: 'price', align: 'center' as const, sortable: true },
  { name: 'stock', label: 'Stock', field: 'stock', align: 'center' as const, sortable: true },
  { name: 'status', label: 'Status', field: 'isActive', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'center' as const, style: 'width: 100px' },
];

const orderColumns = [
  { name: 'user', label: 'User', field: (row: RewardOrder) => row.userName ?? '--', align: 'left' as const, sortable: true },
  { name: 'productName', label: 'Product', field: 'productName', align: 'left' as const },
  { name: 'coinsSpent', label: 'Coins', field: 'coinsSpent', align: 'center' as const },
  { name: 'status', label: 'Status', field: 'status', align: 'center' as const, sortable: true },
  { name: 'createdAt', label: 'Date', field: 'createdAt', align: 'left' as const, sortable: true, format: (val: string) => val ? new Date(val).toLocaleDateString() : '' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' as const },
];

function parseStock(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function statusColor(status: string) {
  return { PENDING: 'orange', PROCESSING: 'blue', FULFILLED: 'green', COMPLETED: 'green', CANCELLED: 'grey' }[status] ?? 'grey';
}

function startEdit(product: RewardProduct) {
  editingProduct.value = { ...product };
  showEditDialog.value = true;
}

function pickImage(target: 'new' | 'edit') {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    uploadingImage.value = true;
    const url = await rewardsApi.uploadProductImage(file);
    uploadingImage.value = false;
    if (url) {
      if (target === 'new') newProduct.value.imageUrl = url;
      else if (editingProduct.value) editingProduct.value.imageUrl = url;
    } else {
      $q.notify({ type: 'negative', message: 'Upload failed' });
    }
  };
  input.click();
}

async function handleUpdateProduct() {
  if (!editingProduct.value) return;
  savingProduct.value = true;
  const ok = await rewardsApi.updateProduct(editingProduct.value.id, {
    name: editingProduct.value.name,
    description: editingProduct.value.description || undefined,
    price: editingProduct.value.price,
    imageUrl: editingProduct.value.imageUrl || undefined,
    stock: parseStock((editingProduct.value as Record<string, unknown>).stock),
  });
  if (ok) {
    $q.notify({ type: 'positive', message: 'Product updated!' });
    showEditDialog.value = false;
    products.value = await rewardsApi.fetchAllProducts();
  } else {
    $q.notify({ type: 'negative', message: rewardsApi.error.value ?? 'Failed to update' });
  }
  savingProduct.value = false;
}

async function toggleActive(product: RewardProduct) {
  const newState = !product.isActive;
  const ok = await rewardsApi.updateProduct(product.id, { isActive: newState });
  if (ok) {
    $q.notify({ type: 'positive', message: newState ? 'Product activated' : 'Product deactivated' });
    products.value = await rewardsApi.fetchAllProducts();
  } else {
    $q.notify({ type: 'negative', message: 'Failed to update product' });
  }
}

function confirmDelete(product: RewardProduct) {
  $q.dialog({
    title: 'Delete Product',
    message: `Delete "${product.name}"? This cannot be undone.`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      await api.delete(`/rewards/${product.id}`);
      $q.notify({ type: 'positive', message: 'Product deleted' });
      products.value = await rewardsApi.fetchAllProducts();
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to delete product' });
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
    stock: parseStock(newProduct.value.stock),
  } as any);
  if (ok) {
    $q.notify({ type: 'positive', message: 'Product created!' });
    showAddDialog.value = false;
    newProduct.value = { name: '', description: '', price: 0, imageUrl: '', stock: null };
    products.value = await rewardsApi.fetchAllProducts();
  } else {
    $q.notify({ type: 'negative', message: rewardsApi.error.value ?? 'Failed to create product' });
  }
  savingProduct.value = false;
}

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
    allOrders.value = await rewardsApi.fetchAllOrders();
  } else {
    $q.notify({ type: 'negative', message: rewardsApi.error.value ?? 'Failed' });
  }
}

async function loadData() {
  loading.value = true;
  pageError.value = null;
  try {
    loadingOrders.value = true;
    const [prods, orders] = await Promise.all([
      rewardsApi.fetchAllProducts(),
      rewardsApi.fetchAllOrders(),
    ]);
    products.value = prods;
    allOrders.value = orders;
  } catch {
    pageError.value = 'Failed to load data. Please try again.';
  } finally {
    loading.value = false;
    loadingOrders.value = false;
  }
}

onMounted(() => { loadData(); });
</script>

<style lang="scss" scoped>
.rounded-card { border-radius: 12px; border-color: #E5E7EB; }
.rounded-btn { border-radius: 8px; }
:deep(.inactive-row) { opacity: 0.45; }
</style>
