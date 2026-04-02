/**
 * 海报生成服务 - 类型定义
 */

// 模板类型
export type PosterTemplate = 'default' | 'daifu' | 'meituan' | 'eleme' | 'jd' | 'ctrip' | 'douyin' | 'kuaishou';

// 海报数据接口
export interface PosterData {
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  image: string;
  qrUrl: string;
}

// 模板配置接口
export interface TemplateConfig {
  id: PosterTemplate;
  name: string;
  slogan: string;
  primaryColor: string;
  secondaryColor: string;
  priceColor: string;
  // H5 页面变身配置
  h5Title: string;
  h5Description: string;
  h5Icon: string;
  h5ThemeColor: string;
}

// 所有模板配置
export const TEMPLATE_CONFIG: Record<PosterTemplate, TemplateConfig> = {
  default: { 
    id: 'default',
    name: '默认', 
    slogan: '精选好物',
    primaryColor: '#667eea', 
    secondaryColor: '#764ba2', 
    priceColor: '#ffffff',
    h5Title: '精选商品',
    h5Description: '发现美好生活',
    h5Icon: '✨',
    h5ThemeColor: '#667eea'
  },
  daifu: { 
    id: 'daifu',
    name: '代付', 
    slogan: '好友代付更轻松',
    primaryColor: '#FFC107', 
    secondaryColor: '#FF9800', 
    priceColor: '#FF5722',
    h5Title: '帮我代付',
    h5Description: '好友帮忙，温暖人心',
    h5Icon: '💰',
    h5ThemeColor: '#FFC107'
  },
  meituan: { 
    id: 'meituan',
    name: '美团', 
    slogan: '吃喝玩乐全都有',
    primaryColor: '#FFD100', 
    secondaryColor: '#FFB800', 
    priceColor: '#FF4700',
    h5Title: '美团优选',
    h5Description: '美好生活小帮手',
    h5Icon: '🟡',
    h5ThemeColor: '#FFD100'
  },
  eleme: { 
    id: 'eleme',
    name: '饿了么', 
    slogan: '美食外卖准时达',
    primaryColor: '#1e88e5', 
    secondaryColor: '#42a5f5', 
    priceColor: '#FF5339',
    h5Title: '饿了么订餐',
    h5Description: '送餐快，品质好',
    h5Icon: '🔵',
    h5ThemeColor: '#1e88e5'
  },
  jd: { 
    id: 'jd',
    name: '京东', 
    slogan: '多快好省',
    primaryColor: '#e4393c', 
    secondaryColor: '#ff6b6b', 
    priceColor: '#e4393c',
    h5Title: '京东好物',
    h5Description: '正品保障·极速达',
    h5Icon: '🔴',
    h5ThemeColor: '#e4393c'
  },
  ctrip: { 
    id: 'ctrip',
    name: '携程', 
    slogan: '旅行预订更省心',
    primaryColor: '#0066CC', 
    secondaryColor: '#0088FF', 
    priceColor: '#FF7D13',
    h5Title: '携程旅行',
    h5Description: '说走就走的旅行',
    h5Icon: '🔷',
    h5ThemeColor: '#0066CC'
  },
  douyin: { 
    id: 'douyin',
    name: '抖音', 
    slogan: '记录美好生活',
    primaryColor: '#FE2C55', 
    secondaryColor: '#000000', 
    priceColor: '#FE2C55',
    h5Title: '抖音好物',
    h5Description: '潮流前线',
    h5Icon: '🎵',
    h5ThemeColor: '#FE2C55'
  },
  kuaishou: { 
    id: 'kuaishou',
    name: '快手', 
    slogan: '拥抱每一种生活',
    primaryColor: '#FF4906', 
    secondaryColor: '#FF6A00', 
    priceColor: '#FF4906',
    h5Title: '快手小店',
    h5Description: '源头好物推荐',
    h5Icon: '⚡',
    h5ThemeColor: '#FF4906'
  }
};

// 获取模板配置
export function getTemplateConfig(template: PosterTemplate): TemplateConfig {
  return TEMPLATE_CONFIG[template];
}

// 获取所有模板列表
export function getTemplateList(): Omit<TemplateConfig, 'h5Title' | 'h5Description' | 'h5Icon' | 'h5ThemeColor'>[] {
  return Object.values(TEMPLATE_CONFIG).map(config => ({
    id: config.id,
    name: config.name,
    slogan: config.slogan,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    priceColor: config.priceColor
  }));
}
