// 牌的绘制：用 Canvas 2D 画牌身、牌背和牌面图案。
// 颜色只取主题 token（token() 是响应式的，切换深浅色时自动重画）；坐标按牌的尺寸比例算。

import { type CanvasNumber, type CanvasRenderingContext2D, token } from "nsh";
import { numeral, rankOf, suitOf, type Tile } from "../game/tile";
import { type TileStyle, tileStyle } from "./tileStyle";

// ---- 颜色 ----

type Rgba = [number, number, number, number];

function parse(c: string): Rgba {
  const h = c.replace("#", "");
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length >= 8 ? n(6) / 255 : 1];
}

function css([r, g, b, a]: Rgba) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}

/** a 与 b 按 t 混合（0 是 a，1 是 b）。 */
export function mix(a: string, b: string, t: number) {
  const x = parse(a);
  const y = parse(b);
  return css([0, 1, 2, 3].map((i) => x[i] + (y[i] - x[i]) * t) as Rgba);
}

/** 同一颜色，换透明度。 */
export function alpha(c: string, a: number) {
  const [r, g, b] = parse(c);
  return css([r, g, b, a]);
}

/** 本次绘制用到的 token。在 draw 里调用，深浅色或牌背风格切换时重画。`style` 用来画某一套风格的预览。 */
export function palette(style: TileStyle = tileStyle()) {
  return {
    face: token("tile-face") as string,
    faceHi: token("tile-face-hi") as string,
    edge: token("tile-edge") as string,
    shade: token("tile-shade") as string,
    back: token(`back-${style}`) as string,
    backHi: token(`back-${style}-hi`) as string,
    backEdge: token(`back-${style}-edge`) as string,
    ink: token("tile-ink") as string,
    gloss: token("tile-gloss") as string,
    wan: token("suit-wan") as string,
    tiao: token("suit-tiao") as string,
    tong: token("suit-tong") as string,
  };
}
export type Palette = ReturnType<typeof palette>;

// ---- 牌身 ----

/** 牌的几何：整张宽高、底部侧边厚度、圆角。 */
export interface TileBox {
  w: number;
  h: number;
  edge: number;
  r: number;
}

