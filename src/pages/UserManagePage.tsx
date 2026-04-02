/**
 * 用户管理页面 (新布局版本)
 * 支持两种模式：
 * - pending: 待审核用户（系统管理员）
 * - employees: 员工管理（商户）
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Trash2,
  Edit2,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, Button, Badge, StatCard, PageHeader, Modal } from '../components/ui';

interface UserManagePageProps {
  mode: 'pending' | 'employees';
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface UserData {
  id: string;
  email: string;
  display_name?: string;
  name?: string;
  role?: 'manager' | 'supervisor' | 'employee';
  status?: 'active' | 'inactive' | 'pending';
  created_at: string;
}

const ROLE_CONFIG = {
  manager: { label: '经理', color: 'primary' as const },
  admin: { label: '经理', color: 'primary' as const },
  supervisor: { label: '主管', color: 'success' as const },
  director: { label: '主管', color: 'success' as const },
  employee: { label: '员工', color: 'default' as const },
  staff: { label: '员工', color: 'default' as const },
};

const STATUS_CONFIG = {
  active: { label: '正常', color: 'success' as const },
  inactive: { label: '禁用', color: 'danger' as const },
  pending: { label: '待审核', color: 'warning' as const },
};

export default function UserManagePage({ mode, showToast }: UserManagePageProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  useEffect(() => {
    loadUsers();
  }, [mode]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const endpoint = mode === 'pending' 
        ? '/api/admin/pending-users'
        : '/api/merchant/employees';
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (mode === 'pending') {
        setUsers(data.users || []);
      } else {
        setUsers(data.employees || data || []);
      }
    } catch (error) {
      showToast('加载失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string, approve: boolean) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/approve-user/${userId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approve })
      });
      const data = await response.json();
      if (data.success) {
        showToast(approve ? '已通过审核' : '已拒绝');
        loadUsers();
      } else {
        showToast(data.error || '操作失败', 'error');
      }
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const handleDeleteEmployee = async (userId: string) => {
    if (!confirm('确定要删除该员工吗？')) return;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const response = await fetch(`/api/merchant/employees/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast('员工已删除');
        loadUsers();
      } else {
        showToast(data.error || '删除失败', 'error');
      }
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  // 过滤用户
  const filteredUsers = users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        u.email?.toLowerCase().includes(query) ||
        u.display_name?.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // 统计数据
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
  };

  const pageTitle = mode === 'pending' ? '待审核用户' : '员工管理';
  const pageSubtitle = mode === 'pending' ? '审核新用户注册申请' : '管理商户员工账号';

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        action={
          mode === 'employees' && (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreate(true)}
            >
              添加员工
            </Button>
          )
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={mode === 'pending' ? '待审核' : '总员工数'}
          value={stats.total}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="已激活"
          value={stats.active}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        {mode === 'pending' && (
          <StatCard
            title="待处理"
            value={stats.pending}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
          />
        )}
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* 角色筛选 */}
            {mode === 'employees' && (
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">全部角色</option>
                <option value="supervisor">主管</option>
                <option value="employee">员工</option>
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {mode === 'pending' ? '暂无待审核用户' : '暂无员工'}
              </p>
              {mode === 'employees' && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowCreate(true)}
                >
                  添加第一个员工
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredUsers.map((u) => {
                const roleConfig = ROLE_CONFIG[u.role || 'employee'] || ROLE_CONFIG.employee;
                const statusConfig = STATUS_CONFIG[u.status || 'active'] || STATUS_CONFIG.active;

                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {/* 头像 */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                      {(u.display_name || u.name || u.email)?.[0]?.toUpperCase() || 'U'}
                    </div>

                    {/* 用户信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {u.display_name || u.name || '未设置昵称'}
                        </h3>
                        <Badge variant={roleConfig.color}>{roleConfig.label}</Badge>
                        {mode === 'employees' && (
                          <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        注册于 {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    {mode === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          icon={<CheckCircle className="w-4 h-4" />}
                          onClick={() => handleApprove(u.id, true)}
                        >
                          通过
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<XCircle className="w-4 h-4" />}
                          onClick={() => handleApprove(u.id, false)}
                        >
                          拒绝
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit2 className="w-4 h-4" />}
                          onClick={() => setEditingUser(u)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-4 h-4" />}
                          onClick={() => handleDeleteEmployee(u.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建员工弹窗 */}
      <CreateEmployeeModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          loadUsers();
        }}
        showToast={showToast}
      />

      {/* 编辑用户弹窗 */}
      <EditUserModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={() => {
          setEditingUser(null);
          loadUsers();
        }}
        showToast={showToast}
      />
    </div>
  );
}

// 创建员工弹窗
function CreateEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'employee',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.display_name) {
      showToast('请填写完整信息', 'error');
      return;
    }
    if (form.password.length < 6) {
      showToast('密码至少需要6个字符', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const response = await fetch('/api/merchant/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('员工创建成功');
        setForm({ email: '', password: '', display_name: '', role: 'employee' });
        onSuccess();
      } else {
        showToast(data.error || '创建失败', 'error');
      }
    } catch (error) {
      showToast('创建失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="添加员工">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="employee@example.com"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">姓名</label>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="员工姓名"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密码</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="至少6个字符"
              className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="employee">员工</option>
            <option value="supervisor">主管</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" className="flex-1" loading={isLoading} onClick={handleSubmit}>
            创建
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// 编辑用户弹窗
function EditUserModal({
  user,
  onClose,
  onSuccess,
  showToast,
}: {
  user: UserData | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    display_name: user?.display_name || user?.name || '',
    role: (user?.role || 'employee') as 'manager' | 'supervisor' | 'employee',
    status: (user?.status || 'active') as 'active' | 'inactive' | 'pending',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        display_name: user.display_name || user.name || '',
        role: user.role || 'employee',
        status: user.status || 'active',
      });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.display_name) {
      showToast('请填写姓名', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const response = await fetch(`/api/merchant/employees/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('用户信息已更新');
        onSuccess();
      } else {
        showToast(data.error || '更新失败', 'error');
      }
    } catch (error) {
      showToast('更新失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={!!user} onClose={onClose} title="编辑员工">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">姓名</label>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as 'manager' | 'supervisor' | 'employee' })}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="employee">员工</option>
            <option value="supervisor">主管</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">状态</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' | 'pending' })}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="active">正常</option>
            <option value="inactive">禁用</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" className="flex-1" loading={isLoading} onClick={handleSubmit}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}
