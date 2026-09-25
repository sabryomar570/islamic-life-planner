/**
 * توليد أيقونات PNG من هندسة أيقونة SVG الموجودة فعليًا.
 *
 * لماذا لا نستخدم SVG فقط؟ Safari على iOS يتجاهل `apple-touch-icon` بصيغة
 * SVG، وأي Chromium يطلب 192×192 و512×512 صريحتين لصدق «قابل للتثبيت».
 * لا توجد مكتبة رسم في هذه البيئة، فالأشكال هنا مُعرَّفة بنفس إحداثيات
 * `public/icon.svg` تمامًا، ولا نقترب منه ولا نخترع تصميمًا جديدًا.
 *
 * التشغيل: bun scripts/generate-icons.ts
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

type Point = { x: number; y: number };
type Poly = Point[];

/* ——— 1) هندسة الأيقونة (نسخة حرفية من public/icon.svg) ——— */

const C = {
  bgFrom: [247, 251, 255] as const,
  bgTo: [220, 233, 251] as const,
  inkFrom: [47, 111, 228] as const,
  inkTo: [20, 80, 184] as const,
  arcFrom: [127, 196, 242] as const,
  arcTo: [59, 124, 224] as const,
  line: [247, 251, 255] as const,
};

const SIZE = 512;
const CORNER = 116;

/** قوس المحراب: مسار غير معبأ بعرض 16. */
const ARCH: Poly = [
  { x: 256, y: 96 },
  { x: 256 - 64, y: 96 + 42 },
  { x: 256 - 104, y: 96 + 152 },
  { x: 256 - 104, y: 96 + 152 },
  { x: 256 - 104, y: 96 + 152 + 66 },
  { x: 256 - 58, y: 96 + 152 + 112 },
  { x: 256, y: 96 + 152 + 112 },
];

/** عود: مسار معبأ داخل مجموعة مُدارة بـrotate(-18 256 268). */
const OUD: Poly = [
  { x: 256, y: 132 },
  { x: 256 + 26, y: 132 + 46 },
  { x: 256 + 40, y: 132 + 128 },
  { x: 256 + 40, y: 132 + 128 },
  { x: 256 + 22, y: 132 + 204 },
  { x: 256, y: 132 + 204 },
];
// (المرآة اليسرى للعود تُبنى ضمن `oudClosed` أدناه — لا نحتاج نقطة انطلاق مستقلة.)

const LINE_A: [Point, Point] = [
  { x: 226, y: 236 },  { x: 286, y: 236 },
];
const LINE_B: [Point, Point] = [
  { x: 226, y: 272 },
  { x: 286, y: 272 },
];
const DOT = { x: 256, y: 380, r: 14 };

/* ——— 2) هندسة المسارات (تسطيح bezier + دوران) ——— */

/** يبني مسارًا من أوامر: move + several cubic curves. */
function cubicPath(start: Point, curves: Point[][]): Poly {
  const points: Poly = [start];
  let current = start;
  for (const [c1, c2, end] of curves) {
    const STEPS = 64;
    for (let i = 1; i <= STEPS; i += 1) {
      const t = i / STEPS;
      const u = 1 - t;
      points.push({
        x: u * u * u * current.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * end.x,
        y: u * u * u * current.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * end.y,
      });
    }
    current = end;
  }
  return points;
}

const archPath = cubicPath(ARCH[0], [
  [ARCH[1], ARCH[2], ARCH[3]],
  [ARCH[4], ARCH[5], ARCH[6]],
  [{ x: 256 + 104, y: 96 + 152 - 46 }, { x: 256 + 104, y: 96 + 152 - 92 }, { x: 256 + 104, y: 96 }],
]);

/** oud هو شكل مغلق: العمود الأيمن ثم الأيسر معكوسًا. */
const oudClosed: Poly = (() => {
  const right = cubicPath(OUD[0], [
    [OUD[1], OUD[2], OUD[3]],
    [OUD[4], OUD[5], { x: 256, y: 336 }],
  ]);
  const left = cubicPath({ x: 256, y: 336 }, [
    [{ x: 256 - 22, y: 336 }, { x: 256 - 40, y: 260 }, { x: 256 - 40, y: 260 }],
    [{ x: 256 - 40, y: 220 }, { x: 256 - 26, y: 178 }, { x: 256, y: 132 }],
  ]);
  return [...right, ...left];
})();

/** rotate(-18°) حول (256,268) */
const ROT = (-18 * Math.PI) / 180;
const COS = Math.cos(ROT);
const SIN = Math.sin(ROT);
const PIVOT = { x: 256, y: 268 };
function rotate(p: Point): Point {
  const dx = p.x - PIVOT.x;
  const dy = p.y - PIVOT.y;
  return {
    x: PIVOT.x + dx * COS - dy * SIN,
    y: PIVOT.y + dx * SIN + dy * COS,
  };
}
function unrotate(p: Point): Point {
  const dx = p.x - PIVOT.x;
  const dy = p.y - PIVOT.y;
  return {
    x: PIVOT.x + dx * COS + dy * SIN,
    y: PIVOT.y - dx * SIN + dy * COS,
  };
}

