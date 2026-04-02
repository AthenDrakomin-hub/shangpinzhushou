/**
 * 携程模板 - 2026 旅行场景风格
 * 特点：蓝天白云背景、旅行元素、场景感强
 */

import { Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect, truncateText } from '../utils';
import path from 'path';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 900;

// Logo路径
const LOGO_PATH = path.join(process.cwd(), 'public/logos/ctrip.png');

// 绘制云朵装饰
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
  ctx.arc(x + size * 1.5, y, size * 0.9, 0, Math.PI * 2);
  ctx.fill();
}

export async function renderCtripTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 天空渐变背景
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#4A90E2');
  skyGrad.addColorStop(0.5, '#87CEEB');
  skyGrad.addColorStop(1, '#F8F9FA');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);
  
  // 云朵装饰
  drawCloud(ctx, 80, 120, 35);
  drawCloud(ctx, w - 120, 80, 40);
  drawCloud(ctx, w/2, 150, 30);

  // 顶部品牌条 - 携程蓝
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#0066CC');
  grad.addColorStop(1, '#0088FF');
  ctx.fillStyle = grad;
  roundRect(ctx, 20, 15, w - 40, 80, 40);
  ctx.fill();
  
  // 携程Logo
  try {
    const logoImg: any = await safeLoadImage(LOGO_PATH);
    ctx.drawImage(logoImg as Image, 35, 25, 140, 55);
  } catch (e) {
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 35, 25, 50, 50, 25);
    ctx.fill();
    drawHeavyText(ctx, 'C', 60, 58, '#0066CC', 32, 'center');
    drawHeavyText(ctx, '携程旅行', 100, 55, '#FFFFFF', 26);
  }
  
  drawNormalText(ctx, '说走就走', w - 130, 55, '#FFFFFF', 16);

  // 白色内容卡片
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 20, 110, w - 40, 380, 20);
  ctx.fill();
  
  // 投影
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 8;

  // 商品图片
  try {
    const img: any = await safeLoadImage(data.image);
    ctx.save();
    roundRect(ctx, 32, 120, w - 64, 240, 16);
    ctx.clip();
    ctx.drawImage(img as Image, 32, 120, w - 64, 240);
    ctx.restore();
  } catch (e) {
    drawImageError(ctx, 32, 120, w - 64, 240, data.image);
  }
  
  // 重置阴影
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 商品名称
  drawHeavyText(ctx, truncateText(ctx, data.name || '精选旅行', w - 64), 32, 400, '#1a1a1a', 28);
  
  // 价格
  const currentPriceText = `¥${data.price.toFixed(2)}`;
  drawHeavyText(ctx, currentPriceText, 32, 455, '#FF7D13', 46);
  
  ctx.font = 'bold 46px sans-serif';
  const currentPriceWidth = ctx.measureText(currentPriceText).width;
  
  // 原价
  if (data.originalPrice && data.originalPrice > data.price) {
    ctx.fillStyle = '#999999';
    ctx.font = '18px sans-serif';
    const origPriceText = `原价 ¥${data.originalPrice.toFixed(2)}`;
    ctx.fillText(origPriceText, 32 + currentPriceWidth + 15, 455);
    
    // 删除线
    const origPriceWidth = ctx.measureText(origPriceText).width;
    ctx.beginPath();
    ctx.moveTo(32 + currentPriceWidth + 15, 450);
    ctx.lineTo(32 + currentPriceWidth + 15 + origPriceWidth, 450);
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    drawNormalText(ctx, '起', 32 + currentPriceWidth + 10, 455, '#999999', 18);
  }
  
  // 出发地标签
  if (data.description) {
    ctx.fillStyle = '#E3F2FD';
    roundRect(ctx, 32, 475, 200, 28, 14);
    ctx.fill();
    drawNormalText(ctx, truncateText(ctx, data.description, 30), 42, 493, '#0066CC', 13);
  }

  // 服务标签
  const services = ['低价保障', '退改无忧', '出票保障'];
  let serviceX = 32;
  services.forEach(service => {
    ctx.fillStyle = '#FFF8E1';
    roundRect(ctx, serviceX, 520, 180, 32, 16);
    ctx.fill();
    drawNormalText(ctx, service, serviceX + 90, 540, '#FF8F00', 13, 'center');
    serviceX += 195;
  });

  // 二维码区域
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    
    // 蓝色渐变背景
    const qrGrad = ctx.createLinearGradient(0, 580, w, 710);
    qrGrad.addColorStop(0, '#0066CC');
    qrGrad.addColorStop(1, '#0088FF');
    ctx.fillStyle = qrGrad;
    roundRect(ctx, 20, 580, w - 40, 300, 20);
    ctx.fill();
    
    // 二维码
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 40, 600, 140, 140, 12);
    ctx.fill();
    ctx.drawImage(qr as Image, 50, 610, 120, 120);
  } catch (e) { /* 图片加载失败 */ }
  
  // CTA 文字
  drawHeavyText(ctx, '扫码立即预订', 210, 660, '#FFFFFF', 24);
  drawNormalText(ctx, '全球旅行 · 品质保障', 210, 695, '#FFFFFF', 14);
  drawNormalText(ctx, '携程在手 · 说走就走', 210, 720, 'rgba(255,255,255,0.7)', 12);

  return canvas.toBuffer('image/png');
}
