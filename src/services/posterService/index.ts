/**
 * 海报生成服务 - 主入口
 */

import { createPosterCanvas } from './utils';
import { PosterData, PosterTemplate } from './types';
import { renderDefaultTemplate } from './templates/default';
import { renderDaifuTemplate } from './templates/daifu';
import { renderMeituanTemplate } from './templates/meituan';
import { renderElemeTemplate } from './templates/eleme';
import { renderJdTemplate } from './templates/jd';
import { renderCtripTemplate } from './templates/ctrip';
import { renderDouyinTemplate } from './templates/douyin';
import { renderKuaishouTemplate } from './templates/kuaishou';

/**
 * 生成海报主函数
 * @param data 海报数据
 * @param template 模板类型
 * @returns PNG Buffer
 */
export async function generatePoster(
  data: PosterData,
  template: PosterTemplate = 'default'
): Promise<Buffer> {
  let width = 750;
  let height = 1200;

  switch (template) {
    case 'daifu': width = 640; height = 900; break;
    case 'meituan': width = 640; height = 900; break;
    case 'eleme': width = 750; height = 1200; break;
    case 'jd': width = 640; height = 1140; break;
    case 'ctrip': width = 750; height = 1334; break;
    case 'douyin': width = 640; height = 1140; break;
    case 'kuaishou': width = 640; height = 1240; break;
    default: width = 750; height = 1200; break; // default
  }

  const { canvas, ctx } = createPosterCanvas(width, height);

  switch (template) {
    case 'daifu': return renderDaifuTemplate(ctx, canvas, data);
    case 'meituan': return renderMeituanTemplate(ctx, canvas, data);
    case 'eleme': return renderElemeTemplate(ctx, canvas, data);
    case 'jd': return renderJdTemplate(ctx, canvas, data);
    case 'ctrip': return renderCtripTemplate(ctx, canvas, data);
    case 'douyin': return renderDouyinTemplate(ctx, canvas, data);
    case 'kuaishou': return renderKuaishouTemplate(ctx, canvas, data);
    default: return renderDefaultTemplate(ctx, canvas, data);
  }
}

// 重新导出类型和工具函数
export type { PosterTemplate, PosterData };
export { getTemplateConfig, getTemplateList, TEMPLATE_CONFIG } from './types';