const archRotated = archPath.map(rotate);
const oudRotated = oudClosed.map(rotate);
const lineARotated = [rotate(LINE_A[0]), rotate(LINE_A[1])];
const lineBRotated = [rotate(LINE_B[0]), rotate(LINE_B[1])];
// النقطة السفلية خارج المجموعة المُدارة في الـSVG الأصلي، فلا تُدار.
const dotRotated = DOT;

/* ——— 3) أدوات هندسية ——— */

function insideRoundedRect(x: number, y: number, w: number, h: number, r: number) {
  if (x < 0 || y < 0 || x > w || y > h) return false;
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function insidePolygon(x: number, y: number, poly: Poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToPolyline(x: number, y: number, poly: Poly) {
  let best = Infinity;
  for (let i = 1; i < poly.length; i += 1) {
    const a = poly[i - 1];
    const b = poly[i];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len2 = vx * vx + vy * vy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / len2));
    const px = a.x + t * vx;
    const py = a.y + t * vy;
    const d = Math.hypot(x - px, y - py);
    if (d < best) best = d;
  }
  return best;
}

function distanceToSegment(x: number, y: number, a: Point, b: Point) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / len2));
  return Math.hypot(x - (a.x + t * vx), y - (a.y + t * vy));
}

/** تدرّج خطي في فضاء العنصر (objectBoundingBox) بين نقطتين. */
function mixGradient(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number,
): [number, number, number] {
  const k = Math.max(0, Math.min(1, t));
  return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k];
}

function blend(target: number[], color: readonly [number, number, number], alpha: number) {
  target[0] = target[0] * (1 - alpha) + color[0] * alpha;
  target[1] = target[1] * (1 - alpha) + color[1] * alpha;
  target[2] = target[2] * (1 - alpha) + color[2] * alpha;
  target[3] = Math.max(target[3], alpha);
}

/** عيّنة واحدة: لون نقطة واحدة بترتيب الرسم كما في SVG. */
function sample(x: number, y: number, scale: number, masked: boolean): [number, number, number] {
  const px: number[] = [0, 0, 0, 0];
  const s = SIZE / scale;

  // 1) الخلفية
  if (!insideRoundedRect(x, y, SIZE, SIZE, masked ? 0 : CORNER)) return [0, 0, 0];
  const bgT = (x / SIZE + y / SIZE) / 2;
  blend(px, mixGradient(C.bgFrom, C.bgTo, bgT), 1);

  // 2) قوس المحراب: مسار بعرض 16 بشفافية 0.42
  if (distanceToPolyline(x, y, archRotated) <= 8) {
    const t = Math.max(0, Math.min(1, (x / SIZE + y / SIZE) / 2));
    blend(px, mixGradient(C.arcFrom, C.arcTo, t), 0.42);
  }

  // 3) العود: مسار معبأ، بتدرّج محسوب في فضاءه قبل الدوران
  if (insidePolygon(x, y, oudRotated)) {
    const local = unrotate({ x, y });
    const t = Math.max(0, Math.min(1, (local.x / s) * 0.4 + (local.y / s) * 0.6));
    blend(px, mixGradient(C.inkFrom, C.inkTo, t), 1);
  }

  // 4) الخيطان: خطّان دائريان بشفافية 0.85
  if (
    distanceToSegment(x, y, lineARotated[0], lineARotated[1]) <= 5 ||
    distanceToSegment(x, y, lineBRotated[0], lineBRotated[1]) <= 5
  ) {
    blend(px, C.line, 0.85);
  }

  // 5) النقطة السفلية
  if (Math.hypot(x - dotRotated.x, y - dotRotated.y) <= DOT.r) {
    const t = Math.max(0, Math.min(1, (x / SIZE + y / SIZE) / 2));
    blend(px, mixGradient(C.arcFrom, C.arcTo, t), 0.7);
  }

  return [px[0], px[1], px[2]];
}

/* ——— 4) إخراج PNG (RGBA، بلا مكتبة) ——— */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Uint8Array) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size: number, rgba: Uint8Array) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // عمق البت
  header[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // بلا مُرشِّح
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

function render(size: number, masked: boolean) {
  const SS = 3; // 3×3 عينات لكل بكسل
  const rgba = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let hits = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const x = ((px + (sx + 0.5) / SS) * SIZE) / size;
          const y = ((py + (sy + 0.5) / SS) * SIZE) / size;
          const [cr, cg, cb] = sample(x, y, SIZE / size, masked);
          if (cr + cg + cb > 0) {
            r += cr;
            g += cg;
            b += cb;
            hits += 1;
          }
        }
      }
      const index = (py * size + px) * 4;
      if (hits === 0) continue; // شفاف تمامًا
      rgba[index] = Math.round(r / hits);
      rgba[index + 1] = Math.round(g / hits);
      rgba[index + 2] = Math.round(b / hits);
      rgba[index + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

const outputs: [string, number, boolean][] = [
  ["public/icon-192.png", 192, false],
  ["public/icon-512.png", 512, false],
  ["public/icon-maskable-512.png", 512, true],
  ["public/apple-touch-icon.png", 180, false],
];

for (const [path, size, masked] of outputs) {
  writeFileSync(path, render(size, masked));
  console.log(`كُتب ${path} (${size}×${size}${masked ? " maskable" : ""})`);
}
