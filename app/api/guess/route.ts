import { PNG } from 'pngjs';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LABELS = [
  '太阳',
  '草地',
  '夜空',
  '海洋',
  '花朵',
  '苹果',
  '气球',
];

function decodeDataUrl(dataUrl: string) {
  const matches = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!matches) return null;
  return Buffer.from(matches[1], 'base64');
}

function guessFromPixels(png: PNG) {
  let bright = 0;
  let dark = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  const total = png.width * png.height;

  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luminance > 200) bright += 1;
    if (luminance < 55) dark += 1;
    red += r;
    green += g;
    blue += b;
  }

  const avgRed = red / total;
  const avgGreen = green / total;
  const avgBlue = blue / total;

  if (avgBlue > avgRed && avgBlue > avgGreen) return '海洋';
  if (avgGreen > avgRed && avgGreen > avgBlue) return '草地';
  if (dark / total > 0.35) return '夜空';
  if (bright / total > 0.4) return '太阳';
  if (avgRed > avgGreen && avgRed > avgBlue) return '苹果';

  return LABELS[Math.floor(Math.random() * LABELS.length)];
}

export async function POST(request: Request) {
  const body = await request.json();
  const buffer = decodeDataUrl(body.image || '');
  if (!buffer) {
    return NextResponse.json({ result: '我看不清楚呢，再画大一点？' }, { status: 400 });
  }

  const png = PNG.sync.read(buffer);
  const result = guessFromPixels(png);

  return NextResponse.json({ result: `我猜是「${result}」` });
}
