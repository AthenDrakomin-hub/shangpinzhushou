import { useState, useEffect } from 'react';
import { 
  Share2, ChevronRight, CheckCircle2, Clock, 
  AlertCircle, Copy, X
} from 'lucide-react';
import { 
  isWechatBrowser, getBrowserType,
  savePaymentInfo, getStoredPaymentInfo
} from '../utils/wechat';

// 模板配置 - 每个模板的品牌信息
const TEMPLATE_BRANDS: Record<string, {
  name: string;
  title: string;
  description: string;
  icon: string;
  themeColor: string;
}> = {
  default: {
    name: '精选商品',
    title: '精选商品',
    description: '发现美好生活',
    icon: '✨',
    themeColor: '#667eea'
  },
  daifu: {
    name: '帮我代付',
    title: '帮我代付',
    description: '好友帮忙，温暖人心',
    icon: '💰',
    themeColor: '#FFC107'
  },
  meituan: {
    name: '美团优选',
    title: '美团优选',
    description: '美好生活小帮手',
    icon: '🟡',
    themeColor: '#FFD100'
  },
  eleme: {
    name: '饿了么',
    title: '饿了么订餐',
    description: '送餐快，品质好',
    icon: '🔵',
    themeColor: '#1e88e5'
  },
  jd: {
    name: '京东好物',
    title: '京东好物',
    description: '正品保障·极速达',
    icon: '🔴',
    themeColor: '#e4393c'
  },
  ctrip: {
    name: '携程旅行',
    title: '携程旅行',
    description: '说走就走的旅行',
    icon: '🔷',
    themeColor: '#0066CC'
  },
  douyin: {
    name: '抖音好物',
    title: '抖音好物',
    description: '潮流前线',
    icon: '🎵',
    themeColor: '#FE2C55'
  },
  kuaishou: {
    name: '快手小店',
    title: '快手小店',
    description: '源头好物推荐',
    icon: '⚡',
    themeColor: '#FF4906'
  }
};

// 商品数据接口
interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  description: string;
  image: string;
  sales: number;
  stock: number;
  status: 'active' | 'inactive';
}

// 支付渠道配置
interface PaymentChannel {
  code: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  gateway: 'superpay' | 'jiujiu'; // 支付网关标识
}

// 预设支付渠道 - H5 页面显示支付宝（SuperPay）和微信（九久支付）
const PAYMENT_CHANNELS: PaymentChannel[] = [
  { 
    code: 'alipay_superpay', 
    name: '支付宝', 
    icon: '💙', 
    color: '#1677FF', 
    bgColor: 'bg-blue-50',
    gateway: 'superpay' // 使用 SuperPay 网关
  },
  { 
    code: 'WXpay_SM', 
    name: '微信支付', 
    icon: '💚', 
    color: '#07C160', 
    bgColor: 'bg-green-50',
    gateway: 'jiujiu' // 使用九久支付网关
  },
];

interface H5ProductPageProps {
  productId?: string;
  onClose?: () => void;
}

