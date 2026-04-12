import { fetchApi } from '../utils/apiClient';
import { useTranslation } from 'react-i18next';
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
  supported_pay_methods?: string;
}

interface PaymentChannel {
  id: string;
  name: string;
  channelCode: string;
  gateway: 'superpay' | 'jiujiu' | 'phpwc' | string;
  minAmount?: number;
  maxAmount?: number;
  icon?: string;
  color?: string;
  bgColor?: string;
}
interface H5ProductPageProps {
  productId?: string;
  onClose?: () => void;
}

export default function H5ProductPage({ productId, shareUid, onClose }: H5ProductPageProps) {
  const { t } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);

  // 加载支付渠道
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetchApi('/api/payment-channels');
        const data = await response.json();
        if (response.ok && Array.isArray(data)) {
          setPaymentChannels(data);
        }
      } catch (error) {
        console.error('Failed to fetch payment channels:', error);
      }
    };
    fetchChannels();
  }, []);

  // 根据商品配置和价格过滤可用的支付通道
  const getAvailableChannels = (price: number, supportedIds: string[]) => {
    return paymentChannels.filter(channel => {
      if (!supportedIds.includes(channel.id)) return false;
      const min = Number(channel.minAmount ?? channel.min_amount) || 0;
      const max = Number(channel.maxAmount ?? channel.max_amount) || Infinity;
      return price >= min && price <= max;
    });
  };

  const isWechatChannel = (channel: any) => channel.icon === 'wechat' || channel.gateway === 'wechat' || channel.gateway === 'jiujiu' || channel.channelCode?.toLowerCase().includes('wx') || channel.name.includes('微信');
  const isAlipayChannel = (channel: any) => channel.icon === 'alipay' || channel.gateway === 'alipay' || channel.gateway === 'superpay' || channel.channelCode?.toLowerCase().includes('ali') || channel.name.includes('支付宝');

  const getChannelIcon = (channel: any) => {
    if (isWechatChannel(channel)) {
      return (
        <div className="w-7 h-7 flex items-center justify-center bg-[#07c160] rounded-md shadow-sm">
          <svg viewBox="0 0 1024 1024" width="18" height="18" fill="white">
            <path d="M683.5 358.5c-20.5 0-38.5 13-43.5 32-1.5 5 0 10.5 3.5 14.5 10 11 16 26.5 16 43 0 35.5-32 64.5-71.5 64.5-22 0-42-9-54.5-24-3.5-4-8-5.5-13-4-19 5.5-38.5 8.5-59.5 8.5-115 0-208-81.5-208-181.5 0-100.5 93-181.5 208-181.5 115 0 208 81 208 181.5 0 18.5-3 36-9 53zM724.5 456.5c115 0 208 81 208 181.5s-93 181.5-208 181.5c-21 0-40.5-3-59.5-8.5-5-1.5-9.5 0-13 4-12.5 15-32.5 24-54.5 24-39.5 0-71.5-29-71.5-64.5 0-16.5 6-32 16-43 3.5-4 5-9.5 3.5-14.5-5-19-23-32-43.5-32-27.5 0-50-22.5-50-50 0-100.5 93-181.5 208-181.5z" />
          </svg>
        </div>
      );
    }
    if (isAlipayChannel(channel)) {
      return (
        <div className="w-7 h-7 flex items-center justify-center bg-[#1677ff] rounded-md shadow-sm">
          <svg viewBox="0 0 1024 1024" width="18" height="18" fill="white">
            <path d="M853.333 170.667h-682.666c-47.104 0-85.334 38.23-85.334 85.333v682.667c0 47.104 38.23 85.333 85.334 85.333h682.666c47.104 0 85.334-38.23 85.334-85.333v-682.667c0-47.104-38.23-85.333-85.334-85.333z m-543.146 267.733h127.018v-82.944h-95.274c-14.123 0-25.6-11.477-25.6-25.6s11.477-25.6 25.6-25.6h95.274v-44.544c0-14.123 11.478-25.6 25.6-25.6s25.6 11.477 25.6 25.6v44.544h125.824c14.123 0 25.6 11.477 25.6 25.6s-11.477 25.6-25.6 25.6h-125.824v82.944h157.056c14.123 0 25.6 11.477 25.6 25.6s-11.477 25.6-25.6 25.6h-152.022c-13.824 43.179-36.437 83.2-65.962 118.102 43.776 28.33 92.501 50.176 144.17 64.682 13.611 3.84 21.547 18.006 17.707 31.616-3.115 11.051-13.099 18.262-24.064 18.262-2.517 0-5.077-0.384-7.552-1.11-56.15-15.146-109.141-38.656-156.501-69.717-41.984 34.005-89.856 61.184-142.123 80.555-13.312 4.906-27.818-1.92-32.725-15.232-4.906-13.312 1.92-27.818 15.232-32.725 46.72-17.28 89.515-41.514 127.147-71.936a462.848 462.848 0 0 1-76.544-106.837v159.232c0 14.123-11.478 25.6-25.6 25.6s-25.6-11.477-25.6-25.6v-207.744c0-14.123 11.477-25.6 25.6-25.6z m287.403 169.259a412.8 412.8 0 0 0 47.573-94.72h-157.056c0.853 10.325 2.133 20.565 3.84 30.634 3.03 17.835-11.904 33.792-29.355 33.792-2.048 0-4.138-0.213-6.272-0.64-16.768-3.328-26.666-18.73-25.216-35.37-1.11-6.102-1.963-12.288-2.603-18.475-0.64-5.632-1.066-11.264-1.322-16.981-0.256-5.803-0.342-11.648-0.342-17.494v-25.77h184.747c14.123 0 25.6 11.477 25.6 25.6 0 1.28-0.085 2.56-0.298 3.84a357.547 357.547 0 0 1-44.544 94.464c-8.491 11.306-24.832 13.568-36.139 5.077-11.264-8.49-13.525-24.832-5.077-36.139z"/>
          </svg>
        </div>
      );
    }
    return <span className="text-2xl">{channel.icon}</span>;
  };

  const getChannelDisplayName = (channel: any) => {
    if (isWechatChannel(channel)) return '微信支付';
    if (isAlipayChannel(channel)) return '支付宝';
    return channel.name;
  };

  const availableChannels = product && product.supported_pay_methods
    ? getAvailableChannels(product.price, product.supported_pay_methods.split(','))
    : [];

  useEffect(() => {
    if (availableChannels.length > 0 && !selectedChannel) {
      setSelectedChannel(availableChannels[0]);
    } else if (availableChannels.length === 0) {
      setSelectedChannel(null);
    }
  }, [availableChannels, selectedChannel]);

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
        const response = await fetchApi(`/api/products/${productId}`);
        if (response.ok) {
          const data = await response.json();
          const loadedPrice = parseFloat(data.price);
          setProduct({
            id: data.id,
            name: data.name,
            price: loadedPrice,
            originalPrice: parseFloat(data.originalPrice || data.price),
            description: data.description || '',
            image: data.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400',
            sales: data.sales || 0,
            stock: data.stock || 100,
            status: data.status || 'active',
            supported_pay_methods: data.supported_pay_methods || ''
          });
          // getAvailableChannels uses paymentChannels state, which might not be loaded yet,
          // so the useEffect on availableChannels will set the selectedChannel later.
          // We can remove the logic here.
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
    if (!selectedChannel) {
      alert('无可用支付通道');
      return;
    }

    // 如果在微信内，显示引导提示
    if (isInWechat) {
      setShowWechatGuide(true);
      return;
    }

    setLoading(true);
    
    try {
      // 从 URL 获取分享者 ID
      const searchParams = new URLSearchParams(window.location.search);
      const shareUid = searchParams.get('uid');

      // 调用真实的订单创建 API
      const response = await fetchApi('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          payType: selectedChannel.id,
          shareUid,
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

        // 如果后端返回了 formHtml，说明需要表单 POST 提交（例如九久支付）
        if (data.formHtml) {
          const newWin = window.open('', '_self');
          if (newWin) {
            newWin.document.write(data.formHtml);
            newWin.document.close();
          }
        } else if (data.payUrl) {
          // 跳转到支付页面
          window.location.href = data.payUrl;
        }
      } else {
        const error = await response.json();
        console.error('Order creation failed:', error);
        alert(error.error || '下单失败，请稍后再试');
        setOrderStatus('failed');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      alert('网络请求失败或服务器错误，请稍后再试');
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-48">
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
          <span>{t('sold', '已售')} {product.sales} {t('items', '件')}</span>
          <span>{t('stock', '库存')} {product.stock} {t('items', '件')}</span>
          <span>{t('fast_shipping', '极速发货')}</span>
        </div>
      </div>

      {/* 支付方式选择 */}
      <div className="bg-white px-4 py-4">
        <h3 className="font-semibold text-gray-900 mb-3">{t('choose_payment_method', '选择支付方式')}</h3>
        {availableChannels.length === 0 ? (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-800 font-medium text-sm">该商品暂无可用支付通道</p>
              <p className="text-orange-600 text-xs mt-1">当前金额 (¥{product.price.toFixed(2)}) 无法下单，可能原因：</p>
              <p className="text-orange-600 text-xs mt-2 text-left">
                1. 商品未配置或未勾选任何支付通道。<br/>
                2. 商品金额未达到商户支付通道的最低/最高限额。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {availableChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  selectedChannel?.id === channel.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {getChannelIcon(channel)}
                <span className="flex-1 text-left font-medium">{getChannelDisplayName(channel)}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedChannel?.id === channel.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedChannel?.id === channel.id && (
                    <CheckCircle2 size={14} className="text-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

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
              <p className="text-sm font-medium text-blue-900">{t('order_pending', '订单待支付')}</p>
              <p className="text-xs text-blue-600">{t('order_number', '订单号')}: {orderId}</p>
            </div>
          </div>
        </div>
      )}

      {/* 底部支付栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4 z-40">
        <div className="flex-1">
          <div className="text-xs text-gray-500">{t('amount_to_pay', '应付金额')}</div>
          <div className="text-xl font-bold text-red-500">¥{product.price.toFixed(2)}</div>
        </div>
        <button
          onClick={handlePayment}
          disabled={loading || !selectedChannel || availableChannels.length === 0}
          className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${
            (loading || !selectedChannel || availableChannels.length === 0)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-[#FF4D4F] hover:bg-[#FF3333] active:bg-[#E60000]'
          }`}
          style={(loading || !selectedChannel || availableChannels.length === 0) ? {} : { backgroundColor: currentBrand.themeColor }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('processing', '处理中...')}
            </div>
          ) : orderStatus === 'pending' ? (
            t('continue_payment', '继续支付')
          ) : (
            t('pay_now', '立即支付')
          )}
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
