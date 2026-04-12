/**
 * 快手模板 - 2026 老铁文化风格
 * 特点：手写体标签、促销贴纸、粗犷边框
 */

import { Canvas, SKRSContext2D as CanvasRenderingContext2D, Image } from '@napi-rs/canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect, truncateText, drawImageCover, drawImageSmart } from '../utils';
import path from 'path';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 1240;

// Logo路径
const LOGO_PATH = path.join(process.cwd(), 'public/logos/kuaishou.png');

// 绘制爆炸贴纸效果
function drawExplosionBadge(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.fillStyle = '#FF4906';
  
  // 爆炸形状
  const spikes = 12;
  const outerRadius = 45;
  const innerRadius = 30;
  
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI * i) / spikes;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  
  // 白色文字
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export async function renderKuaishouTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 橙色渐变背景
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#FF4906');
  grad.addColorStop(0.5, '#FF6A00');
  grad.addColorStop(1, '#FF8533');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  
  // 背景圆点图案
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < w; i += 30) {
    for (let j = 0; j < h; j += 30) {
      ctx.beginPath();
      ctx.arc(i + 15, j + 15, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 白色主卡片 - 粗边框
  ctx.fillStyle = '#FFF';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#000000';
  roundRect(ctx, 15, 15, w - 30, h - 30, 30);
  ctx.fill();
  ctx.stroke();

  // 商品图片
  try {
    const img: any = await safeLoadImage(data.image);
    ctx.save();
    roundRect(ctx, 30, 30, w - 60, w - 60, 20);
    ctx.clip();
    drawImageSmart(ctx, img, 30, 30, w - 60, w - 60);
    ctx.restore();
  } catch (e) {
    drawImageError(ctx, 30, 30, w - 60, w - 60, data.image);
  }

  const contentStartY = 30 + (w - 60) + 30;

  // 左上角爆炸贴纸
  drawExplosionBadge(ctx, 75, 90, '爆款');

  // 快手 Logo
  try {
    const logoImg: any = await safeLoadImage(LOGO_PATH);
    ctx.drawImage(logoImg as Image, w - 180, 40, 140, 45);
  } catch (e) {
    ctx.fillStyle = '#FF4906';
    roundRect(ctx, w - 160, 40, 120, 40, 20);
    ctx.fill();
    drawHeavyText(ctx, '快手', w - 100, 65, '#FFFFFF', 20, 'center');
  }

  // 商品名称
  drawHeavyText(ctx, truncateText(ctx, data.name || '快手好物', w - 60), 40, contentStartY, '#1a1a1a', 36);

  // 价格
  const priceY = contentStartY + 60;
  drawHeavyText(ctx, `¥${data.price.toFixed(2)}`, 40, priceY, '#FF4906', 56);

  // 原价
  if (data.originalPrice && data.originalPrice > data.price) {
    ctx.font = 'bold 56px sans-serif';
    const currentPriceWidth = ctx.measureText(`¥${data.price.toFixed(2)}`).width;

    ctx.fillStyle = '#999999';
    ctx.font = '22px sans-serif';
    const origPrice = `¥${data.originalPrice.toFixed(2)}`;
    ctx.fillText(origPrice, 40 + currentPriceWidth + 15, priceY);

    // 删除线
    const origWidth = ctx.measureText(origPrice).width;
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40 + currentPriceWidth + 15, priceY);
    ctx.lineTo(40 + currentPriceWidth + 15 + origWidth, priceY);
    ctx.stroke();
  }

  // 特色标签
  const tags = ['老铁推荐', '源头好货', '全网底价'];
  let tagX = 40;
  tags.forEach(tag => {
    ctx.fillStyle = '#FFF1ED';
    roundRect(ctx, tagX, priceY + 40, 100, 30, 8);
    ctx.fill();
    drawNormalText(ctx, tag, tagX + 50, priceY + 56, '#FF4906', 13, 'center');
    tagX += 110;
  });

  // 用户好评条
  const reviewY = priceY + 110;
  ctx.fillStyle = '#F9F9F9';
  roundRect(ctx, 30, reviewY, w - 60, 60, 30);
  ctx.fill();
  drawHeavyText(ctx, '👍 99.8%', 50, reviewY + 32, '#FF4906', 20);
  drawNormalText(ctx, '老铁都在抢，主播倾血推荐', 160, reviewY + 33, '#666666', 18);

  // 二维码区域
  const qrY = reviewY + 90;
  try {
    const qr: any = await safeLoadImage(data.qrUrl);

    // 黑色二维码背景
    ctx.fillStyle = '#1A1A1A';
    roundRect(ctx, w/2 - 90, qrY, 180, 180, 20);
    ctx.fill();

    // 白色二维码
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, w/2 - 75, qrY + 15, 150, 150, 16);
    ctx.fill();
    ctx.drawImage(qr as Image, w/2 - 65, qrY + 25, 130, 130);
  } catch (e) { /* 图片加载失败 */ }

  // 底部品牌标识
  const bottomY = qrY + 210;
  ctx.fillStyle = '#FF4906';
  roundRect(ctx, w/2 - 70, bottomY, 140, 40, 20);
  ctx.fill();
  drawHeavyText(ctx, '快手小店', w / 2, bottomY + 26, '#FFFFFF', 22, 'center');
  drawNormalText(ctx, '拥抱每一种生活', w / 2, bottomY + 70, '#666666', 16, 'center');

  return canvas.toBuffer('image/png');
}