function vertical(cx: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) {
  const g = cx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** 正面朝上的牌：玉绿色侧边上压一块象牙色牌面，顶部一抹高光。 */
export function drawBody(cx: CanvasRenderingContext2D, b: TileBox, p: Palette) {
  const fh = b.h - b.edge;
  // 侧边（牌背的玉色从底下露出来）
  cx.beginPath();
  cx.roundRect(0, 0, b.w, b.h, b.r);
  cx.fillStyle = vertical(cx, fh - b.r, b.h, [[0, p.backHi], [0.5, p.back], [1, p.backEdge]]);
  cx.fill();
  // 牌面
  cx.beginPath();
  cx.roundRect(0, 0, b.w, fh, b.r);
  cx.fillStyle = vertical(cx, 0, fh, [[0, p.faceHi], [0.55, p.face], [1, mix(p.face, p.edge, 0.85)]]);
  cx.fill();
  // 牌面与侧边之间的一道阴影线
  cx.beginPath();
  cx.roundRect(0, fh - 1.5, b.w, 2, 1);
  cx.fillStyle = alpha(p.shade, 0.55);
  cx.fill();
  // 顶部高光
  cx.beginPath();
  cx.roundRect(1, 1, b.w - 2, fh * 0.42, Math.max(1, b.r - 1));
  cx.fillStyle = vertical(cx, 1, fh * 0.42, [[0, alpha(p.gloss, 0.75)], [1, alpha(p.gloss, 0)]]);
  cx.fill();
  // 牌面描边
  cx.beginPath();
  cx.roundRect(0.5, 0.5, b.w - 1, fh - 1, b.r);
  cx.lineWidth = 1;
  cx.strokeStyle = alpha(p.edge, 0.9);
  cx.stroke();
}

/** 牌背：真牌的两层——上面一层有颜色、带高光，下面露出一条象牙色底层。 */
export function drawBack(cx: CanvasRenderingContext2D, b: TileBox, p: Palette) {
  const band = Math.max(2, b.edge + b.h * 0.06);
  const top = b.h - band;
  // 象牙色底层（整块，下面露出的那条就是它）
  cx.beginPath();
  cx.roundRect(0, 0, b.w, b.h, b.r);
  cx.fillStyle = vertical(cx, top, b.h, [[0, p.face], [1, mix(p.face, p.shade, 0.7)]]);
  cx.fill();
  // 有色背层
  cx.beginPath();
  cx.roundRect(0, 0, b.w, top, b.r);
  cx.fillStyle = vertical(cx, 0, top, [[0, p.backHi], [0.55, p.back], [1, p.backEdge]]);
  cx.fill();
  // 背层与底层之间的阴影线
  cx.beginPath();
  cx.roundRect(0, top - 1, b.w, 1.5, 0.75);
  cx.fillStyle = alpha(p.backEdge, 0.9);
  cx.fill();
  // 斜向的柔光，像釉面
  const g = cx.createLinearGradient(0, 0, b.w, top);
  g.addColorStop(0, alpha(p.gloss, 0.32));
  g.addColorStop(0.45, alpha(p.gloss, 0.06));
  g.addColorStop(1, alpha(p.gloss, 0));
  cx.beginPath();
  cx.roundRect(1, 1, b.w - 2, top - 2, Math.max(1, b.r - 1));
  cx.fillStyle = g;
  cx.fill();
  // 顶边一道细亮线
  cx.beginPath();
  cx.roundRect(b.r * 0.6, 1, b.w - b.r * 1.2, Math.max(0.75, b.h * 0.012), 0.5);
  cx.fillStyle = alpha(p.gloss, 0.45);
  cx.fill();
}

// ---- 牌面图案 ----

type Ink = "b" | "r" | "g";
const inkOf = (p: Palette, i: Ink) => (i === "b" ? p.tong : i === "r" ? p.wan : p.tiao);

type Dot = [x: number, y: number, ink: Ink];
const TONG: Record<number, { d: number; dots: Dot[] }> = {
  1: { d: 0.9, dots: [[0.5, 0.5, "r"]] },
  2: { d: 0.5, dots: [[0.5, 0.26, "g"], [0.5, 0.74, "b"]] },
  3: { d: 0.42, dots: [[0.22, 0.18, "b"], [0.5, 0.5, "r"], [0.78, 0.82, "g"]] },
  4: { d: 0.42, dots: [[0.27, 0.26, "b"], [0.73, 0.26, "g"], [0.27, 0.74, "g"], [0.73, 0.74, "b"]] },
  5: { d: 0.36, dots: [[0.22, 0.2, "b"], [0.78, 0.2, "g"], [0.5, 0.5, "r"], [0.22, 0.8, "g"], [0.78, 0.8, "b"]] },
  6: { d: 0.36, dots: [[0.27, 0.16, "g"], [0.73, 0.16, "g"], [0.27, 0.55, "r"], [0.73, 0.55, "r"], [0.27, 0.85, "r"], [0.73, 0.85, "r"]] },
  7: {
    d: 0.3,
    dots: [[0.18, 0.11, "g"], [0.5, 0.24, "g"], [0.82, 0.37, "g"], [0.3, 0.63, "r"], [0.7, 0.63, "r"], [0.3, 0.88, "r"], [0.7, 0.88, "r"]],
  },
  8: {
    d: 0.3,
    dots: [[0.28, 0.12, "b"], [0.72, 0.12, "b"], [0.28, 0.37, "b"], [0.72, 0.37, "b"], [0.28, 0.63, "b"], [0.72, 0.63, "b"], [0.28, 0.88, "b"], [0.72, 0.88, "b"]],
  },
  9: {
    d: 0.3,
    dots: [0.17, 0.5, 0.83].flatMap((y, row) => [0.18, 0.5, 0.82].map((x): Dot => [x, y, (["b", "r", "g"] as Ink[])[row]])),
  },
};

type Stick = [x: number, y: number, ink: Ink];
const col3 = [0.2, 0.5, 0.8];
const TIAO: Record<number, { w: number; h: number; sticks: Stick[] }> = {
  2: { w: 0.18, h: 0.4, sticks: [[0.5, 0.25, "g"], [0.5, 0.75, "g"]] },
  3: { w: 0.18, h: 0.4, sticks: [[0.5, 0.25, "g"], [0.3, 0.75, "g"], [0.7, 0.75, "g"]] },
  4: { w: 0.18, h: 0.4, sticks: [[0.3, 0.25, "g"], [0.7, 0.25, "g"], [0.3, 0.75, "g"], [0.7, 0.75, "g"]] },
  5: { w: 0.16, h: 0.4, sticks: [[0.2, 0.25, "g"], [0.8, 0.25, "g"], [0.5, 0.5, "r"], [0.2, 0.75, "g"], [0.8, 0.75, "g"]] },
  6: { w: 0.16, h: 0.4, sticks: [0.25, 0.75].flatMap((y) => col3.map((x): Stick => [x, y, "g"])) },
  7: { w: 0.16, h: 0.28, sticks: [[0.5, 0.15, "r"], ...[0.5, 0.84].flatMap((y) => col3.map((x): Stick => [x, y, "g"]))] },
  8: { w: 0.14, h: 0.4, sticks: [0.25, 0.75].flatMap((y) => [0.14, 0.38, 0.62, 0.86].map((x): Stick => [x, y, "g"])) },
  9: { w: 0.16, h: 0.28, sticks: [0.16, 0.5, 0.84].flatMap((y) => col3.map((x, c): Stick => [x, y, c === 1 ? "r" : "g"])) },
};

/** 一枚圆饼：径向渐变的外圈、象牙色环、内芯和高光；够大时外圈缀一圈花点。 */
function coin(cx: CanvasRenderingContext2D, x: number, y: number, d: number, c: string, p: Palette) {
  const r = d / 2;
  const g = cx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, mix(c, p.gloss, 0.35));
  g.addColorStop(0.65, c);
  g.addColorStop(1, mix(c, p.ink, 0.35));
  cx.beginPath();
  cx.arc(x, y, r, 0, Math.PI * 2);
  cx.fillStyle = g;
  cx.fill();
  if (d < 8) return;
  if (d >= 16) {
    cx.fillStyle = alpha(p.faceHi, 0.9);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      cx.beginPath();
      cx.arc(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82, r * 0.075, 0, Math.PI * 2);
      cx.fill();
    }
  }
  cx.beginPath();
  cx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  cx.fillStyle = p.faceHi;
  cx.fill();
  const core = cx.createRadialGradient(x - r * 0.12, y - r * 0.15, 0, x, y, r * 0.38);
  core.addColorStop(0, mix(c, p.gloss, 0.3));
  core.addColorStop(1, c);
  cx.beginPath();
  cx.arc(x, y, r * 0.38, 0, Math.PI * 2);
  cx.fillStyle = core;
  cx.fill();
  cx.beginPath();
  cx.arc(x, y, r * 0.13, 0, Math.PI * 2);
  cx.fillStyle = p.faceHi;
  cx.fill();
  cx.beginPath();
  cx.ellipse(x - r * 0.38, y - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
  cx.fillStyle = alpha(p.gloss, 0.45);
  cx.fill();
}

