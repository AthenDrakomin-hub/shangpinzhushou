import { fetchApi } from '../utils/apiClient';
import type { User, Order } from '../storage/database/shared/schema';

// Token 存储
const TOKEN_KEY = 'auth_token';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { } : {};
}

// ==================== 用户服务 ====================

/**
 * 获取用户信息
 */
export const getUser = async (uid: string): Promise<User | null> => {
  try {
    const response = await fetchApi('/api/auth/me', {
      
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.user;
  } catch (err) {
    console.error('getUser error:', err);
    return null;
  }
};

// 兼容旧 API - 同步用户资料（现在不再需要）
export const syncUserProfile = async (user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<User | null> => {
  // 新架构下，注册时已经创建用户，不需要额外同步
  return getUser(user.uid);
};

// ==================== 订单服务 ====================

/**
 * 获取订单列表
 */
export const getOrders = async (uid: string): Promise<Order[]> => {
  try {
    const response = await fetchApi('/api/user/orders', {
      headers: {
        
        'x-user-id': uid,
      },
    });

    if (!response.ok) return [];
    
    const data = await response.json();
    return data.orders || [];
  } catch (err) {
    console.error('getOrders error:', err);
    return [];
  }
};

/**
 * 创建订单
 */
export const createOrder = async (orderData: {
  creatorUid: string;
  amount: number;
  templateId: string;
  timeLeft: number;
}): Promise<string> => {
  const response = await fetchApi('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      
      'x-user-id': orderData.creatorUid,
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '创建订单失败');
  }

  const data = await response.json();
  return data.orderId;
};

/**
 * 获取订单
 */
export const getOrder = async (orderId: string): Promise<Order | null> => {
  try {
    const response = await fetchApi(`/api/orders/${orderId}`, {
      
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('getOrder error:', err);
    return null;
  }
};

/**
 * 更新订单状态
 */
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  payerInfo?: string
): Promise<void> => {
  const response = await fetchApi(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      
    },
    body: JSON.stringify({ status, payerInfo }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '更新订单状态失败');
  }
};

/**
 * 订阅订单列表变化（轮询模拟）
 */
export const subscribeToOrders = (
  uid: string,
  callback: (orders: Order[]) => void
): (() => void) => {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;

  const fetchOrders = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const orders = await getOrders(uid);
      callback(orders);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      isRunning = false;
    }
  };

  fetchOrders();
  intervalId = setInterval(fetchOrders, 5000);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

// ==================== 系统配置服务 ====================

/**
 * 获取支付配置
 */
export const getPaymentConfig = async (): Promise<Record<string, unknown> | null> => {
  try {
    const response = await fetchApi('/api/config/payment');
    if (!response.ok) return null;
    const data = await response.json();
    return data.config;
  } catch (err) {
    console.error('getPaymentConfig error:', err);
    return null;
  }
};

/**
 * 保存支付配置
 */
export const savePaymentConfig = async (configData: Record<string, unknown>): Promise<void> => {
  const response = await fetchApi('/api/config/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      
    },
    body: JSON.stringify(configData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '保存配置失败');
  }
};

/**
 * 订阅支付配置变化
 */
export const subscribeToPaymentConfig = (
  callback: (data: Record<string, unknown> | null) => void
): (() => void) => {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;

  const fetchConfig = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const config = await getPaymentConfig();
      callback(config);
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      isRunning = false;
    }
  };

  fetchConfig();
  intervalId = setInterval(fetchConfig, 10000);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

// ==================== 测试连接 ====================

/**
 * 测试数据库连接
 */
export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetchApi('/api/health/db');
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Database connection test failed:', err);
    return { success: false, error: (err as Error).message };
  }
};

// 类型导出
export type { User as UserProfile, Order as OrderType };
