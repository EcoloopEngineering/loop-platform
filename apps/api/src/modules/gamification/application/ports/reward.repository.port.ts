export const REWARD_REPOSITORY = Symbol('REWARD_REPOSITORY');

export interface RewardRepositoryPort {
  findActiveProducts(): Promise<any[]>;

  findProductById(id: string): Promise<any | null>;

  createProduct(data: {
    code: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
  }): Promise<any>;

  updateProduct(id: string, data: Record<string, unknown>): Promise<any>;

  createOrder(data: {
    userId: string;
    productId: string;
    coinsSpent: number;
  }): Promise<any>;

  findOrdersByUser(userId: string): Promise<any[]>;

  findAllOrders(): Promise<any[]>;

  findOrderById(id: string): Promise<any | null>;

  findOrderByIdWithProduct(id: string): Promise<any | null>;

  updateOrderStatus(id: string, status: string): Promise<any>;
}
