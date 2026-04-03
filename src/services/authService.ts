// ==================== 认证服务（PostgreSQL + JWT）====================
// 认证服务 - 直接使用后端 API

interface AuthUser {
  id: string;  // 添加 id 属性（字符串类型）
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'manager' | 'supervisor' | 'employee' | 'chief_engineer';
  status: 'pending' | 'approved' | 'active' | 'inactive' | 'disabled';
  merchantId?: string;  // 员工所属商户ID
}

// Token 存储
const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 获取当前用户
 */
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const token = getToken();
  console.log('[AuthService] getCurrentUser called, hasToken:', !!token);
  if (!token) return null;

  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('[AuthService] /api/auth/me response status:', response.status);

    if (!response.ok) {
      console.log('[AuthService] /api/auth/me failed, removing token');
      removeToken();
      return null;
    }

    const data = await response.json();
    console.log('[AuthService] getCurrentUser success:', data?.email);
    // 服务器直接返回用户对象，不是嵌套在 user 字段里
    return data;
  } catch (err) {
    console.error('[AuthService] getCurrentUser error:', err);
    removeToken();
    return null;
  }
};

/**
 * 获取当前会话
 */
export const getCurrentSession = async (): Promise<{ accessToken: string } | null> => {
  const token = getToken();
  return token ? { accessToken: token } : null;
};

// ==================== Email/Password 认证 ====================

/**
 * 邮箱密码注册
 */
export const signUpWithEmail = async (
  email: string, 
  password: string,
  displayName?: string
): Promise<{ user: AuthUser | null; error: string | null }> => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { user: null, error: data.error || '注册失败' };
    }

    setToken(data.token);
    return { user: data.user, error: null };
  } catch (err) {
    return { user: null, error: (err as Error).message };
  }
};

/**
 * 邮箱密码登录
 */
export const signInWithEmail = async (
  email: string, 
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log('[AuthService] Login response:', { ok: response.ok, hasToken: !!data.token, user: data.user });

    if (!response.ok) {
      return { user: null, error: data.error || '登录失败' };
    }

    setToken(data.token);
    console.log('[AuthService] Token saved, returning user:', data.user);
    return { user: data.user, error: null };
  } catch (err) {
    console.error('[AuthService] Login error:', err);
    return { user: null, error: (err as Error).message };
  }
};

// ==================== 通用方法 ====================

/**
 * 登出
 */
export const signOut = async (): Promise<{ error: string | null }> => {
  removeToken();
  return { error: null };
};

/**
 * 监听认证状态变化
 */
export const onAuthStateChanged = (
  callback: (user: AuthUser | null) => void
): (() => void) => {
  // 初始获取当前用户
  getCurrentUser().then(user => {
    callback(user);
  });

  // 监听 storage 变化（跨标签页同步）
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) {
      if (e.newValue) {
        getCurrentUser().then(user => callback(user));
      } else {
        callback(null);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

/**
 * 检查是否为管理员（经理）- 支持 admin 和 manager 角色
 */
export const isAdmin = async (email: string | null): Promise<boolean> => {
  const user = await getCurrentUser();
  return user?.role === 'manager' || user?.role === 'admin';
};

/**
 * 检查用户角色
 */
export const hasRole = (user: AuthUser | null, role: 'manager' | 'supervisor' | 'employee'): boolean => {
  return user?.role === role;
};

/**
 * 检查是否为经理 - 支持 admin 和 manager 角色
 */
export const isManager = (user: AuthUser | null): boolean => {
  return user?.role === 'manager' || user?.role === 'admin';
};

/**
 * 检查是否为主管
 */
export const isSupervisor = (user: AuthUser | null): boolean => {
  return user?.role === 'supervisor';
};

/**
 * 检查是否为员工
 */
export const isEmployee = (user: AuthUser | null): boolean => {
  return user?.role === 'employee' || user?.role === 'staff' as any;
};

/**
 * 检查用户是否已审核通过
 */
export const isApproved = (user: AuthUser | null): boolean => {
  return user?.status === 'approved';
};

/**
 * 检查用户是否待审核
 */
export const isPending = (user: AuthUser | null): boolean => {
  return user?.status === 'pending';
};

/**
 * 更新用户显示名称
 */
export const updateDisplayName = async (displayName: string): Promise<{ error: string | null }> => {
  // TODO: 实现更新显示名称 API
  return { error: '功能暂未实现' };
};

// ==================== 密码重置 ====================

/**
 * 修改密码
 */
export const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
  const token = getToken();
  if (!token) {
    return { error: '未登录' };
  }

  try {
    const response = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || '修改密码失败' };
    }

    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * 发送密码重置邮件（暂未实现）
 */
export const sendPasswordResetEmail = async (email: string): Promise<{ error: string | null }> => {
  return { error: '功能暂未实现，请联系管理员重置密码' };
};

// ==================== 兼容旧 API ====================

export const sendMagicLink = async (email: string): Promise<{ error: string | null }> => {
  return { error: '请使用邮箱密码登录' };
};

export const handleMagicLinkCallback = async (): Promise<{ user: AuthUser | null; error: string | null }> => {
  return { user: null, error: '无效的登录方式' };
};

export const isEmailVerified = async (): Promise<boolean> => {
  return true; // 简化版本，不做邮箱验证
};

export const resendVerificationEmail = async (email: string): Promise<{ error: string | null }> => {
  return { error: '功能暂未实现' };
};

export const verifyEmail = async (tokenHash: string, type: string): Promise<{ user: AuthUser | null; error: string | null }> => {
  return { user: null, error: '无效的验证方式' };
};

export const refreshSession = async (): Promise<{ session: any | null; error: string | null }> => {
  const user = await getCurrentUser();
  const token = getToken();
  return { session: user && token ? { accessToken: token } : null, error: null };
};

export const setSession = async (accessToken: string, refreshToken: string): Promise<{ session: any | null; error: string | null }> => {
  setToken(accessToken);
  return { session: { accessToken }, error: null };
};

// 导出类型
export type { AuthUser };

/**
 * 获取认证请求头
 * 同时发送 JWT token 和 x-user-id（向后兼容）
 */
export const getAuthHeaders = (userId?: string): Record<string, string> => {
  const token = getToken();
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (userId) {
    headers['x-user-id'] = userId;
  }
  
  return headers;
};