export default function H5ProductPage({ productId = 'p1', onClose }: H5ProductPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel>(PAYMENT_CHANNELS[0]);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [showWechatGuide, setShowWechatGuide] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'pending' | 'paid' | 'failed'>('idle');
  const [orderId, setOrderId] = useState<string>('');
  const [payUrl, setPayUrl] = useState<string>('');
  
  // 从 URL 读取模板参数
  const getTemplateFromURL = (): string => {
    if (typeof window === 'undefined') return 'default';
    const params = new URLSearchParams(window.location.search);
    return params.get('template') || 'default';
  };
  
  const currentTemplate = getTemplateFromURL();
  const currentBrand = TEMPLATE_BRANDS[currentTemplate] || TEMPLATE_BRANDS.default;

  // 检测微信环境
  const isInWechat = isWechatBrowser();
  const browserType = getBrowserType();

  // 立即应用模板 branding（在组件加载时）
  useEffect(() => {
    // 更新主题色
    let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', currentBrand.themeColor);
    
    // 更新标题（立即执行，无"商品页助手"字眼）
    document.title = currentBrand.title;
    
    console.log(`[模板变身] 应用模板：${currentTemplate}, 品牌：${currentBrand.name}`);
  }, [currentTemplate, currentBrand]);

  // 加载商品数据 - 从 API 获取
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoadingProduct(true);
        const response = await fetch(`/api/products/${productId}`);
        if (response.ok) {
          const data = await response.json();
          setProduct({
            id: data.id,
            name: data.name,
            price: parseFloat(data.price),
            originalPrice: parseFloat(data.originalPrice || data.price),
            description: data.description || '',
            image: data.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400',
            sales: data.sales || 0,
            stock: data.stock || 100,
            status: data.status || 'active'
          });
          // 更新页面meta标签（用于分享）
          updateMetaTags({
            name: data.name,
            price: parseFloat(data.price),
            description: data.description || '',
            image: data.image || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoadingProduct(false);
      }
    };
    
    fetchProduct();
    
    // 检查是否有待处理的支付
    const pendingPayment = getStoredPaymentInfo();
    if (pendingPayment && pendingPayment.productId === productId) {
      setOrderId(pendingPayment.orderId);
      setOrderStatus('pending');
    }
  }, [productId]);

  // 更新页面meta标签
  const updateMetaTags = (product: { name: string; price: number; description: string; image: string }) => {
    // 更新标题（保持模板品牌，不覆盖）
    // document.title 已经在组件加载时设置，这里不再修改
    
    // 更新OG标签
    const updateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    // 使用模板品牌的 title 和 description
    updateMeta('og:title', `${currentBrand.name} - ${product.name}`);
    updateMeta('og:description', `${currentBrand.description} | ${product.description.slice(0, 100)}`);
    updateMeta('og:image', product.image);
    updateMeta('og:type', 'website');
    updateMeta('og:url', window.location.href);
    
    // 微信分享专用
    let itemPropName = document.querySelector('meta[itemprop="name"]');
    let itemPropDesc = document.querySelector('meta[itemprop="description"]');
    let itemPropImage = document.querySelector('meta[itemprop="image"]');
    
    if (!itemPropName) {
      itemPropName = document.createElement('meta');
      itemPropName.setAttribute('itemprop', 'name');
      document.head.appendChild(itemPropName);
    }
    if (!itemPropDesc) {
      itemPropDesc = document.createElement('meta');
      itemPropDesc.setAttribute('itemprop', 'description');
      document.head.appendChild(itemPropDesc);
    }
    if (!itemPropImage) {
      itemPropImage = document.createElement('meta');
      itemPropImage.setAttribute('itemprop', 'image');
      document.head.appendChild(itemPropImage);
    }
    
    itemPropName.setAttribute('content', `${currentBrand.name} · ${product.name}`);
    itemPropDesc.setAttribute('content', `${currentBrand.description} | ${product.description.slice(0, 100)}`);
    itemPropImage.setAttribute('content', product.image);
  };

  // 处理支付
  const handlePayment = async () => {
    if (!product) return;
    
    // 如果在微信内，显示引导提示
    if (isInWechat) {
      setShowWechatGuide(true);
      return;
    }
    
    setLoading(true);
    
    try {
      // 调用真实的订单创建 API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          payType: selectedChannel.code,
          buyerName: '',
          buyerPhone: ''
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrderId(data.orderId);
        setPayUrl(data.payUrl);
        setOrderStatus('pending');
        
        // 保存支付信息（用于微信跳转后恢复）
        savePaymentInfo({
          payUrl: data.payUrl,
          orderId: data.orderId,
          productId: product.id,
          amount: product.price
        });
        
        // 跳转到支付页面
        window.location.href = data.payUrl;
      } else {
        const error = await response.json();
        console.error('Order creation failed:', error);
        setOrderStatus('failed');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      setOrderStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  // 复制链接
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('链接已复制');
    setShowShareMenu(false);
  };

  // 关闭微信引导
  const closeWechatGuide = () => {
    setShowWechatGuide(false);
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">商品不存在或已下架</p>
          <button 
            onClick={() => window.history.back()} 
            className="mt-4 text-blue-600 text-sm"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* 顶部导航栏 - 使用模板主题色 */}
      <header className="sticky top-0 bg-white border-b z-40" style={{ borderBottomColor: currentBrand.themeColor }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {onClose && (
              <button onClick={onClose} className="p-1">
                <X size={20} className="text-gray-600" />
              </button>
            )}
            {/* 显示模板品牌图标和名称 */}
            <span className="text-lg">{currentBrand.icon}</span>
            <span className="font-semibold text-gray-900 truncate max-w-[150px]">
              {currentBrand.name}
            </span>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600 truncate max-w-[120px]">
              {product.name}
            </span>
          </div>
          <button 
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Share2 size={20} className="text-gray-600" />
          </button>
        </div>
        
        {/* 分享菜单 */}
        {showShareMenu && (
          <div className="absolute right-4 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 w-40">
            <button 
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Copy size={16} />
              复制链接
            </button>
          </div>
        )}
      </header>

      {/* 商品图片 */}
      <div className="relative aspect-square bg-gray-200">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {product.originalPrice > product.price && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded">
            限时特惠
          </div>
        )}
      </div>

      {/* 商品信息 */}
      <div className="bg-white px-4 py-4 mb-2">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-red-500">¥{product.price.toFixed(2)}</span>
          {product.originalPrice > product.price && (
            <span className="text-sm text-gray-400 line-through">
              ¥{product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
        
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
          <span>已售 {product.sales} 件</span>
          <span>库存 {product.stock} 件</span>
          <span>极速发货</span>
        </div>
      </div>

      {/* 支付方式选择 */}
      <div className="bg-white px-4 py-4">
        <h3 className="font-semibold text-gray-900 mb-3">选择支付方式</h3>
        <div className="space-y-2">
          {PAYMENT_CHANNELS.map((channel) => (
            <button
              key={channel.code}
              onClick={() => setSelectedChannel(channel)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                selectedChannel.code === channel.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{channel.icon}</span>
              <span className="flex-1 text-left font-medium">{channel.name}</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedChannel.code === channel.code
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {selectedChannel.code === channel.code && (
                  <CheckCircle2 size={14} className="text-white" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        {/* 微信环境提示 */}
        {isInWechat && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              ⚠️ 检测到您正在{browserType}内浏览，支付可能受限。
              <br />
              请点击右上角菜单，选择「在浏览器中打开」完成支付。
            </p>
          </div>
        )}
      </div>

      {/* 订单状态提示 */}
      {orderStatus === 'pending' && (
        <div className="bg-white px-4 py-4 mt-2">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Clock size={20} className="text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-900">订单待支付</p>
              <p className="text-xs text-blue-600">订单号: {orderId}</p>
            </div>
          </div>
        </div>
      )}

      {/* 底部支付栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4 z-40">
        <div className="flex-1">
          <div className="text-xs text-gray-500">应付金额</div>
          <div className="text-xl font-bold text-red-500">¥{product.price.toFixed(2)}</div>
        </div>
        <button
          onClick={handlePayment}
          disabled={loading}
          className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
          }`}
        >
          {loading ? '处理中...' : orderStatus === 'pending' ? '继续支付' : '立即支付'}
        </button>
      </div>

      {/* 微信引导遮罩层 */}
      {showWechatGuide && (
        <div 
          className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center"
          onClick={closeWechatGuide}
        >
          {/* 右上角箭头指示 */}
          <div className="absolute top-4 right-6">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <path 
                d="M60 10 L60 50 L40 30" 
                stroke="white" 
                strokeWidth="3" 
                fill="none" 
                strokeLinecap="round"
              />
              <circle cx="60" cy="10" r="4" fill="white" />
            </svg>
          </div>
          
          {/* 提示内容 */}
          <div className="mt-20 text-center text-white px-8">
            <h2 className="text-xl font-bold mb-4">请在浏览器中打开</h2>
            <p className="text-gray-300 leading-relaxed">
              点击右上角 <span className="font-bold text-white">···</span> 或 <span className="font-bold text-white">⋮</span>
            </p>
            <p className="text-gray-300 mt-2">
              选择 <span className="font-bold text-white">「在浏览器中打开」</span> 完成支付
            </p>
          </div>
          
          {/* 操作示意图 */}
          <div className="mt-10 bg-white/10 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-4 text-white">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                  <span className="text-2xl">1</span>
                </div>
                <span className="text-xs">点击右上角</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                  <span className="text-2xl">2</span>
                </div>
                <span className="text-xs">选择浏览器</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                  <span className="text-2xl">3</span>
                </div>
                <span className="text-xs">完成支付</span>
              </div>
            </div>
          </div>
          
          {/* 底部说明 */}
          <div className="absolute bottom-10 text-center text-gray-500 text-sm px-8">
            <p>微信内无法直接调起外部支付链接</p>
            <p className="mt-1">使用外部浏览器可确保支付成功</p>
          </div>
          
          {/* 关闭按钮 */}
          <button 
            onClick={closeWechatGuide}
            className="absolute bottom-24 bg-white/20 text-white px-6 py-2 rounded-full text-sm"
          >
            我知道了
          </button>
        </div>
      )}
    </div>
  );
}