/** 一筒：大花饼，外圈绿、中圈一环红点、红色花芯。 */
function bigCoin(cx: CanvasRenderingContext2D, x: number, y: number, d: number, p: Palette) {
  const r = d / 2;
  const outer = cx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  outer.addColorStop(0, mix(p.tiao, p.gloss, 0.3));
  outer.addColorStop(0.7, p.tiao);
  outer.addColorStop(1, mix(p.tiao, p.ink, 0.4));
  cx.beginPath();
  cx.arc(x, y, r, 0, Math.PI * 2);
  cx.fillStyle = outer;
  cx.fill();
  cx.beginPath();
  cx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  cx.fillStyle = p.faceHi;
  cx.fill();
  const dots = d >= 30 ? 12 : 8;
  cx.fillStyle = p.wan;
  for (let i = 0; i < dots; i++) {
    const a = (i / dots) * Math.PI * 2;
    cx.beginPath();
    cx.arc(x + Math.cos(a) * r * 0.64, y + Math.sin(a) * r * 0.64, r * (d >= 30 ? 0.085 : 0.11), 0, Math.PI * 2);
    cx.fill();
  }
  coin(cx, x, y, d * 0.46, p.wan, p);
  cx.beginPath();
  cx.arc(x, y, r * 0.8, Math.PI * 1.1, Math.PI * 1.45);
  cx.lineWidth = Math.max(1, r * 0.06);
  cx.lineCap = "round";
  cx.strokeStyle = alpha(p.gloss, 0.55);
  cx.stroke();
}

