/**
 * 默认模板 - 2026 酸性渐变风格
 * 特点：颗粒质感、大胆渐变、几何装饰
 */

import { Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect, truncateText } from '../utils';
import path from 'path';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 900;

// Logo路径
const LOGO_PATH = path.join(process.cwd(), 'public/logos/default.png');

// 绘制几何装饰元素
function drawGeometricShapes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 左上角三角形
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(100, 0);
  ctx.lineTo(0, 100);
  ctx.closePath();
  ctx.fill();
  
  // 右下角圆形
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(w - 60, h - 60, 50, 0, Math.PI * 2);
  ctx.fill();
}

export async function renderDefaultTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 多色渐变背景
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#667eea');
  grad.addColorStop(0.5, '#764ba2');
  grad.addColorStop(1, '#f093fb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  
  // 添加几何装饰
  drawGeometricShapes(ctx, w, h);

  // 毛玻璃卡片效果 - 顶部信息区
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, 25, 25, w - 50, 120, 24);
  ctx.fill();
  
  // Logo
  try {
    const logoImg: any = await safeLoadImage(LOGO_PATH);
    ctx.drawImage(logoImg as Image, 40, 35, 100, 40);
  } catch (e) {
    drawHeavyText(ctx, '精选好物', 50, 65, '#667eea', 28);
  }
  
  // 商品名称
  drawHeavyText(ctx, truncateText(ctx, data.name || '精选好物', w - 180), 150, 70, '#1a1a2e', 26);
  
  // 价格
  drawHeavyText(ctx, `¥${data.price.toFixed(2)}`, 50, 125, '#667eea', 40);

  // 商品图片
  try {
    const img: any = await safeLoadImage(data.image);
    
    // 投影效果
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;
    
    ctx.save();
    roundRect(ctx, 25, 165, w - 50, 380, 24);
    ctx.clip();
    ctx.drawImage(img as Image, 25, 165, w - 50, 380);
    ctx.restore();
    
    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } catch (e) {
    drawImageError(ctx, 25, 165, w - 50, 380, data.image);
  }

  // 描述文字
  if (data.description) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, 25, 565, w - 50, 80, 16);
    ctx.fill();
    drawNormalText(ctx, truncateText(ctx, data.description, w - 80), 45, 610, '#4a4a6a', 18);
  }

  // 二维码区域
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    
    // 白色卡片背景
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, w/2 - 85, 665, 170, 200, 20);
    ctx.fill();
    
    // 二维码
    ctx.drawImage(qr as Image, w/2 - 60, 685, 100, 100);
    
    // 扫码提示
    drawHeavyText(ctx, '扫码购买', w/2, 820, '#667eea', 18, 'center');
    drawNormalText(ctx, '安全支付', w/2, 845, '#999999', 12, 'center');
  } catch (e) { /* 图片加载失败 */ }

  // 品牌标识 - 右下角
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, w - 130, h - 40, 110, 28, 14);
  ctx.fill();
  drawNormalText(ctx, '精选好物', w - 75, h - 26, '#FFFFFF', 12, 'center');

  return canvas.toBuffer('image/png');
}
