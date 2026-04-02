/**
 * 快手模板 - 2026 老铁文化风格
 * 特点：手写体标签、促销贴纸、粗犷边框
 */

import { Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect, truncateText } from '../utils';
import path from 'path';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 900;

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
    roundRect(ctx, 30, 30, w - 60, 320, 20);
    ctx.clip();
    ctx.drawImage(img as Image, 30, 30, w - 60, 320);
    ctx.restore();
  } catch (e) {
    drawImageError(ctx, 30, 30, w - 60, 320, data.image);
  }
  
  // 左上角爆炸贴纸
  drawExplosionBadge(ctx, 75, 90, '爆款');

  // 快手 Logo
  try {
    const logoImg: any = await safeLoadImage(LOGO_PATH);
    ctx.drawImage(logoImg as Image, w - 180, 40, 140, 45);
  } catch (e) {
    ctx.fillStyle = '#FE2C55';
    roundRect(ctx, w - 160, 40, 120, 40, 20);
    ctx.fill();
    drawHeavyText(ctx, '快手', w - 100, 65, '#FFFFFF', 20, 'center');
  }

  // 商品名称
  drawHeavyText(ctx, truncateText(ctx, data.name || '快手好物', w - 60), 40, 385, '#1a1a1a', 30);

  // 价格
  drawHeavyText(ctx, `¥${data.price.toFixed(2)}`, 40, 445, '#FF4906', 52);
  
  // 原价
  if (data.originalPrice && data.originalPrice > data.price) {
    ctx.fillStyle = '#999999';
    ctx.font = '18px sans-serif';
    ctx.fillText(`原价¥${data.originalPrice.toFixed(2)}`, 40 + ctx.measureText(`¥${data.price.toFixed(2)}`).width + 15, 445);
  }

  // 购买按钮
  const btnGrad = ctx.createLinearGradient(40, 490, 40, 550);
  btnGrad.addColorStop(0, '#FF6A00');
  btnGrad.addColorStop(1, '#FF4906');
  ctx.fillStyle = btnGrad;
  roundRect(ctx, 40, 490, w - 80, 55, 27);
  ctx.fill();
  
  ctx.strokeStyle = '#CC3300';
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 490, w - 80, 55, 27);
  ctx.stroke();
  
  drawHeavyText(ctx, '立即抢购', w / 2, 525, '#FFFFFF', 26, 'center');
  
  // 信任标签
  const tags = ['正品', '速发', '好评', '热销'];
  let tagX = 40;
  tags.forEach(tag => {
    ctx.fillStyle = '#F5F5F5';
    roundRect(ctx, tagX, 565, 130, 28, 14);
    ctx.fill();
    drawNormalText(ctx, tag, tagX + 65, 583, '#333333', 13, 'center');
    tagX += 145;
  });

  // 二维码区域
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    
    // 黑色二维码背景
    ctx.fillStyle = '#000000';
    roundRect(ctx, w/2 - 75, 620, 150, 150, 16);
    ctx.fill();
    
    // 白色二维码
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, w/2 - 60, 635, 120, 120, 12);
    ctx.fill();
    ctx.drawImage(qr as Image, w/2 - 52, 643, 104, 104);
  } catch (e) { /* 图片加载失败 */ }
  
  // 底部品牌标识
  ctx.fillStyle = '#FF4906';
  roundRect(ctx, w/2 - 60, 795, 120, 35, 17);
  ctx.fill();
  drawHeavyText(ctx, '快手小店', w / 2, 820, '#FFFFFF', 20, 'center');
  drawNormalText(ctx, '拥抱每一种生活', w / 2, 860, '#666666', 14, 'center');

  return canvas.toBuffer('image/png');
}
