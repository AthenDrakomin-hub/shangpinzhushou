/**
 * 全局 API 客户端
 * 自动拦截请求，附加 Authorization Token，并统一处理 401 登出
 */
export const fetchApi = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('auth_token');
  
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 如果遇到 401 未授权，直接清除本地 Token 并重定向到登录页
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    // 如果当前不在登录页，再进行跳转
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }

  return response;
};
