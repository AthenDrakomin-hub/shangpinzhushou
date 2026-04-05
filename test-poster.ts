import { generatePoster } from './src/services/posterService/index.ts';
import fs from 'fs';

async function test() {
  try {
    const buffer = await generatePoster({
      title: '充气娃娃测试',
      price: 188,
      originalPrice: 1880,
      image: 'https://img.alicdn.com/imgextra/i3/O1CN01x7Z7rB1Y8vQy2Y1x9_!!6000000003013-2-tps-800-800.png',
      qrUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      description: '全网最低价，快来买',
      name: '充气娃娃'
    }, 'eleme');
    fs.writeFileSync('eleme-test.png', buffer);
    console.log("Success! File saved to eleme-test.png");
  } catch(e) {
    console.error("Failed:", e);
  }
}
test();
