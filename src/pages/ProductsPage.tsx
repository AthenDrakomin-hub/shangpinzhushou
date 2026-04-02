/**
 * 商品管理页面
 * 使用新布局和UI组件
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Share2,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';
import { Card, CardContent, Button, Badge, StatCard, PageHeader, Modal } from '../components/ui';
import type { AuthUser } from '../services/authService';

interface ProductsPageProps {
  user: AuthUser | null;
  handleBack: () => void;
  setCurrentView: (view: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setSharingProduct: (product: any) => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  status: 'active' | 'inactive';
  template_id?: string;
  supported_pay_methods?: string;
  created_at: string;
  sales?: number;
}

const PRODUCT_CATEGORIES = [
  { id: 'daifu', name: '代付', icon: '💳' },
  { id: 'meituan', name: '美团', icon: '🛵' },
  { id: 'eleme', name: '饿了么', icon: '🍱' },
  { id: 'jd', name: '京东', icon: '📦' },
  { id: 'other', name: '其他', icon: '✨' },
];

export default function ProductsPage({ user, handleBack, setCurrentView, showToast, setSharingProduct }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const response = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      showToast('获取商品列表失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('确定要删除这个商品吗？此操作不可恢复！')) return;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        showToast('商品已删除');
        fetchProducts();
      } else {
        const data = await response.json();
        showToast(data.error || '删除失败', 'error');
      }
    } catch (error) {
      showToast('网络错误，删除失败', 'error');
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        showToast(newStatus === 'active' ? '商品已上架' : '商品已下架');
        fetchProducts();
      }
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const copyShareLink = (productId: string) => {
    const link = `${window.location.origin}/h5/${productId}`;
    navigator.clipboard.writeText(link);
    showToast('链接已复制到剪贴板');
  };

  // 过滤商品
  const filteredProducts = products.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // 统计数据
  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    inactive: products.filter(p => p.status === 'inactive').length,
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="商品管理"
        subtitle="管理您的所有商品"
        action={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            创建商品
          </Button>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="总商品数"
          value={stats.total}
          icon={<Package className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="已上架"
          value={stats.active}
          icon={<Eye className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="已下架"
          value={stats.inactive}
          icon={<EyeOff className="w-5 h-5" />}
          color="gray"
        />
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
                placeholder="搜索商品名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* 状态筛选 */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">全部状态</option>
              <option value="active">已上架</option>
              <option value="inactive">已下架</option>
            </select>

            {/* 分类筛选 */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">全部分类</option>
              {PRODUCT_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 商品列表 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">暂无商品</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                创建第一个商品
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* 商品图片 */}
                  <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {/* 商品信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{product.name}</h3>
                      <Badge variant={product.status === 'active' ? 'success' : 'default'}>
                        {product.status === 'active' ? '已上架' : '已下架'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">¥{Number(product.price).toFixed(2)}</span>
                      <span>{PRODUCT_CATEGORIES.find(c => c.id === product.category)?.name || '未分类'}</span>
                      {product.sales !== undefined && <span>销量: {product.sales}</span>}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Share2 className="w-4 h-4" />}
                      onClick={() => setSharingProduct(product)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={product.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      onClick={() => handleToggleStatus(product.id, product.status)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit className="w-4 h-4" />}
                      onClick={() => setEditingProduct(product)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建商品弹窗 */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchProducts();
        }}
        onNavigate={setCurrentView}
      />

      {/* 编辑商品弹窗 */}
      <EditProductModal
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={() => {
          setEditingProduct(null);
          fetchProducts();
        }}
        showToast={showToast}
        user={user}
      />
    </div>
  );
}

// 编辑商品弹窗组件
function EditProductModal({ 
  product, 
  onClose, 
  onSave, 
  showToast,
  user 
}: { 
  product: Product | null; 
  onClose: () => void; 
  onSave: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  user: AuthUser | null;
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    price: product?.price?.toString() || '',
    description: product?.description || '',
    category: product?.category || 'other',
    imageUrl: product?.image || '',
    templateId: product?.template_id || 'default',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        price: product.price?.toString() || '',
        description: product.description || '',
        category: product.category || 'other',
        imageUrl: product.image || '',
        templateId: product.template_id || 'default',
      });
    }
  }, [product]);

  const handleSave = async () => {
    if (!form.name || !form.price) {
      showToast('请填写商品名称和价格', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const response = await fetch(`/api/products/${product?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          price: parseFloat(form.price),
          description: form.description,
          category: form.category,
          image: form.imageUrl,
          template_id: form.templateId,
        }),
      });

      if (response.ok) {
        showToast('商品已更新');
        onSave();
      } else {
        const data = await response.json();
        showToast(data.error || '更新失败', 'error');
      }
    } catch (error) {
      showToast('更新失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <Modal isOpen={!!product} onClose={onClose} title="编辑商品">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">商品名称</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">价格 (元)</label>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">商品描述</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" className="flex-1" loading={saving} onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// 创建商品弹窗组件
function CreateProductModal({ 
  isOpen, 
  onClose, 
  onNavigate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  onNavigate: (view: string) => void;
}) {
  const handleCreateNew = () => {
    onClose();
    onNavigate('product_create');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="创建商品">
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          创建新商品并设置价格、图片等信息
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleCreateNew}>
            开始创建
          </Button>
        </div>
      </div>
    </Modal>
  );
}
