/**
 * 饿了么模板 - 2026 美食蒸汽风格
 * 特点：食物蒸汽效果、配送标签、清爽蓝色
 */

import { Canvas, SKRSContext2D as CanvasRenderingContext2D, Image } from '@napi-rs/canvas';
import { PosterData } from '../types';
import { FONT_FAMILY, safeLoadImage, drawImageError, drawHeavyText, drawNormalText, drawMultiLineText, roundRect, drawImageCover, drawImageSmart } from '../utils';

const POSTER_WIDTH = 750;
const POSTER_HEIGHT = 1200;

export async function renderElemeTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 1. 饿了么品牌蓝背景
  ctx.fillStyle = '#0086F6';
  ctx.fillRect(0, 0, w, h);

  // 顶部大字装饰
  drawHeavyText(ctx, 'SUPER', w/2, 140, 'rgba(255,255,255,0.1)', 120, 'center');
  drawHeavyText(ctx, '饿了么超值推荐', w/2, 90, '#FFFFFF', 40, 'center');
  
  // 2. 主白卡
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 40, 180, w - 80, h - 240, 32);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // 3. 商品大图
  try {
    const img: any = await safeLoadImage(data.image);
    ctx.save();
    roundRect(ctx, 60, 200, w - 120, w - 120, 24);
    ctx.clip();

    drawImageSmart(ctx, img, 60, 200, w - 120, w - 120);
    ctx.restore();
  } catch (e) {
    drawImageError(ctx, 60, 200, w - 120, w - 120, data.image);
  }

  // 4. 文字描述区
  const infoY = 200 + (w - 120) + 50;
  drawMultiLineText(ctx, data.name || '外卖好物', 60, infoY + 30, w - 120, 48, 2, '#333333', 38, 'left');

  if (data.description) {
    drawMultiLineText(ctx, data.description, 60, infoY + 110, w - 120, 32, 2, '#888888', 22, 'left');
  }

  // 5. 价格与底部区域
  const bottomY = h - 220;
  
  // 红包角标
  ctx.fillStyle = '#FF5339';
  roundRect(ctx, 60, bottomY - 30, 90, 36, [18, 18, 18, 0]);
  ctx.fill();
  drawHeavyText(ctx, '外卖特价', 105, bottomY - 6, '#FFFFFF', 16, 'center');

  // 现价
  drawHeavyText(ctx, '¥', 60, bottomY + 40, '#FF5339', 36);
  drawHeavyText(ctx, data.price.toFixed(2), 95, bottomY + 40, '#FF5339', 72);

  // 原价
  if (data.originalPrice && data.originalPrice > data.price) {
    const priceTextWidth = ctx.measureText(data.price.toFixed(2)).width;
    const origX = 95 + priceTextWidth + 20;
    
    ctx.font = `24px ${FONT_FAMILY}`;
    ctx.fillStyle = '#999999';
    ctx.fillText(`¥${data.originalPrice.toFixed(2)}`, origX, bottomY + 30);
    
    const origWidth = ctx.measureText(`¥${data.originalPrice.toFixed(2)}`).width;
    ctx.beginPath();
    ctx.moveTo(origX - 2, bottomY + 22);
    ctx.lineTo(origX + origWidth + 2, bottomY + 22);
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 6. 二维码
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    ctx.fillStyle = '#F5F5F5';
    roundRect(ctx, w - 210, bottomY - 30, 150, 150, 16);
    ctx.fill();
    ctx.drawImage(qr as Image, w - 200, bottomY - 20, 130, 130);
  } catch (e) {}

  drawNormalText(ctx, '长按扫码下单', w - 135, bottomY + 145, '#999999', 16, 'center');

  return canvas.toBuffer('image/png');
}
