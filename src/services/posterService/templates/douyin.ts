/**
 * 抖音模板 - 2026 赛博朋克故障风格
 * 特点：故障艺术、霓虹灯管、酸性色彩
 */

import { Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect, truncateText } from '../utils';
import path from 'path';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 900;

// Logo路径
const LOGO_PATH = path.join(process.cwd(), 'public/logos/douyin.png');

// 霓虹灯管效果
function drawNeonBorder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

export async function renderDouyinTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 深色渐变背景
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0A0A0A');
  grad.addColorStop(0.5, '#1a1a2e');
  grad.addColorStop(1, '#0f0f23');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  
  // 背景网格线
  ctx.strokeStyle = 'rgba(254, 44, 85, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < h; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }

  // 商品图片卡片
  try {
    const img: any = await safeLoadImage(data.image);
    
    // 白色外框
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 20, 20, w - 40, 380, 20);
    ctx.fill();
    
    ctx.save();
    roundRect(ctx, 28, 28, w - 56, 364, 16);
    ctx.clip();
    ctx.drawImage(img as Image, 28, 28, w - 56, 364);
    ctx.restore();
    
    // 霓虹边框
    drawNeonBorder(ctx, 18, 18, w - 36, 384, '#FE2C55');
  } catch (e) {
    drawImageError(ctx, 20, 20, w - 40, 380, data.image);
  }

  // 抖音 Logo
  try {
    const logoImg: any = await safeLoadImage(LOGO_PATH);
    ctx.drawImage(logoImg as Image, 30, 420, 160, 50);
  } catch (e) {
    ctx.fillStyle = '#000000';
    roundRect(ctx, 30, 420, 160, 50, 25);
    ctx.fill();
    drawHeavyText(ctx, '抖音好物', 50, 452, '#FFFFFF', 22);
  }

  // 商品名称
  drawHeavyText(ctx, truncateText(ctx, data.name || '潮流好物', w - 60), 30, 510, '#FFFFFF', 32);
  
  // 价格 - 霓虹效果
  ctx.shadowColor = '#FE2C55';
  ctx.shadowBlur = 20;
  drawHeavyText(ctx, `¥${data.price.toFixed(2)}`, 30, 580, '#FE2C55', 56);
  ctx.shadowBlur = 0;

  // 二维码区域
  ctx.fillStyle = '#000000';
  roundRect(ctx, 20, 630, w - 40, 250, 20);
  ctx.fill();
  
  // 霓虹边框
  drawNeonBorder(ctx, 22, 632, w - 44, 246, '#00F0FF');
  
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    // 白色二维码背景
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 40, 650, 140, 140, 12);
    ctx.fill();
    ctx.drawImage(qr as Image, 50, 660, 120, 120);
  } catch (e) { /* 图片加载失败 */ }
  
  // 扫码提示
  drawHeavyText(ctx, '扫码抢购', 210, 700, '#FFFFFF', 28);
  drawNormalText(ctx, '限量秒杀', 210, 735, '#FE2C55', 18);
  drawNormalText(ctx, '手慢无', 210, 760, '#00F0FF', 18);
  
  // 底部装饰线
  const lineGrad = ctx.createLinearGradient(30, 860, w - 30, 860);
  lineGrad.addColorStop(0, '#FE2C55');
  lineGrad.addColorStop(0.5, '#00F0FF');
  lineGrad.addColorStop(1, '#FE2C55');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(30, 855, w - 60, 4);

  return canvas.toBuffer('image/png');
}
