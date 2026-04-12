/**
 * 默认模板 - 2026 酸性渐变风格
 * 特点：颗粒质感、大胆渐变、几何装饰
 */

import { Canvas, SKRSContext2D as CanvasRenderingContext2D, Image } from '@napi-rs/canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, drawMultiLineText, roundRect, truncateText } from '../utils';

const POSTER_WIDTH = 750;
const POSTER_HEIGHT = 1200;

export async function renderDefaultTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 1. 渐变背景 (现代弥散光风格)
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#fdfbfb');
  bgGrad.addColorStop(1, '#ebedee');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 装饰性光晕
  const glow1 = ctx.createRadialGradient(w, 0, 0, w, 0, 400);
  glow1.addColorStop(0, 'rgba(102, 126, 234, 0.15)');
  glow1.addColorStop(1, 'rgba(102, 126, 234, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, w, h);

  const glow2 = ctx.createRadialGradient(0, h, 0, 0, h, 400);
  glow2.addColorStop(0, 'rgba(118, 75, 162, 0.1)');
  glow2.addColorStop(1, 'rgba(118, 75, 162, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);

  // 2. 主商品卡片 (拟物化玻璃态阴影)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 40, 60, w - 80, h - 120, 32);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // 3. 顶部 Header
  ctx.fillStyle = '#f8f9fa';
  roundRect(ctx, 40, 60, w - 80, 80, [32, 32, 0, 0]);
  ctx.fill();
  drawHeavyText(ctx, 'SUPER SELECTION', 80, 110, '#333333', 20);
  drawNormalText(ctx, '精选好物 每日推荐', w - 80 - 150, 110, '#888888', 16);

  // 4. 商品主图 (大比例展示)
  try {
    const img: any = await safeLoadImage(data.image);
    // 裁剪区域 (1:1 方图)
    ctx.save();
    roundRect(ctx, 40, 140, w - 80, w - 80, 0);
    ctx.clip();
    
    // 按比例填充图片
    const imgW = (img as Image).width;
    const imgH = (img as Image).height;
    const scale = Math.max((w - 80) / imgW, (w - 80) / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const dx = 40 + ((w - 80) - drawW) / 2;
    const dy = 140 + ((w - 80) - drawH) / 2;
    
    ctx.drawImage(img as Image, dx, dy, drawW, drawH);
    ctx.restore();
  } catch (e) {
    drawImageError(ctx, 40, 140, w - 80, w - 80, data.image);
  }

  // 5. 商品信息区
  const infoY = 140 + (w - 80) + 40;
  
  // 商品名称 (支持两行)
  drawMultiLineText(ctx, data.name || '精选商品', 80, infoY + 30, w - 160, 48, 2, '#1a1a1a', 36, 'left');

  // 商品描述 (副标题)
  if (data.description) {
    drawMultiLineText(ctx, data.description, 80, infoY + 110, w - 160, 32, 2, '#666666', 20, 'left');
  }

  // 6. 价格与购买区 (底部浮动排版)
  const bottomY = h - 260;

  // 价格标签
  ctx.fillStyle = '#FFF1F0';
  roundRect(ctx, 80, bottomY - 30, 80, 32, 8);
  ctx.fill();
  drawHeavyText(ctx, '特惠价', 120, bottomY - 8, '#FF4D4F', 16, 'center');

  // 现价
  drawHeavyText(ctx, '¥', 80, bottomY + 35, '#FF4D4F', 32);
  drawHeavyText(ctx, data.price.toFixed(2), 110, bottomY + 35, '#FF4D4F', 64);

  // 原价
  if (data.originalPrice && data.originalPrice > data.price) {
    const priceTextWidth = ctx.measureText(data.price.toFixed(2)).width;
    const origX = 110 + priceTextWidth + 20;
    
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#999999';
    ctx.fillText(`¥${data.originalPrice.toFixed(2)}`, origX, bottomY + 30);
    
    // 删除线
    const origWidth = ctx.measureText(`¥${data.originalPrice.toFixed(2)}`).width;
    ctx.beginPath();
    ctx.moveTo(origX - 2, bottomY + 22);
    ctx.lineTo(origX + origWidth + 2, bottomY + 22);
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 7. 二维码区域 (右下角)
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    ctx.save();
    // 二维码阴影和白底
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, w - 240, bottomY - 60, 160, 160, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    
    ctx.drawImage(qr as Image, w - 230, bottomY - 50, 140, 140);
    ctx.restore();
    
    // 扫码提示
    ctx.fillStyle = '#F0F2F5';
    roundRect(ctx, w - 240, bottomY + 110, 160, 36, 18);
    ctx.fill();
    drawHeavyText(ctx, '长按扫码购买', w - 160, bottomY + 134, '#666666', 16, 'center');
  } catch (e) { /* 二维码加载失败不中断 */ }

  return canvas.toBuffer('image/png');
}