/** 一根竹条：中间收腰，横向渐变像圆柱，中段一道竹节。 */
function stick(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, p: Palette) {
  const r = w / 2;
  const top = y - h / 2;
  const bottom = y + h / 2;
  const pinch = w * 0.14;
  cx.beginPath();
  cx.arc(x, top + r, r, Math.PI, 0);
  cx.quadraticCurveTo(x + r - pinch * 2, y, x + r, bottom - r);
  cx.arc(x, bottom - r, r, 0, Math.PI);
  cx.quadraticCurveTo(x - r + pinch * 2, y, x - r, top + r);
  cx.closePath();
  const g = cx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, mix(c, p.ink, 0.35));
  g.addColorStop(0.35, mix(c, p.gloss, 0.4));
  g.addColorStop(0.6, c);
  g.addColorStop(1, mix(c, p.ink, 0.45));
  cx.fillStyle = g;
  cx.fill();
  if (h < 10) return;
  const nh = Math.max(1, h * 0.07);
  cx.beginPath();
  cx.roundRect(x - r + pinch * 0.6, y - nh / 2, w - pinch * 1.2, nh, nh / 2);
  cx.fillStyle = mix(c, p.ink, 0.5);
  cx.fill();
  cx.beginPath();
  cx.roundRect(x - r + pinch, y + nh / 2, w - pinch * 2, Math.max(0.75, nh * 0.45), nh / 4);
  cx.fillStyle = alpha(p.gloss, 0.5);
  cx.fill();
  for (const t of [top + h * 0.06, bottom - h * 0.06 - Math.max(0.75, nh * 0.5)]) {
    cx.beginPath();
    cx.roundRect(x - r * 0.7, t, w * 0.7, Math.max(0.75, nh * 0.5), nh / 4);
    cx.fillStyle = alpha(mix(c, p.ink, 0.5), 0.6);
    cx.fill();
  }
}

/** 一条：一只立着的小孔雀（尾羽、身子、红冠）。 */
function bird(cx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, p: Palette) {
  const x = x0 + w * 0.5;
  const y = y0 + h * 0.5;
  // 尾羽：三片向左下展开
  const feathers: [number, string][] = [
    [2.35, p.tong],
    [2.0, p.tiao],
    [1.7, p.tong],
  ];
  for (const [a, c] of feathers) {
    cx.save();
    cx.translate(x - w * 0.02, y + h * 0.08);
    cx.rotate(a);
    const g = cx.createLinearGradient(0, 0, w * 0.5, 0);
    g.addColorStop(0, c);
    g.addColorStop(1, mix(c, p.gloss, 0.35));
    cx.beginPath();
    cx.ellipse(w * 0.26, 0, w * 0.27, h * 0.06, 0, 0, Math.PI * 2);
    cx.fillStyle = g;
    cx.fill();
    cx.beginPath();
    cx.arc(w * 0.44, 0, h * 0.035, 0, Math.PI * 2);
    cx.fillStyle = p.wan;
    cx.fill();
    cx.restore();
  }
  // 身子
  const body = cx.createRadialGradient(x - w * 0.02, y - h * 0.02, 0, x + w * 0.04, y + h * 0.06, w * 0.3);
  body.addColorStop(0, mix(p.tiao, p.gloss, 0.35));
  body.addColorStop(1, p.tiao);
  cx.beginPath();
  cx.ellipse(x + w * 0.05, y + h * 0.06, w * 0.24, h * 0.15, -0.5, 0, Math.PI * 2);
  cx.fillStyle = body;
  cx.fill();
  // 翅膀
  cx.beginPath();
  cx.ellipse(x + w * 0.02, y + h * 0.08, w * 0.13, h * 0.08, -0.4, 0, Math.PI * 2);
  cx.fillStyle = mix(p.tong, p.ink, 0.15);
  cx.fill();
  // 脖子与头
  cx.beginPath();
  cx.moveTo(x + w * 0.12, y - h * 0.02);
  cx.quadraticCurveTo(x + w * 0.24, y - h * 0.12, x + w * 0.2, y - h * 0.24);
  cx.lineWidth = Math.max(1.5, w * 0.08);
  cx.lineCap = "round";
  cx.strokeStyle = p.tiao;
  cx.stroke();
  cx.beginPath();
  cx.arc(x + w * 0.2, y - h * 0.27, w * 0.085, 0, Math.PI * 2);
  cx.fillStyle = p.wan;
  cx.fill();
  // 冠、喙、眼
  cx.fillStyle = p.wan;
  for (const dx of [-0.05, 0, 0.05]) {
    cx.beginPath();
    cx.arc(x + w * (0.2 + dx), y - h * 0.36, w * 0.025, 0, Math.PI * 2);
    cx.fill();
  }
  cx.beginPath();
  cx.moveTo(x + w * 0.28, y - h * 0.28);
  cx.lineTo(x + w * 0.37, y - h * 0.26);
  cx.lineTo(x + w * 0.28, y - h * 0.24);
  cx.closePath();
  cx.fillStyle = mix(p.wan, p.ink, 0.3);
  cx.fill();
  cx.beginPath();
  cx.arc(x + w * 0.22, y - h * 0.28, Math.max(0.8, w * 0.02), 0, Math.PI * 2);
  cx.fillStyle = p.faceHi;
  cx.fill();
  // 脚
  cx.beginPath();
  cx.moveTo(x + w * 0.02, y + h * 0.2);
  cx.lineTo(x - w * 0.02, y + h * 0.32);
  cx.moveTo(x + w * 0.1, y + h * 0.2);
  cx.lineTo(x + w * 0.12, y + h * 0.32);
  cx.lineWidth = Math.max(1, w * 0.035);
  cx.strokeStyle = mix(p.wan, p.ink, 0.3);
  cx.stroke();
}

