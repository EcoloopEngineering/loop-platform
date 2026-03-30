import { ref } from 'vue';
import { api } from '@/boot/axios';
import type {
  RewardProduct,
  RewardOrder,
  RewardBalance,
} from '@/types/api';

type AxiosError = { response?: { data?: { message?: string } } };

function extractMessage(err: unknown, fallback: string): string {
  return (err as AxiosError)?.response?.data?.message ?? fallback;
}

export function useRewardsApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchBalance(): Promise<RewardBalance> {
    try {
      const { data } = await api.get<{ balance?: number; coins?: number }>(
        '/gamification/balance',
      );
      return { coins: data.balance ?? data.coins ?? 0 };
    } catch {
      return { coins: 0 };
    }
  }

  async function fetchProducts(): Promise<RewardProduct[]> {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<
        RewardProduct[] | { data?: RewardProduct[] }
      >('/rewards');
      return Array.isArray(data)
        ? data
        : (data as { data?: RewardProduct[] }).data ?? [];
    } catch {
      error.value = 'Failed to load products.';
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchOrders(): Promise<RewardOrder[]> {
    try {
      interface RawOrder {
        id: string;
        productName?: string;
        price?: number;
        status: string;
        createdAt: string;
        coinsSpent?: number;
        product?: { name?: string; price?: number };
      }
      const { data } = await api.get<RawOrder[] | { data: RawOrder[] }>(
        '/rewards/orders',
      );
      const raw: RawOrder[] = Array.isArray(data)
        ? data
        : (data as { data: RawOrder[] }).data ?? [];
      return raw.map((o) => ({
        ...o,
        productName: o.product?.name ?? o.productName ?? '--',
        price: o.coinsSpent ?? o.product?.price ?? o.price ?? 0,
      }));
    } catch {
      return [];
    }
  }

  async function fetchAllOrders(): Promise<RewardOrder[]> {
    try {
      const { data } = await api.get<
        RewardOrder[] | { data: RewardOrder[] }
      >('/rewards/orders/all');
      const raw: RewardOrder[] = Array.isArray(data)
        ? data
        : (data as { data: RewardOrder[] }).data ?? [];
      return raw.map((o) => ({
        ...o,
        productName: o.product?.name ?? '--',
        userName: o.user
          ? `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim()
          : '--',
      }));
    } catch {
      return [];
    }
  }

  async function createOrder(productId: string): Promise<boolean> {
    error.value = null;
    try {
      await api.post('/rewards/order', { productId });
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to place order');
      return false;
    }
  }

  async function createProduct(
    product: Omit<RewardProduct, 'id'>,
  ): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await api.post('/rewards', {
        name: product.name,
        description: product.description || undefined,
        price: product.price,
        imageUrl: product.imageUrl || undefined,
      });
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to create product');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function fulfillOrder(orderId: string): Promise<boolean> {
    error.value = null;
    try {
      await api.patch(`/rewards/orders/${orderId}/fulfill`);
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to fulfill order');
      return false;
    }
  }

  async function cancelOrder(orderId: string): Promise<boolean> {
    error.value = null;
    try {
      await api.patch(`/rewards/orders/${orderId}/cancel`);
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to cancel order');
      return false;
    }
  }

  return {
    loading,
    error,
    clearError,
    fetchBalance,
    fetchProducts,
    fetchOrders,
    fetchAllOrders,
    createOrder,
    createProduct,
    fulfillOrder,
    cancelOrder,
  };
}
