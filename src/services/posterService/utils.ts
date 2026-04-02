/**
 * 海报生成服务 - 工具函数
 */

import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D } from 'canvas';
import axios from 'axios';
import sharp from 'sharp';

// 字体配置
const FONT_FAMILY = 'WenQuanYi, "PingFang SC", sans-serif';

/**
 * 安全加载图片（支持 base64、本地路径、网络 URL）
 * 自动将 webp/avif 等格式转换为 png
 */
export async function safeLoadImage(input: string): Promise<any> {
  if (!input) {
    console.log('❌ 图片路径为空');
    throw new Error('空路径');
  }

  // ✅ 优先级 1：base64 数据 URL（二维码等）
  if (input.startsWith('data:image')) {
    console.log(`✅ 加载 base64 图片`);
    return await loadImage(input);
  }

  // ✅ 优先级 2：本地绝对路径
  const fs = await import('fs');
  if (fs.existsSync(input)) {
    console.log(`✅ 加载本地图片：${input}`);
    const buffer = fs.readFileSync(input);
    return await loadImageWithSharp(buffer, input);
  }

  // ✅ 优先级 3：网络路径
  if (input.startsWith('http')) {
    try {
      console.log(`🌐 加载网络图片：${input}`);
      const res = await axios.get(input, {
        responseType: 'arraybuffer',
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' }
      });
      return await loadImageWithSharp(Buffer.from(res.data), input);
    } catch (e: any) {
      console.log(`❌ 网络图片加载失败：${input}`, e.message);
      throw e;
    }
  }

  // ❌ 都不是，路径错误
  console.log(`❌ 图片不存在：${input}`);
  throw new Error(`文件不存在：${input}`);
}

/**
 * 使用 sharp 处理图片，将不支持的格式转换为 png
 */
async function loadImageWithSharp(buffer: Buffer, sourcePath: string): Promise<any> {
  try {
    // 检测图片格式
    const metadata = await sharp(buffer).metadata();
    const format = metadata.format;
    
    // canvas 支持的格式：jpeg, png, gif, bmp
    // 需要转换的格式：webp, avif, tiff, heif
    const needsConversion = ['webp', 'avif', 'tiff', 'heif', 'svg'];
    
    if (needsConversion.includes(format || '')) {
      console.log(`🔄 转换图片格式：${format} -> png`);
      const pngBuffer = await sharp(buffer).png().toBuffer();
      return await loadImage(pngBuffer);
    }
    
    // 直接加载支持的格式
    return await loadImage(buffer);
  } catch (e: any) {
    // 如果 sharp 处理失败，尝试直接加载
    console.log(`⚠️ sharp 处理失败，尝试直接加载：${e.message}`);
    return await loadImage(buffer);
  }
}

/**
 * 绘制图片加载失败的错误提示
 */
export function drawImageError(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  imagePath: string
) {
  ctx.fillStyle = '#FFEEEE';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#FF0000';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('图片加载失败', x + w/2, y + h/2 - 20);
  
  // 显示路径（截断过长的路径）
  const displayPath = imagePath.length > 40 ? '...' + imagePath.slice(-37) : imagePath;
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#CC0000';
  ctx.fillText(displayPath, x + w/2, y + h/2 + 20);
}

/**
 * 物理强制加粗文字（描边效果）
 */
export function drawHeavyText(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  color: string, 
  fontSize: number, 
  align: CanvasTextAlign = 'left'
) {
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = align;
  
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  
  // 描边粗细
  ctx.lineWidth = fontSize * 0.06;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
}

/**
 * 绘制普通文字（常规粗细）
 */
export function drawNormalText(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  color: string, 
  fontSize: number, 
  align: CanvasTextAlign = 'left'
) {
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/**
 * 绘制圆角矩形
 */
export function roundRect(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  r: number | number[]
) {
  const radius = typeof r === 'number' ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + radius[0], y);
  ctx.lineTo(x + w - radius[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius[1]);
  ctx.lineTo(x + w, y + h - radius[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius[2], y + h);
  ctx.lineTo(x + radius[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius[3]);
  ctx.lineTo(x, y + radius[0]);
  ctx.quadraticCurveTo(x, y, x + radius[0], y);
  ctx.closePath();
}

/**
 * 截断文字到指定宽度
 */
export function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (ctx.measureText(t + '...').width > maxWidth && t.length > 0) t = t.slice(0, -1);
  return t + '...';
}

/**
 * 创建画布
 */
export function createPosterCanvas(width: number = 640, height: number = 900): {
  canvas: Canvas;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.antialias = 'subpixel';
  ctx.textBaseline = 'middle';
  return { canvas, ctx };
}
