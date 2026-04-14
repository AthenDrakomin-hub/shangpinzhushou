import { Canvas, SKRSContext2D as CanvasRenderingContext2D, Image } from '@napi-rs/canvas';
import { PosterData } from '../types';
import { FONT_FAMILY, safeLoadImage, drawImageError, drawHeavyText, drawNormalText, roundRect } from '../utils';

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 900;

export async function renderMeituanDaifuTemplate(
  ctx: CanvasRenderingContext2D,
  canvas: Canvas,
  data: PosterData
): Promise<Buffer> {
  const w = POSTER_WIDTH;
  const h = POSTER_HEIGHT;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  const navY = 28;
  const navIconR = 22;
  const navIconX = 52;
  const navCenterY = navY + navIconR;

  ctx.fillStyle = '#FFD100';
  ctx.beginPath();
  ctx.arc(navIconX, navCenterY, navIconR, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `bold 18px ${FONT_FAMILY}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('美团', navIconX, navCenterY + 1);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#111111';
  ctx.font = `18px ${FONT_FAMILY}`;
  const navTextX = navIconX + navIconR + 14;
  const navText = '美团 | 外卖团购特价美食酒店电影';
  ctx.fillText(navText, navTextX, navCenterY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#2FA84F';
  ctx.font = `18px ${FONT_FAMILY}`;
  ctx.fillText('交易保障', w - 36, navCenterY);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#111111';
  ctx.font = `bold 38px ${FONT_FAMILY}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Hi~ 快来帮我支付这笔订单吧～', 36, 150);

  const blockX = 36;
  const blockY = 190;
  const blockW = w - 72;
  const blockH = 610;
  const r = 28;

  ctx.fillStyle = '#FFD100';
  roundRect(ctx, blockX, blockY, blockW, blockH, r);
  ctx.fill();

  ctx.fillStyle = '#111111';
  ctx.font = `bold 44px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('来帮我代付吧～', blockX + 38, blockY + 118);

  const avatarX = blockX + blockW - 150;
  const avatarY = blockY + 44;

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(avatarX + 52, avatarY + 52, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#FFE8D6';
  ctx.beginPath();
  ctx.arc(avatarX + 52, avatarY + 54, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1C1C1C';
  ctx.beginPath();
  ctx.arc(avatarX + 52, avatarY + 44, 34, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(avatarX + 18, avatarY + 44, 68, 16);

  ctx.fillStyle = '#1C1C1C';
  ctx.beginPath();
  ctx.arc(avatarX + 40, avatarY + 58, 4, 0, Math.PI * 2);
  ctx.arc(avatarX + 64, avatarY + 58, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#6AB7FF';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(avatarX + 52, avatarY + 88, 34, 0, Math.PI);
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(avatarX + 52, avatarY + 88, 34, 0, Math.PI);
  ctx.stroke();

  ctx.fillStyle = '#E53935';
  roundRect(ctx, avatarX + 82, avatarY + 50, 40, 56, 10);
  ctx.fill();
  ctx.fillStyle = '#FFD100';
  ctx.beginPath();
  ctx.arc(avatarX + 102, avatarY + 78, 6, 0, Math.PI * 2);
  ctx.fill();

  const cardX = blockX + 34;
  const cardY = blockY + 170;
  const cardW = blockW - 68;
  const cardH = 360;

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardW, cardH, r);
  ctx.fill();

  const qrSize = 170;
  const qrX = cardX + (cardW - qrSize) / 2;
  const qrY = cardY + 68;

  try {
    const qr: any = await safeLoadImage(data.qrUrl);
    ctx.drawImage(qr as Image, qrX, qrY, qrSize, qrSize);
  } catch (e) {
    drawImageError(ctx, qrX, qrY, qrSize, qrSize, data.qrUrl);
  }

  const btnX = cardX + 58;
  const btnY = cardY + cardH - 108;
  const btnW = cardW - 116;
  const btnH = 74;

  ctx.fillStyle = '#FFD100';
  roundRect(ctx, btnX, btnY, btnW, btnH, 37);
  ctx.fill();

  drawHeavyText(ctx, '查看详情', btnX + btnW / 2, btnY + btnH / 2 + 2, '#111111', 28, 'center');

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const footerText = data.name ? `${data.name}` : '美团代付';
  ctx.fillText(footerText, w / 2, blockY + blockH - 30);

  return canvas.toBuffer('image/png');
}

