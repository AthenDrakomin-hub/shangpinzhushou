/**
 * 饿了么模板 - 2026 美食蒸汽风格
 * 特点：食物蒸汽效果、配送标签、清爽蓝色
 */

import { Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect, truncateText } from '../utils';
import path from 'path';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 900;

// Logo路径
const LOGO_PATH = path.join(process.cwd(), 'public/logos/eleme.png');

// 绘制蒸汽效果
function drawSteam(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  for (let i = 0; i < 5; i++) {
    const steamX = x + Math.random() * width;
    const steamY = y - Math.random() * 60;
    const radius = 8 + Math.random() * 15;
    
    const grad = ctx.createRadialGradient(steamX, steamY, 0, steamX, steamY, radius);
    grad.addColorStop(0, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(steamX, steamY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export async function renderElemeTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 白色背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // 顶部蓝色渐变条
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#1e88e5');
  grad.addColorStop(1, '#42a5f5');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, w, 85, [0, 0, 30, 30]);
  ctx.fill();
  
  // 品牌 Logo - 加载饿了么logo
  try {
    const logoImg: any = await safeLoadImage(LOGO_PATH);
    ctx.drawImage(logoImg as Image, 20, 15, 120, 55);
  } catch (e) {
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 20, 15, 120, 55, 27);
    ctx.fill();
    drawHeavyText(ctx, 'e', 50, 48, '#00AAEE', 36, 'center');
    drawNormalText(ctx, '饿了么', 95, 45, '#00AAEE', 20);
  }
  
  drawNormalText(ctx, '送餐快 品质好', w - 140, 50, '#FFFFFF', 16);

  // 商品图片
  try {
    const img: any = await safeLoadImage(data.image);
    
    ctx.save();
    roundRect(ctx, 20, 100, w - 40, 300, 20);
    ctx.clip();
    ctx.drawImage(img as Image, 20, 100, w - 40, 300);
    ctx.restore();
    
    // 蒸汽效果
    drawSteam(ctx, 20, 100, w - 40);
  } catch (e) {
    drawImageError(ctx, 20, 100, w - 40, 300, data.image);
  }
  
  // 配送标签
  ctx.fillStyle = '#1e88e5';
  roundRect(ctx, 20, 420, 100, 30, 15);
  ctx.fill();
  drawNormalText(ctx, '准时达', 70, 438, '#FFFFFF', 14, 'center');
  
  // 满减标签
  ctx.fillStyle = '#FF5339';
  roundRect(ctx, 135, 420, 110, 30, 15);
  ctx.fill();
  drawNormalText(ctx, '满30减15', 190, 438, '#FFFFFF', 13, 'center');

  // 商品名称
  drawHeavyText(ctx, truncateText(ctx, data.name || '美味佳肴', w - 40), 20, 490, '#1a1a1a', 30);
  
  // 价格区域
  drawHeavyText(ctx, `¥${data.price.toFixed(2)}`, 20, 545, '#FF5339', 48);
  
  // 原价
  if (data.originalPrice && data.originalPrice > data.price) {
    ctx.fillStyle = '#999999';
    ctx.font = '18px sans-serif';
    const priceText = `¥${data.originalPrice.toFixed(2)}`;
    ctx.fillText(priceText, 20 + ctx.measureText(`¥${data.price.toFixed(2)}`).width + 12, 545);
  }
  
  // 月售数量
  drawNormalText(ctx, '月售 1000+', w - 120, 545, '#666666', 14);

  // 分隔线
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 590);
  ctx.lineTo(w - 20, 590);
  ctx.stroke();

  // 商家信息
  drawNormalText(ctx, '品质商家 · 放心点餐', 20, 625, '#666666', 14);
  
  // 二维码区域
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    
    // 浅蓝背景
    ctx.fillStyle = '#E3F2FD';
    roundRect(ctx, 20, 660, w - 40, 220, 16);
    ctx.fill();
    
    // 二维码
    ctx.drawImage(qr as Image, 40, 680, 130, 130);
  } catch (e) { /* 图片加载失败 */ }
  
  // CTA 按钮
  ctx.fillStyle = '#1e88e5';
  roundRect(ctx, 200, 700, 200, 45, 22);
  ctx.fill();
  drawHeavyText(ctx, '扫码下单', 300, 728, '#FFFFFF', 20, 'center');
  
  // 品牌标语
  drawHeavyText(ctx, '饿了么', 200, 780, '#1e88e5', 22);
  drawNormalText(ctx, '最快30分钟送达', 200, 810, '#999999', 14);
  drawNormalText(ctx, '美好生活 触手可及', 200, 835, '#cccccc', 12);

  return canvas.toBuffer('image/png');
}
