/**
 * 商品创建页面
 * 使用新布局和UI组件
 */
import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Image as ImageIcon,
  X,
  Plus,
  ShoppingBag,
  UtensilsCrossed,
  Plane,
  Car,
  Hotel,
} from 'lucide-react';
import { Card, CardContent, Button, Input, PageHeader } from '../components/ui';
import type { AuthUser } from '../services/authService';

interface ProductCreatePageProps {
  user: AuthUser | null;
  handleBack: () => void;
  setCurrentView: (view: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface Template {
  id: string;
  name: string;
  slogan: string;
  icon: React.ReactNode;
  bgColor: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'daifu',
    name: '代付',
    slogan: '帮我付一下这笔钱吧~',
    icon: <ShoppingBag className="w-5 h-5 text-white" />,
    bgColor: 'bg-[#FFD700]',
  },
  {
    id: 'meituan',
    name: '美团',
    slogan: 'Hi~ 你和我的距离只差一顿外卖~',
    icon: <UtensilsCrossed className="w-5 h-5 text-white" />,
    bgColor: 'bg-[#FFD000]',
  },
  {
    id: 'eleme',
    name: '饿了么',
    slogan: '饿了么代付，帮我点个外卖吧~',
    icon: <UtensilsCrossed className="w-5 h-5 text-white" />,
    bgColor: 'bg-[#0086F6]',
  },
  {
    id: 'jd',
    name: '京东',
    slogan: '我在京东挑了样好东西，请你帮我付款吧~',
    icon: <ShoppingBag className="w-5 h-5 text-white" />,
    bgColor: 'bg-[#F2270C]',
  },
  {
    id: 'ctrip',
    name: '携程',
    slogan: '亲爱的朋友，帮我完成这趟旅程吧~',
    icon: <Plane className="w-5 h-5 text-white" />,
    bgColor: 'bg-[#0086F6]',
  },
  {
    id: 'douyin',
    name: '抖音',
    slogan: '抖音代充，记录美好生活~',
    icon: <ShoppingBag className="w-5 h-5 text-white" />,
    bgColor: 'bg-[#000000]',
  },
  {
    id: 'kuaishou',
    name: '快手',
    slogan: '快手代充，拥抱每一种生活~',
    icon: <ShoppingBag className="w-5 h-5 text-white" />,
    bgColor: 'bg-[#FF6600]',
  },
];

const PRODUCT_CATEGORIES = [
  { id: 'daifu', name: '代付', icon: '💳' },
  { id: 'meituan', name: '美团', icon: '🛵' },
  { id: 'eleme', name: '饿了么', icon: '🍱' },
  { id: 'jd', name: '京东', icon: '📦' },
  { id: 'other', name: '其他', icon: '✨' },
];

const PAY_METHOD_CONFIG: Record<string, { label: string; icon: string; bgColor: string; available: boolean }> = {
  wechat: { label: '微信扫码', icon: '💚', bgColor: 'bg-green-100', available: true },
  alipay: { label: '扫码支付', icon: '💙', bgColor: 'bg-blue-100', available: true },
  bank: { label: '银行卡转账', icon: '🏦', bgColor: 'bg-orange-100', available: false },
};

export default function ProductCreatePage({ user, handleBack, setCurrentView, showToast }: ProductCreatePageProps) {
  const [product, setProduct] = useState({
    name: '',
    price: '',
    description: '',
    imageUrl: '',
    category: '',
    templateId: 'default',
    supportedPayMethods: ['wechat'] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.url) {
        setProduct({ ...product, imageUrl: data.url });
      } else {
        showToast('上传失败', 'error');
      }
    } catch (error) {
      showToast('上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!product.name.trim()) {
      showToast('请输入商品名称', 'error');
      return;
    }
    if (!product.price || parseFloat(product.price) <= 0) {
      showToast('请输入正确的价格', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          description: product.description,
          image: product.imageUrl,
          category: product.category,
          template_id: product.templateId,
          supported_pay_methods: product.supportedPayMethods.join(','),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('商品创建成功');
        setCurrentView('products');
      } else {
        showToast(data.error || '创建失败', 'error');
      }
    } catch (error) {
      showToast('创建失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="创建商品"
        subtitle="添加新的商品信息"
        breadcrumbs={[
          { label: '商品管理', href: '#/products' },
          { label: '创建商品' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：图片上传 */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">商品图片</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {product.imageUrl ? (
              <div className="relative">
                <img
                  src={product.imageUrl}
                  alt="商品图片"
                  className="w-full h-64 object-cover rounded-xl"
                />
                <button
                  onClick={() => setProduct({ ...product, imageUrl: '' })}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
              >
                {uploading ? (
                  <>
                    <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">处理中...</span>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                      <ImageIcon className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">点击上传图片</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">支持 JPG、PNG 格式</span>
                  </>
                )}
              </button>
            )}

            {/* 或输入 URL */}
            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span>或直接输入图片URL</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
              <Input
                type="text"
                value={product.imageUrl}
                onChange={(e) => setProduct({ ...product, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </CardContent>
        </Card>

        {/* 右侧：基本信息 */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">基本信息</h3>

            <Input
              label="商品名称 *"
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              placeholder="输入商品名称"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                商品价格 (元) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                <input
                  type="number"
                  step="0.01"
                  value={product.price}
                  onChange={(e) => setProduct({ ...product, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                商品描述
              </label>
              <textarea
                value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                placeholder="详细描述您的商品（可选）"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                商品分类
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRODUCT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setProduct({ ...product, category: cat.id })}
                    className={`py-2.5 rounded-lg text-center transition-all ${
                      product.category === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <p className="text-xs mt-0.5 font-medium">{cat.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分享模板选择 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分享模板风格</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">选择分享卡片的视觉风格</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 默认模板 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setProduct({ ...product, templateId: 'default' })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                product.templateId === 'default'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">默认风格</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">简洁现代的商品展示</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  product.templateId === 'default' ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {product.templateId === 'default' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </motion.button>

            {/* 品牌模板 */}
            {TEMPLATES.map((template) => (
              <motion.button
                key={template.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setProduct({ ...product, templateId: template.id })}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  product.templateId === template.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${template.bgColor}`}>
                  {template.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{template.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{template.slogan}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    product.templateId === template.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {product.templateId === template.id && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 下单方式选择 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">支持的下单方式 *</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">选择客户可以使用的下单方式</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(PAY_METHOD_CONFIG).map(([key, config]) => {
              const isSelected = product.supportedPayMethods.includes(key);
              return (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (isSelected) {
                      if (product.supportedPayMethods.length > 1) {
                        setProduct({
                          ...product,
                          supportedPayMethods: product.supportedPayMethods.filter((m) => m !== key),
                        });
                      }
                    } else {
                      setProduct({
                        ...product,
                        supportedPayMethods: [...product.supportedPayMethods, key],
                      });
                    }
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${config.bgColor}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-sm ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {config.label}
                    </p>
                    {!config.available && <p className="text-xs text-orange-500">即将支持</p>}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1">
            <span className="text-orange-500">💡</span>
            提示：请先在"设置"中配置相应的支付渠道
          </p>
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setCurrentView('products')}>
          取消
        </Button>
        <Button
          variant="primary"
          loading={isLoading}
          disabled={isLoading || uploading}
          icon={<Plus className="w-4 h-4" />}
          onClick={handleCreate}
        >
          创建商品
        </Button>
      </div>
    </div>
  );
}
