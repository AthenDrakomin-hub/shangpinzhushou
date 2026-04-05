import { fetchApi } from '../utils/apiClient';
/**
 * 商品创建页面
 * 使用新布局和UI组件
 */
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Image as ImageIcon } from 'lucide-react';
import { Button, Input, Card, CardContent, PageHeader } from '../components/ui';
import { AuthUser } from '../services/authService';

interface ProductCreatePageProps {
  user: AuthUser | null;
  handleBack: () => void;
  setCurrentView: (view: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setSharingProduct?: (product: any) => void;
}

export default function ProductCreatePage({ user, handleBack, setCurrentView, showToast, setSharingProduct }: ProductCreatePageProps) {
  const [product, setProduct] = useState({
    name: '',
    price: '',
    originalPrice: '',
    description: '',
    imageUrl: '',
    category: 'other',
    templateId: 'default',
    supportedPayMethods: [] as string[],
    isShared: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetchApi('/api/admin/payment-channels');
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setChannels(data);
      }
    } catch (error) {
      console.error('Failed to fetch payment channels:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetchApi('/api/upload/image', {
        method: 'POST',
        headers: {
          
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.url) {
        setProduct({ ...product, imageUrl: data.url });
      } else {
        showToast(data.error || '上传失败，请检查图片格式和大小', 'error');
      }
    } catch (error) {
      showToast('上传出错，请稍后重试', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!product.name.trim()) {
      showToast('请输入商品名称', 'error');
      return;
    }
    const priceNum = parseFloat(product.price);
    if (!product.price || isNaN(priceNum) || priceNum <= 0) {
      showToast('请输入正确的价格', 'error');
      return;
    }

    const availableChannels = channels.filter(c => priceNum >= c.minAmount && priceNum <= c.maxAmount);
    if (availableChannels.length === 0) {
      showToast('请至少勾选一种收款方式', 'error');
      return;
    }

    const selectedValidChannels = product.supportedPayMethods.filter(id => 
      availableChannels.some(c => c.id === id)
    );

    if (selectedValidChannels.length === 0) {
      showToast('请选择至少一种支持的收款方式', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetchApi('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          original_price: product.originalPrice || product.price,
          description: product.description,
          image: product.imageUrl,
          category: product.category,
          template_id: product.templateId,
          supported_pay_methods: selectedValidChannels.join(','),
          is_shared: product.isShared,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('商品创建成功');
        setCurrentView('products');
        // 触发分享弹窗，注意从 data 直接取返回的商品对象
        if (setSharingProduct && data) {
          setSharingProduct(data);
        }
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
                    <span className="text-xs text-gray-400 dark:text-gray-500">支持所有主流图片格式</span>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  现价 (元) *
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
                {product.price && parseFloat(product.price) > 0 && (
                  <div className="mt-3">
                    {(() => {
                      const p = parseFloat(product.price);
                      const available = channels.filter(c => p >= c.minAmount && p <= c.maxAmount);
                      
                      if (available.length === 0) {
                        return (
                          <div className="text-xs font-medium px-2 py-1.5 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-1.5">
                            ⚠️ 友情提示：未匹配到对应额度的收款方式，无法创建
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400">选择支持的收款方式（可多选）：</div>
                          <div className="flex flex-wrap gap-2">
                            {available.map(c => {
                              const isSelected = product.supportedPayMethods.includes(c.id);
                              return (
                                <label 
                                  key={c.id} 
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600' 
                                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <input 
                                    type="checkbox" 
                                    className="sr-only"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setProduct({ ...product, supportedPayMethods: [...product.supportedPayMethods, c.id] });
                                      } else {
                                        setProduct({ ...product, supportedPayMethods: product.supportedPayMethods.filter(id => id !== c.id) });
                                      }
                                    }}
                                  />
                                  <span>{c.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  原价 (元)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                  <input
                    type="number"
                    step="0.01"
                    value={product.originalPrice}
                    onChange={(e) => setProduct({ ...product, originalPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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

            {/* 共享设置 */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">支持共享该商品</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  开启后所有员工可见。其他员工分享产生的收益归分享者所有。
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={product.isShared}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProduct({ ...product, isShared: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setCurrentView('products')}>
          取消
        </Button>
        <Button
          variant="primary"
          loading={isLoading}
          disabled={
            isLoading || 
            uploading || 
            (product.price ? channels.filter(c => parseFloat(product.price) >= c.minAmount && parseFloat(product.price) <= c.maxAmount).length === 0 : false)
          }
          icon={<Plus className="w-4 h-4" />}
          onClick={handleCreate}
        >
          创建商品
        </Button>
      </div>
    </div>
  );
}
