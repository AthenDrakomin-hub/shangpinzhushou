/**
 * 美团模板 - 2026 生活气息风格
 * 特点：标签云、促销角标、温暖配色
 */

import { Canvas, SKRSContext2D as CanvasRenderingContext2D, Image } from '@napi-rs/canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect, truncateText, drawImageCover, drawImageSmart } from '../utils';
import path from 'path';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 900;

// Logo路径
const LOGO_PATH = path.join(process.cwd(), 'public/logos/meituan.png');

// 绘制促销角标
function drawCornerBadge(ctx: CanvasRenderingContext2D, text: string) {
  const w = POSTER_WIDTH;
  ctx.fillStyle = '#FF4700';
  
  // 三角形角标
  ctx.beginPath();
  ctx.moveTo(w - 100, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, 100);
  ctx.closePath();
  ctx.fill();
  
  // 文字
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(w - 45, 45);
  ctx.rotate(Math.PI / 4);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// 绘制标签云
function drawTagCloud(ctx: CanvasRenderingContext2D, tags: string[], startX: number, y: number) {
  const colors = ['#FFD100', '#FF6B00', '#00C853', '#2979FF'];
  let x = startX;
  
  tags.forEach((tag, index) => {
    const color = colors[index % colors.length];
    ctx.fillStyle = color;
    roundRect(ctx, x, y, 80, 28, 14);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tag, x + 40, y + 18);
    
    x += 90;
  });
}

export async function renderMeituanTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 浅灰背景
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(0, 0, w, h);
  
  // 顶部黄色装饰条
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#FFD100');
  grad.addColorStop(1, '#FFB800');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, w, 10, [0, 0, 0, 0]);
  ctx.fill();

  // 白色主卡片
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 10, w, h - 10);
  
  // 促销角标
  drawCornerBadge(ctx, '限时秒杀');

  // 商品图片 - 全宽
  try {
    const img: any = await safeLoadImage(data.image);
    drawImageSmart(ctx, img, 0, 10, w, 380);

    // 图片底部渐变遮罩
    const imgGrad = ctx.createLinearGradient(0, 320, 0, 390);
    imgGrad.addColorStop(0, 'transparent');
    imgGrad.addColorStop(1, '#FFF');
    ctx.fillStyle = imgGrad;
    ctx.fillRect(0, 320, w, 70);
  } catch (e) {
    drawImageError(ctx, 0, 10, w, 380, data.image);
  }

  // 品牌标识栏 - 使用美团logo
  try {
    const logoImg: any = await safeLoadImage(LOGO_PATH);
    // logo白色背景
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 20, 400, 140, 45, 22);
    ctx.fill();
    ctx.drawImage(logoImg as Image, 30, 408, 120, 30);
  } catch (e) {
    ctx.fillStyle = '#FFD100';
    roundRect(ctx, 20, 400, 140, 45, 22);
    ctx.fill();
    drawHeavyText(ctx, '美团', 55, 430, '#000000', 24, 'center');
    drawNormalText(ctx, '优选', 110, 430, '#000000', 18);
  }

  // 商品名称
  drawHeavyText(ctx, truncateText(ctx, data.name || '精选好物', w - 180), 180, 430, '#1a1a1a', 26);
  
  // 标签云
  const tags = ['爆款直降', '今日特价', '满减优惠'];
  drawTagCloud(ctx, tags, 20, 470);

  // 价格区域
  const priceY = 530;
  
  // 现价
  drawHeavyText(ctx, `¥${data.price.toFixed(2)}`, 24, priceY, '#FF4700', 56);
  
  // 原价和折扣标签
  if (data.originalPrice && data.originalPrice > data.price) {
    const priceText = `原价 ¥${data.originalPrice.toFixed(2)}`;
    ctx.fillStyle = '#999999';
    ctx.font = '18px sans-serif';
    ctx.fillText(priceText, 24, priceY + 30);
    
    // 折扣标签
    const discount = Math.round((data.price / data.originalPrice) * 10);
    ctx.fillStyle = '#FF4700';
    const tagX = 24 + ctx.measureText(priceText).width + 12;
    roundRect(ctx, tagX, priceY + 8, 45, 26, 8);
    ctx.fill();
    drawNormalText(ctx, `${discount}折`, tagX + 22, priceY + 26, '#FFFFFF', 13, 'center');
  }

  // 分隔线
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 600);
  ctx.lineTo(w - 20, 600);
  ctx.stroke();

  // 服务承诺
  const services = ['准时达', '正品保障', '随时退'];
  let serviceX = 20;
  services.forEach(service => {
    ctx.fillStyle = '#F5F5F5';
    roundRect(ctx, serviceX, 620, 190, 35, 10);
    ctx.fill();
    drawNormalText(ctx, service, serviceX + 95, 642, '#666666', 14, 'center');
    serviceX += 205;
  });

  // 二维码区域
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    
    // 浅黄背景
    ctx.fillStyle = '#FFF9E6';
    roundRect(ctx, 20, 680, w - 40, 200, 16);
    ctx.fill();
    
    // 二维码
    ctx.drawImage(qr as Image, 40, 700, 120, 120);
  } catch (e) { /* 图片加载失败 */ }
  
  // 品牌标识和CTA
  drawHeavyText(ctx, '美团优选', 180, 740, '#FFD100', 26);
  drawNormalText(ctx, '美好生活小帮手', 180, 770, '#999999', 14);
  
  // CTA 按钮
  ctx.fillStyle = '#FF4700';
  roundRect(ctx, 180, 790, 180, 45, 22);
  ctx.fill();
  drawHeavyText(ctx, '扫码立即购买', 270, 820, '#FFFFFF', 18, 'center');

  return canvas.toBuffer('image/png');
}
