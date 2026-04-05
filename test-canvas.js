import { createCanvas } from 'canvas';
const canvas = createCanvas(100, 100);
const ctx = canvas.getContext('2d');
ctx.filter = 'blur(10px)';
console.log(ctx.filter);