/** 牌面图案，画在 (x0, y0, w, h) 的区域里。 */
export function drawFace(cx: CanvasRenderingContext2D, tile: Tile, x0: number, y0: number, w: number, h: number, p: Palette) {
  const suit = suitOf(tile);
  const rank = rankOf(tile);
  if (suit === 0) {
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    cx.font = `700 ${Math.round(h * 0.42)}px serif`;
    cx.fillStyle = p.ink;
    cx.fillText(numeral(tile), x0 + w / 2, y0 + h * 0.27);
    cx.font = `700 ${Math.round(h * 0.4)}px serif`;
    cx.fillStyle = p.wan;
    cx.fillText("萬", x0 + w / 2, y0 + h * 0.74);
    return;
  }
  if (suit === 2) {
    const spec = TONG[rank];
    const d = spec.d * Math.min(w, h * 0.72);
    for (const [x, y, ink] of spec.dots) {
      if (rank === 1) bigCoin(cx, x0 + x * w, y0 + y * h, d, p);
      else coin(cx, x0 + x * w, y0 + y * h, d, inkOf(p, ink), p);
    }
    return;
  }
  if (rank === 1) return bird(cx, x0, y0, w, h, p);
  const spec = TIAO[rank];
  for (const [x, y, ink] of spec.sticks) stick(cx, x0 + x * w, y0 + y * h, spec.w * w, spec.h * h, inkOf(p, ink), p);
}

/** 光泽扫过：一道斜向的亮带，横移量是原生动画值，不需要每帧跑 JS。 */
export function drawSheen(cx: CanvasRenderingContext2D, b: TileBox, p: Palette, offset: CanvasNumber) {
  cx.save();
  cx.beginPath();
  cx.roundRect(0, 0, b.w, b.h - b.edge, b.r);
  cx.clip();
  cx.translate(offset, b.h / 2);
  cx.rotate(0.38);
  // 亮带正好铺满渐变的宽度，两侧都淡出，没有硬边。
  const band = b.w * 0.45;
  const g = cx.createLinearGradient(-band, 0, 0, 0);
  g.addColorStop(0, alpha(p.gloss, 0));
  g.addColorStop(0.55, alpha(p.gloss, 0.65));
  g.addColorStop(1, alpha(p.gloss, 0));
  cx.fillStyle = g;
  cx.fillRect(-band, -b.h, band, b.h * 2);
  cx.restore();
}
