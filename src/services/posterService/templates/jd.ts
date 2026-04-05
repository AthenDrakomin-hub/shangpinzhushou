/**
 * 京东模板 - 2026 信任保障风格
 * 特点：强化信任标签、品质感、红色主题
 */

import { Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect, truncateText, drawImageCover } from '../utils';
import path from 'path';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 1140;

// Logo路径
const LOGO_PATH = path.join(process.cwd(), 'public/logos/jingdong.png');

// 绘制品质徽章
function drawQualityBadge(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // 外圈
  ctx.strokeStyle = '#e4393c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.stroke();
  
  // 内圈
  ctx.fillStyle = '#e4393c';
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
  
  // 文字
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('自营', x, y - 4);
  ctx.font = '9px sans-serif';
  ctx.fillText('正品', x, y + 7);
}

export async function renderJdTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 白色背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // 顶部红色渐变条
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#e4393c');
  grad.addColorStop(0.5, '#f04e52');
  grad.addColorStop(1, '#ff6b6b');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, w, 90, [0, 0, 30, 30]);
  ctx.fill();
  
  // 品牌 Logo - 加载京东logo图片
  try {
    const logoImg: any = await safeLoadImage(LOGO_PATH);
    ctx.drawImage(logoImg as Image, 20, 15, 100, 60);
  } catch (e) {
    // 如果logo加载失败，绘制一个更好看的 JD 占位
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 24, 24, 70, 42, 8);
    ctx.fill();
    drawHeavyText(ctx, 'JD', 59, 45, '#e4393c', 28, 'center');
  }
  
  drawNormalText(ctx, '京东好物', 130, 50, '#FFFFFF', 22);
  
  // 品质徽章
  drawQualityBadge(ctx, w - 55, 45);

  // 商品图片 - 带边框和阴影
  try {
    const img: any = await safeLoadImage(data.image);

    // 投影
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    // 白色卡片边框
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(20, 105, w - 40, w - 40);

    ctx.save();
    roundRect(ctx, 20, 105, w - 40, w - 40, 16);
    ctx.clip();
    drawImageCover(ctx, img, 20, 105, w - 40, w - 40);
    ctx.restore();

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } catch (e) {
    drawImageError(ctx, 20, 105, w - 40, w - 40, data.image);
  }

  // 商品名称 (下移)
  const nameY = 105 + (w - 40) + 40;
  drawHeavyText(ctx, truncateText(ctx, data.name || '京东精选', w - 48), 24, nameY, '#1a1a1a', 36);

  // 价格区域 (下移)
  const priceX = 24;
  const priceY = nameY + 60;
  
  drawHeavyText(ctx, `¥${data.price.toFixed(2)}`, priceX, priceY, '#e4393c', 52);
  
  if (data.originalPrice && data.originalPrice > data.price) {
    ctx.font = 'bold 52px sans-serif';
    const currentPriceWidth = ctx.measureText(`¥${data.price.toFixed(2)}`).width;
    
    ctx.fillStyle = '#999999';
    ctx.font = '20px sans-serif';
    const origPrice = `¥${data.originalPrice.toFixed(2)}`;
    ctx.fillText(origPrice, priceX + currentPriceWidth + 12, priceY);
  }

  // 信任标签组
  const trustBadges = [
    { text: '自营', bg: '#FFF5F5', color: '#e4393c' },
    { text: '极速达', bg: '#E3F2FD', color: '#1976D2' },
    { text: '正品保障', bg: '#E8F5E9', color: '#388E3C' },
    { text: '7天无理由', bg: '#FFF3E0', color: '#F57C00' }
  ];

  const badgeY = priceY + 40;
  let badgeX = 24;
  trustBadges.forEach(badge => {
    ctx.fillStyle = badge.bg;
    roundRect(ctx, badgeX, badgeY, 140, 36, 18);
    ctx.fill();
    drawNormalText(ctx, badge.text, badgeX + 70, badgeY + 18, badge.color, 14, 'center');
    badgeX += 148;
  });

  // 分隔线
  const lineY = badgeY + 60;
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, lineY);
  ctx.lineTo(w - 24, lineY);
  ctx.stroke();

  // 二维码区域
  const bottomCardY = lineY + 30;
  try {
    const qr: any = await safeLoadImage(data.qrUrl);

    // 浅红背景卡片
    ctx.fillStyle = '#FFF8F8';
    roundRect(ctx, 20, bottomCardY, w - 40, 200, 20);
    ctx.fill();

    // 二维码
    ctx.drawImage(qr as Image, 40, bottomCardY + 20, 160, 160);
  } catch (e) { /* 图片加载失败 */ }

  // CTA 按钮和文案
  ctx.fillStyle = '#e4393c';
  roundRect(ctx, 230, bottomCardY + 35, 260, 56, 28);
  ctx.fill();
  drawHeavyText(ctx, '扫码立即购买', 360, bottomCardY + 63, '#FFFFFF', 26, 'center');

  // 品牌标语
  drawHeavyText(ctx, '多·快·好·省', 230, bottomCardY + 130, '#e4393c', 26);
  drawNormalText(ctx, '京东快递 · 最快当日达', 230, bottomCardY + 165, '#999999', 16);
  drawNormalText(ctx, '不负每一份热爱', 230, bottomCardY + 195, '#cccccc', 14);

  return canvas.toBuffer('image/png');
}
