import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function makePNG(w, h, draw) {
  const px = Buffer.alloc(w * h * 4);

  function fill(x0, y0, fw, fh, [r, g, b], radius = 0) {
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const px_x = x0 + dx, px_y = y0 + dy;
        if (px_x < 0 || px_x >= w || px_y < 0 || px_y >= h) continue;
        if (radius > 0) {
          let cx, cy, check = false;
          if (dx < radius && dy < radius) { cx = radius - 0.5; cy = radius - 0.5; check = true; }
          else if (dx >= fw - radius && dy < radius) { cx = fw - radius - 0.5; cy = radius - 0.5; check = true; }
          else if (dx < radius && dy >= fh - radius) { cx = radius - 0.5; cy = fh - radius - 0.5; check = true; }
          else if (dx >= fw - radius && dy >= fh - radius) { cx = fw - radius - 0.5; cy = fh - radius - 0.5; check = true; }
          if (check && Math.hypot(dx - cx, dy - cy) > radius) continue;
        }
        const i = (px_y * w + px_x) * 4;
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
      }
    }
  }

  draw(fill);

  // PNG encoding
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const b of buf) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0); }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crcBuf]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    px.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [18, 18, 18];
const BAR = [102, 102, 102];
const COLLAR = [136, 136, 136];
const GREEN = [56, 142, 60];
const RED = [211, 47, 47];
const BLUE = [25, 118, 210];
const YELLOW = [249, 168, 37];

// 180x180 apple-touch-icon (4 plates)
writeFileSync('src/apple-touch-icon.png', makePNG(180, 180, (fill) => {
  fill(0, 0, 180, 180, BG);
  fill(14, 83, 150, 14, BAR, 3);
  fill(42, 68, 8, 44, COLLAR);
  fill(52, 22, 32, 136, GREEN, 4);
  fill(88, 34, 28, 112, RED, 4);
  fill(120, 48, 22, 84, BLUE, 4);
  fill(146, 58, 20, 64, YELLOW, 3);
}));
console.log('Generated src/apple-touch-icon.png (180×180)');

// 32x32 favicon (3 plates, no yellow)
writeFileSync('src/favicon.png', makePNG(32, 32, (fill) => {
  fill(0, 0, 32, 32, BG);
  fill(2, 14, 28, 4, BAR, 1);
  fill(7, 11, 3, 10, COLLAR);
  fill(11, 3, 7, 26, GREEN, 2);
  fill(19, 6, 6, 20, RED, 2);
  fill(26, 8, 5, 16, BLUE, 1);
}));
console.log('Generated src/favicon.png (32×32)');
