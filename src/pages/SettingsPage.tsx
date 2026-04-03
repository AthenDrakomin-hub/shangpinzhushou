import { fetchApi } from '../utils/apiClient';
/**
 * 设置页面
 * 使用新布局和UI组件
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Bell,
  Palette,
  Globe,
  Lock,
  HelpCircle,
  Info,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
  Eye,
  EyeOff,
  CreditCard,
  Save,
  ShieldCheck,
  Database,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge, PageHeader, Modal } from '../components/ui';
import type { AuthUser } from '../services/authService';

interface SettingsPageProps {
  user: AuthUser | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onLogout: () => void;
}

interface SettingItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

// @ts-ignore
function SystemConfigModal({ isOpen, onClose, showToast }: any) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({ key: '', value: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
    }
  }, [isOpen]);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/api/system/configs');
      const data = await res.json();
      setConfigs(data || []);
    } catch (e) {
      showToast('加载配置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.key.trim() || !formData.value.trim()) {
      showToast('键和值不能为空', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetchApi('/api/system/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showToast('保存成功');
        setEditingKey(null);
        setFormData({ key: '', value: '', description: '' });
        loadConfigs();
      } else {
        showToast('保存失败', 'error');
      }
    } catch (e) {
      showToast('网络错误', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`确定要删除配置项 ${key} 吗？`)) return;
    try {
      const res = await fetchApi(`/api/system/configs/${key}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('删除成功');
        loadConfigs();
      } else {
        showToast('删除失败', 'error');
      }
    } catch (e) {
      showToast('网络错误', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="系统管理 (全局配置)">
      <div className="space-y-4">
        {editingKey !== null && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              {editingKey === 'new' ? '新增配置项' : '编辑配置项'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">配置键 (Key)</label>
                <input 
                  type="text" 
                  value={formData.key}
                  disabled={editingKey !== 'new'}
                  onChange={e => setFormData({...formData, key: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50" 
                  placeholder="如: SYSTEM_TITLE"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">配置值 (Value)</label>
                <textarea 
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[80px]" 
                  placeholder="如: PayForMe 助手"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">描述说明 (可选)</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg" 
                  placeholder="配置项用途说明"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingKey(null)}>取消</Button>
                <Button variant="primary" loading={isSaving} onClick={handleSave}>保存</Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h3 className="font-medium text-gray-900 dark:text-white">配置列表</h3>
          <Button 
            variant="primary" 
            onClick={() => {
              setFormData({ key: '', value: '', description: '' });
              setEditingKey('new');
            }}
            icon={<Plus className="w-4 h-4" />}
            disabled={editingKey !== null}
          >
            新增配置
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">加载中...</div>
        ) : configs.length === 0 ? (
          <div className="py-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            暂无自定义系统配置
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {configs.map(config => (
              <div key={config.key} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-start">
                <div className="flex-1 overflow-hidden pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{config.key}</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white truncate" title={config.value}>{config.value}</p>
                  {config.description && (
                    <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => {
                      setFormData({ key: config.key, value: config.value, description: config.description || '' });
                      setEditingKey(config.key);
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(config.key)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function SettingsPage({ user, showToast, onLogout }: SettingsPageProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showPaymentConfigModal, setShowPaymentConfigModal] = useState(false);
  const [showSystemConfigModal, setShowSystemConfigModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState('zh-CN');

  // 获取当前主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(savedTheme === 'dark' || (!savedTheme && prefersDark));
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const getRoleName = (role?: string) => {
    switch (role) {
      case 'manager':
      case 'admin':
        return '经理';
      case 'supervisor':
        return '主管';
      case 'chief_engineer':
        return '首席工程师';
      case 'employee':
      case 'staff':
      default:
        return '员工';
    }
  };

  const baseAccountSettings: SettingItem[] = [
      {
        id: 'profile',
        icon: <User className="w-5 h-5" />,
        title: '个人资料',
        description: '修改头像、昵称等个人信息',
        onClick: () => setShowProfileModal(true),
      },
      {
        id: 'password',
        icon: <Lock className="w-5 h-5" />,
        title: '修改密码',
        description: '更新登录密码',
        onClick: () => setShowPasswordModal(true),
      },
      {
        id: 'security_question',
        icon: <ShieldCheck className="w-5 h-5" />,
        title: '密保问题',
        description: '设置或修改密保问题，用于找回密码',
        onClick: () => setShowSecurityModal(true),
      },
    ];

    const accountSettings: SettingItem[] = (user?.role === 'manager' || user?.role === 'admin' || user?.role === 'chief_engineer')
      ? [
          ...baseAccountSettings,
          {
            id: 'payment_config',
            icon: <CreditCard className="w-5 h-5" />,
            title: '支付通道配置',
            description: '设置收款账户、通道参数等',
            onClick: () => setShowPaymentConfigModal(true),
          }
        ]
      : baseAccountSettings;

  const appSettings: SettingItem[] = [
      {
        id: 'theme',
        icon: <Palette className="w-5 h-5" />,
        title: '深色模式',
        description: '切换明暗主题',
        action: (
          <Badge variant="warning">待开发</Badge>
        ),
      },
      {
        id: 'language',
        icon: <Globe className="w-5 h-5" />,
        title: '语言设置',
        description: `当前: ${language === 'zh-CN' ? '简体中文' : 'English'}`,
        action: (
          <Badge variant="warning">待开发</Badge>
        )
      },
  ];

  const supportSettings: SettingItem[] = [
      {
        id: 'help',
        icon: <HelpCircle className="w-5 h-5" />,
        title: '帮助中心',
        description: '常见问题和使用指南',
        onClick: () => setShowHelpModal(true),
      },
      {
        id: 'about',
        icon: <Info className="w-5 h-5" />,
        title: '关于我们',
        description: '版本 v2.2.0',
        onClick: () => setShowAboutModal(true),
      },
    ];

    const systemSettings: SettingItem[] = user?.role === 'chief_engineer' ? [
      {
        id: 'system_management',
        icon: <Database className="w-5 h-5" />,
        title: '全局系统配置 (仅首席工程师)',
        description: '管理全局字典、密钥和其他系统级别参数',
        onClick: () => setShowSystemConfigModal(true),
      }
    ] : [];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="设置"
        subtitle="管理您的账户和应用设置"
      />

      {/* 用户信息卡片 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user?.displayName || '用户'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="primary">{getRoleName(user?.role)}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 账户设置 */}
      <Card>
        <CardHeader title="账户设置" className="px-4 py-3 border-b border-gray-100 dark:border-gray-700" />
        <CardContent className="p-0">
          {accountSettings.map((item, index) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                index !== accountSettings.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
              </div>
              {item.action || <ChevronRight className="w-5 h-5 text-gray-400" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 应用设置 */}
      <Card>
        <CardHeader title="应用设置" className="px-4 py-3 border-b border-gray-100 dark:border-gray-700" />
        <CardContent className="p-0">
          {appSettings.map((item, index) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                item.action ? '' : 'cursor-pointer'
              } ${
                index !== appSettings.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
              </div>
              {item.action || <ChevronRight className="w-5 h-5 text-gray-400" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 支持与帮助 */}
        <Card>
          <CardHeader title="支持与帮助" className="px-4 py-3 border-b border-gray-100 dark:border-gray-700" />
          <CardContent className="p-0">
            {supportSettings.map((item, index) => (
              <div
                key={item.id}
                onClick={item.onClick}
                className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                  index !== supportSettings.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 系统管理 (仅首席工程师) */}
        {user?.role === 'chief_engineer' && systemSettings.length > 0 && (
          <Card>
            <CardHeader title="系统管理" className="px-4 py-3 border-b border-gray-100 dark:border-gray-700" />
            <CardContent className="p-0">
              {systemSettings.map((item, index) => (
                <div
                  key={item.id}
                  onClick={item.onClick}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                    index !== systemSettings.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      {/* 退出登录 */}
      <Card>
        <CardContent className="p-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">退出登录</span>
          </button>
        </CardContent>
      </Card>

      {/* 修改密码弹窗 */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        showToast={showToast}
      />

      {/* 密保问题弹窗 */}
      <SecurityQuestionModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        showToast={showToast}
      />

      {/* 支付配置弹窗 */}
      {showPaymentConfigModal && (
        <PaymentConfigModal
          isOpen={showPaymentConfigModal}
          onClose={() => setShowPaymentConfigModal(false)}
          showToast={showToast}
        />
      )}

      {/* 关于弹窗 */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* 帮助中心弹窗 */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />

      {/* 个人资料弹窗 */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} showToast={showToast} />

      {/* 系统配置弹窗 */}
      <SystemConfigModal isOpen={showSystemConfigModal} onClose={() => setShowSystemConfigModal(false)} showToast={showToast} />
    </div>
  );
}

// 帮助中心弹窗
function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="帮助中心" size="lg">
      <div className="space-y-6 py-2 max-h-[60vh] overflow-y-auto pr-2">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Q: 如何创建商品海报？</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            在「商品管理」页面，点击商品列表右侧的「分享」按钮，选择您喜欢的模板，然后点击「生成海报」。生成后可以长按保存图片或直接分享给客户。
          </p>
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Q: 什么是三级分润系统？</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            系统支持 经理 - 主管 - 员工 的三级分润体系。经理可以设置主管的分成比例，主管可以设置员工的分成比例。当员工分享商品产生订单时，收益会根据设置的比例自动分配到对应层级的钱包中。
          </p>
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Q: 如何配置支付通道？</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            只有经理/管理员可以在「系统设置」-「支付通道配置」中填写 SuperPay 支付参数（商户号和密钥）。配置完成后，所有的商品支付都将通过该通道进行结算。
          </p>
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Q: 提现流程是怎样的？</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            员工在「我的钱包」中申请提现，目前仅支持 USDT (TRC20) 提现。提交后，上级主管或经理在「提现管理」页面审核并进行打款。
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          我知道了
        </Button>
      </div>
    </Modal>
  );
}

// 个人资料弹窗
function ProfileModal({ isOpen, onClose, user, showToast }: { isOpen: boolean; onClose: () => void; user: AuthUser | null; showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [name, setName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setName(user.displayName);
    }
  }, [user]);

  const handleSave = async () => {
      if (!name.trim()) {
        showToast('昵称不能为空', 'error');
        return;
      }
      setLoading(true);
      try {
        const res = await fetchApi(`/api/user/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ display_name: name })
        });
        if (res.ok) {
          showToast('资料已更新，刷新页面后生效');
          onClose();
        } else {
          showToast('更新失败', 'error');
        }
      } catch (e) {
        showToast('网络错误', 'error');
      } finally {
        setLoading(false);
      }
    };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="个人资料">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            登录账号 (不可修改)
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
            title="作为系统唯一身份凭证，账号不支持修改"
          />
          <p className="text-xs text-gray-500 mt-1">账号作为系统唯一身份凭证，暂不支持直接修改。如需变更请联系首席工程师。</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            显示昵称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="请输入您希望在系统中展示的名称"
          />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          取消
        </Button>
        <Button variant="primary" className="flex-1" loading={loading} onClick={handleSave}>
          保存
        </Button>
      </div>
    </Modal>
  );
}

// 修改密码弹窗
function PasswordModal({ 
  isOpen, 
  onClose,
  showToast 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('请填写所有字段', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('密码至少需要6个字符', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetchApi('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('密码修改成功');
        onClose();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.error || '修改失败', 'error');
      }
    } catch (error) {
      showToast('修改失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="修改密码">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前密码</label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="请输入当前密码"
              className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新密码</label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少6个字符"
              className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认新密码</label>
          <input
            type={showNewPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            autoComplete="new-password"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">
            取消
          </Button>
          <Button variant="primary" className="flex-1" loading={isLoading} type="submit">
            保存修改
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// 密保问题弹窗
function SecurityQuestionModal({
  isOpen,
  onClose,
  showToast
}: {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const QUESTIONS = [
    '你出生的城市是哪里？',
    '你小学班主任的名字是什么？',
    '你最好的朋友叫什么名字？',
    '你第一只宠物的名字是什么？',
    '你最喜欢的电影是什么？'
  ];

  const handleSubmit = async () => {
    if (!question || !answer || !password) {
      showToast('请填写所有必填项', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetchApi('/api/auth/security-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify({
          question,
          answer,
          password
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('密保问题设置成功');
        onClose();
        setQuestion('');
        setAnswer('');
        setPassword('');
      } else {
        showToast(data.error || '设置失败', 'error');
      }
    } catch (error) {
      showToast('设置失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="设置密保问题">
      <div className="space-y-4">
        <p className="text-xs text-gray-500 mb-4">
          密保问题将用于找回登录密码，请务必牢记您的答案。
        </p>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">选择密保问题</label>
          <select
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="" disabled>请选择一个问题</option>
            {QUESTIONS.map((q, idx) => (
              <option key={idx} value={q}>{q}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密保答案</label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="请输入答案"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前登录密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="验证您的身份"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>取消</Button>
          <Button variant="primary" className="flex-1" loading={isLoading} onClick={handleSubmit}>保存设置</Button>
        </div>
      </div>
    </Modal>
  );
}

// 支付配置弹窗
function PaymentConfigModal({
  isOpen,
  onClose,
  showToast
}: {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [config, setConfig] = useState({
    superpayMerchantOn: '',
    superpayMerchantKey: '',
    jiujiuMchId: '',
    jiujiuSecretKey: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetchApi('/api/admin/payment-config', {
        headers: { }
      });
      const data = await response.json();
      if (response.ok) {
        setConfig({
          superpayMerchantOn: data.superpayMerchantOn || '',
          superpayMerchantKey: data.superpayMerchantKey || '',
          jiujiuMchId: data.jiujiuMchId || '',
          jiujiuSecretKey: data.jiujiuSecretKey || ''
        });
      }
    } catch (error) {
      showToast('获取配置失败', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetchApi('/api/admin/payment-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (response.ok) {
        showToast('支付配置保存成功并已生效');
        onClose();
      } else {
        showToast(data.error || '保存失败', 'error');
      }
    } catch (error) {
      showToast('网络错误，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSuperpay = async () => {
    if (!config.superpayMerchantOn || !config.superpayMerchantKey) {
      showToast('请先填写商户号和密钥', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetchApi('/api/settings/test-superpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantOn: config.superpayMerchantOn,
          merchantKey: config.superpayMerchantKey
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.pay_url) {
          showToast('测试订单(0.01元)创建成功，正在跳转...', 'success');
          setTimeout(() => window.open(data.pay_url, '_blank'), 1500);
        } else {
          showToast('通道可用！(测试响应无支付链接)', 'success');
        }
      } else {
        showToast(data.error || '测试失败：通道配置有误', 'error');
      }
    } catch (error) {
      showToast('网络错误，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestJiujiu = async () => {
    if (!config.jiujiuMchId || !config.jiujiuSecretKey) {
      showToast('请先填写商户ID和密钥', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetchApi('/api/settings/test-jiujiu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mchId: config.jiujiuMchId,
          secretKey: config.jiujiuSecretKey
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.pay_url) {
          showToast('测试订单(1.00元)创建成功，正在打开支付页面...', 'success');
          setTimeout(() => window.open(data.pay_url, '_blank'), 1500);
        } else {
          showToast('通道可用！(测试响应无支付链接)', 'success');
        }
      } else {
        showToast(data.error || '测试失败：通道配置有误', 'error');
      }
    } catch (error) {
      showToast('网络错误，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="支付通道配置">
      {isFetching ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-medium text-blue-900">SuperPay 支付宝配置</h3>
                <Button variant="outline" className="!py-1 !text-xs !bg-white" onClick={handleTestSuperpay} disabled={isLoading}>
                  测试通道
                </Button>
              </div>
              <p className="text-xs text-blue-700 mb-4">如果不填写则不启用支付宝通道</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">商户编号 (Merchant ON)</label>
                  <input
                    type="text"
                    value={config.superpayMerchantOn}
                    onChange={e => setConfig({...config, superpayMerchantOn: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="例如: 2410311234"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">商户密钥 (Merchant Key)</label>
                  <input
                    type="text"
                    value={config.superpayMerchantKey}
                    onChange={e => setConfig({...config, superpayMerchantKey: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="API Key"
                  />
                </div>
                <div className="mt-2 p-2 bg-white/60 rounded border border-blue-100/50">
                  <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">您的 Webhook 异步回调地址 (需填入三方后台)</label>
                  <div className="text-xs font-mono text-gray-600 select-all break-all">
                    {window.location.origin}/api/orders/callback
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-medium text-green-900">九久支付 微信配置</h3>
                <Button variant="outline" className="!py-1 !text-xs !bg-white" onClick={handleTestJiujiu} disabled={isLoading}>
                  测试通道
                </Button>
              </div>
              <p className="text-xs text-green-700 mb-4">如果不填写则不启用微信通道</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">商户 ID (Mch ID)</label>
                  <input
                    type="text"
                    value={config.jiujiuMchId}
                    onChange={e => setConfig({...config, jiujiuMchId: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="例如: 10001"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">商户密钥 (Secret Key)</label>
                  <input
                    type="text"
                    value={config.jiujiuSecretKey}
                    onChange={e => setConfig({...config, jiujiuSecretKey: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="API Key"
                  />
                </div>
                <div className="mt-2 p-2 bg-white/60 rounded border border-green-100/50">
                  <label className="block text-[10px] font-bold text-green-800 uppercase mb-1">您的 Webhook 异步回调地址 (系统下单时自动携带，通常无需填写到三方后台)</label>
                  <div className="text-xs font-mono text-gray-600 select-all break-all">
                    {window.location.origin}/api/orders/wechat/callback
                  </div>
                </div>
              </div>
            </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={onClose}>取消</Button>
            <Button variant="primary" className="flex-1" loading={isLoading} onClick={handleSave} icon={<Save className="w-4 h-4" />}>
              保存配置
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// 关于弹窗
function AboutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="关于我们">
      <div className="text-center py-4">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl font-bold">G</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">商品页助手</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">版本 2.2.0</p>
        
        <div className="text-left space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>商品页助手是一个面向个人商户/小微商家的商品展示页生成工具，帮助用户快速创建商品分享页面。</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © 2026 GoodsPage. All rights reserved.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
}
