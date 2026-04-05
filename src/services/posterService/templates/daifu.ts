/**
 * 代付模板 - 2026 温暖情感风格
 * 特点：爱心元素、温暖配色、情感化文案
 */

import { Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import { PosterData } from '../types';
import { safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect, truncateText, drawImageCover } from '../utils';
import path from 'path';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 900;

// Logo路径
const LOGO_PATH = path.join(process.cwd(), 'public/logos/daifu.png');

// 绘制爱心动画效果
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x - size / 2, y + (size * 0.8), x, y + (size * 0.9), x, y + size);
  ctx.bezierCurveTo(x, y + (size * 0.9), x + size / 2, y + (size * 0.8), x + size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.closePath();
  ctx.fill();
}

// 绘制漂浮的爱心
function drawFloatingHearts(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const hearts = [
    { x: w * 0.1, y: h * 0.25, size: 18, opacity: 0.25 },
    { x: w * 0.9, y: h * 0.2, size: 22, opacity: 0.3 },
    { x: w * 0.15, y: h * 0.65, size: 15, opacity: 0.2 },
    { x: w * 0.85, y: h * 0.6, size: 18, opacity: 0.25 },
  ];
  
  hearts.forEach(heart => {
    drawHeart(ctx, heart.x, heart.y, heart.size, `rgba(255,255,255,${heart.opacity})`);
  });
}

export async function renderDaifuTemplate(
  ctx: CanvasRenderingContext2D, 
  canvas: Canvas, 
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH, h = POSTER_HEIGHT;

  // 温暖的黄色渐变背景
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#FFE500');
  bg.addColorStop(0.5, '#FFD54F');
  bg.addColorStop(1, '#FFA726');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  
  // 漂浮爱心装饰
  drawFloatingHearts(ctx, w, h);

  // 顶部标题区域 - 带白色卡片
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 25, 25, w - 50, 140, 28);
  ctx.fill();
  
  // Logo
  try {
    const logoImg: any = await safeLoadImage(LOGO_PATH);
    ctx.drawImage(logoImg as Image, w/2 - 60, 35, 120, 50);
  } catch (e) {
    drawHeavyText(ctx, '帮我代付', w/2, 70, '#FF6B00', 36, 'center');
  }
  
  drawNormalText(ctx, '好友帮忙 温暖人心', w/2, 110, '#999999', 16, 'center');

  // 内容卡片
  ctx.fillStyle = '#FFF';
  roundRect(ctx, 25, 185, w - 50, 500, 28);
  ctx.fill();
  
  // 商品图片 - 圆形
  try {
    const img: any = await safeLoadImage(data.image);

    ctx.save();
    ctx.beginPath();
    ctx.arc(w/2, 295, 90, 0, Math.PI * 2);
    ctx.clip();
    drawImageCover(ctx, img, w/2 - 90, 205, 180, 180);
    ctx.restore();

    // 金色边框
    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w/2, 295, 90, 0, Math.PI * 2);
    ctx.stroke();
  } catch (e) {
    drawImageError(ctx, w/2 - 90, 205, 180, 180, data.image);
  }

  // 商品名称
  drawHeavyText(ctx, truncateText(ctx, data.name || '期待你的帮助', w - 100), w/2, 420, '#333333', 26, 'center');
  
  // 价格区域
  ctx.fillStyle = '#FFF8E1';
  roundRect(ctx, 40, 455, w - 80, 120, 20);
  ctx.fill();
  
  drawNormalText(ctx, '需要代付', w/2, 490, '#999999', 14, 'center');
  drawHeavyText(ctx, `¥${data.price.toFixed(2)}`, w/2, 540, '#FF6B00', 48, 'center');

  // 二维码区域
  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    
    // 橙色背景
    ctx.fillStyle = '#FF6B00';
    roundRect(ctx, w/2 - 80, 600, 160, 160, 20);
    ctx.fill();
    
    // 白色二维码框
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, w/2 - 60, 620, 120, 120, 12);
    ctx.fill();
    ctx.drawImage(qr as Image, w/2 - 50, 630, 100, 100);
  } catch (e) { /* 图片加载失败 */ }

  // 底部温情提示
  drawNormalText(ctx, '感谢好友的帮助', w/2, 785, '#FFFFFF', 16, 'center');
  drawNormalText(ctx, '每一份支持都值得珍惜', w/2, 810, '#FFFFFF', 13, 'center');

  return canvas.toBuffer('image/png');
}
