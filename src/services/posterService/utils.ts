/**
 * 海报生成服务 - 工具函数
 */

import { createCanvas, loadImage, Canvas, SKRSContext2D as CanvasRenderingContext2D, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';
import sharp from 'sharp';

// 尝试加载系统字体，增加对服务器上现有中文字体的兼容性
try {
  (GlobalFonts as any).loadSystemFonts();
} catch (e) {
  console.warn('Failed to load system fonts for canvas:', e);
}

// 字体配置，增加更多的 fallback，特别是 `@napi-rs/canvas` 能识别的全名
export const FONT_FAMILY = '"WenQuanYi Zen Hei", "WenQuanYi Micro Hei", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif';

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
  ctx.font = `24px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('图片加载失败', x + w/2, y + h/2 - 20);
  
  // 显示路径（截断过长的路径）
  const displayPath = imagePath.length > 40 ? '...' + imagePath.slice(-37) : imagePath;
  ctx.font = `16px ${FONT_FAMILY}`;
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
 * 绘制多行文本
 */
export function drawMultiLineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  color: string,
  fontSize: number,
  align: CanvasTextAlign = 'left'
) {
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = align;
  ctx.fillStyle = color;

  const chars = text.split('');
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      if (lineCount === maxLines - 1) {
        ctx.fillText(line.slice(0, -1) + '...', x, currentY);
        return;
      }
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
      lineCount++;
    } else {
      line = testLine;
    }
  }
  
  if (lineCount < maxLines) {
    ctx.fillText(line, x, currentY);
  }
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
 * 模拟 CSS object-fit: cover 绘制图片
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let drawW = img.width;
  let drawH = img.height;
  let sx = 0;
  let sy = 0;

  if (imgRatio > targetRatio) {
    // 图片偏宽，以高为基准裁剪两边
    drawW = img.height * targetRatio;
    sx = (img.width - drawW) / 2;
  } else {
    // 图片偏高，以宽为基准裁剪上下
    drawH = img.width / targetRatio;
    sy = (img.height - drawH) / 2;
  }

  ctx.drawImage(img, sx, sy, drawW, drawH, x, y, w, h);
}

export function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let drawW = w;
  let drawH = h;
  let dx = x;
  let dy = y;

  if (imgRatio > targetRatio) {
    // 图片偏宽，以宽为基准，上下留白
    drawH = w / imgRatio;
    dy = y + (h - drawH) / 2;
  } else {
    // 图片偏高，以高为基准，左右留白
    drawW = h * imgRatio;
    dx = x + (w - drawW) / 2;
  }

  // 为保证图片本身不带有透明或半透明边缘的混合瑕疵，可以不加特殊处理，直接绘制
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

/**
 * 智能绘制商品图（带模糊氛围底色 + 居中自适应）
 * 解决长图被压扁或被严重裁剪的问题
 */
export function drawImageSmart(
  ctx: CanvasRenderingContext2D,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  
  // 1. 画模糊底色
  ctx.save();
  ctx.filter = 'blur(40px) brightness(0.9)';
  // 向四周扩散放大绘制，避免边缘出现白色的发光边框（因为blur会将边缘和外侧透明像素混合）
  const pad = 60;
  drawImageCover(ctx, img, x - pad, y - pad, w + pad * 2, h + pad * 2);
  ctx.restore();

  // 2. 覆盖一层极淡的白色半透明，让背景不要太喧宾夺主
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(x, y, w, h);
  
  // 3. 画原图 (contain)
  drawImageContain(ctx, img, x, y, w, h);
  ctx.restore();
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
  // napi-rs/canvas 默认开启抗锯齿，不需要手动设置
  // ctx.antialias = 'subpixel';
  ctx.textBaseline = 'middle';
  return { canvas, ctx };
}
