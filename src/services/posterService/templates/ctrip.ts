/**
 * 携程模板 - 2026 旅行场景风格
 * 特点：蓝天白云背景、旅行元素、场景感强
 */

import { Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, drawMultiLineText, roundRect, truncateText, drawImageCover, drawImageSmart } from '../utils';
import path from 'path';

const POSTER_WIDTH = 750;
const POSTER_HEIGHT = 1334;

export async function renderCtripTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 1. 深海蓝渐变背景 (携程高级感)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#0F2C59');
  bgGrad.addColorStop(1, '#051329');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 顶部光效
  const glow = ctx.createRadialGradient(w/2, 0, 0, w/2, 0, 600);
  glow.addColorStop(0, 'rgba(0, 134, 246, 0.4)');
  glow.addColorStop(1, 'rgba(0, 134, 246, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // 2. 主视觉图 (圆角超大图)
  try {
    const img: any = await safeLoadImage(data.image);
    ctx.save();
    roundRect(ctx, 40, 60, w - 80, 700, 32);
    ctx.clip();
    
    drawImageSmart(ctx, img, 40, 60, w - 80, 700);
    ctx.restore();

    // 底部渐变遮罩 (让文字更清晰)
    const imgGrad = ctx.createLinearGradient(0, 500, 0, 760);
    imgGrad.addColorStop(0, 'transparent');
    imgGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = imgGrad;
    roundRect(ctx, 40, 500, w - 80, 260, [0, 0, 32, 32]);
    ctx.fill();
  } catch (e) {
    drawImageError(ctx, 40, 60, w - 80, 700, data.image);
  }

  // 3. 悬浮标题卡片
  drawMultiLineText(ctx, data.name || '豪华精选', 70, 640, w - 140, 50, 2, '#FFFFFF', 40, 'left');

  // 4. 价格模块 (金卡风格)
  const infoY = 800;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, 40, infoY, w - 80, 200, 24);
  ctx.fill();
  ctx.stroke();

  // 金色渐变价格
  const goldGrad = ctx.createLinearGradient(0, infoY + 60, 0, infoY + 120);
  goldGrad.addColorStop(0, '#F9D490');
  goldGrad.addColorStop(1, '#E2B155');

  drawHeavyText(ctx, '¥', 70, infoY + 70, '#F9D490', 36);
  ctx.fillStyle = goldGrad;
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(data.price.toFixed(2), 105, infoY + 70);

  // 原价
  if (data.originalPrice && data.originalPrice > data.price) {
    const priceTextWidth = ctx.measureText(data.price.toFixed(2)).width;
    const origX = 105 + priceTextWidth + 20;
    
    ctx.font = '24px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(`原价 ¥${data.originalPrice.toFixed(2)}`, origX, infoY + 60);
    
    // 删除线
    const origWidth = ctx.measureText(`原价 ¥${data.originalPrice.toFixed(2)}`).width;
    ctx.beginPath();
    ctx.moveTo(origX - 2, infoY + 52);
    ctx.lineTo(origX + origWidth + 2, infoY + 52);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 描述文字
  if (data.description) {
    drawMultiLineText(ctx, data.description, 70, infoY + 130, w - 140, 34, 2, 'rgba(255, 255, 255, 0.6)', 22, 'left');
  }

  // 5. 底部二维码
  const bottomY = h - 260;
  
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 40, bottomY, 180, 180, 16);
    ctx.fill();
    ctx.drawImage(qr as Image, 50, bottomY + 10, 160, 160);
  } catch (e) { /* 图片加载失败 */ }

  drawHeavyText(ctx, '长按识别小程序码', 250, bottomY + 60, '#FFFFFF', 32);
  drawNormalText(ctx, '即刻探索更多惊喜特惠', 250, bottomY + 110, 'rgba(255, 255, 255, 0.6)', 22);

  // 蓝色强调按钮
  ctx.fillStyle = '#0086F6';
  roundRect(ctx, 250, bottomY + 140, 140, 40, 20);
  ctx.fill();
  drawHeavyText(ctx, '立即抢购', 320, bottomY + 167, '#FFFFFF', 16, 'center');

  return canvas.toBuffer('image/png');
}
