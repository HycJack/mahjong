// 牌面图案：万子是中文数字加红"萬"，筒子是圆饼，条子是竹节。
// 图案按牌的尺寸绘制，坐标是牌面内的 0–1 比例，颜色只用花色 token。

import { Text, View } from "nsh";
import { numeral, rankOf, suitOf, type Tile } from "../game/tile";
import { cx } from "./cx";

/** 牌面可画区域（像素），以及字号。 */
export interface FaceMetrics {
  w: number;
  h: number;
  rank: number;
  wan: number;
}

type Ink = "b" | "r" | "g";
const fill: Record<Ink, string> = { b: "bg-suit-tong", r: "bg-suit-wan", g: "bg-suit-tiao" };

// ---- 筒子 ----

type Dot = [x: number, y: number, ink: Ink];
const TONG: Record<number, { d: number; dots: Dot[] }> = {
  1: { d: 0.86, dots: [[0.5, 0.5, "r"]] },
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

function Coin(props: { x: number; y: number; d: number; ink: Ink; big?: boolean }) {
  const d = props.d;
  const ring = d * 0.62;
  const core = d * 0.26;
  return (
    <View
      class={cx("absolute rounded-full items-center justify-center", fill[props.ink])}
      style={{ left: props.x - d / 2, top: props.y - d / 2, width: d, height: d }}
    >
      {d >= 7 ? (
        <View class="rounded-full bg-tile-face items-center justify-center" style={{ width: ring, height: ring }}>
          <View class={cx("rounded-full", fill[props.big ? "g" : props.ink])} style={{ width: core, height: core }} />
        </View>
      ) : null}
    </View>
  );
}

// ---- 条子 ----

type Stick = [x: number, y: number, ink: Ink];
const col3 = [0.2, 0.5, 0.8];
const TIAO: Record<number, { w: number; h: number; sticks: Stick[] }> = {
  1: { w: 0.3, h: 0.78, sticks: [[0.5, 0.5, "g"]] },
  2: { w: 0.17, h: 0.38, sticks: [[0.5, 0.25, "g"], [0.5, 0.75, "g"]] },
  3: { w: 0.17, h: 0.38, sticks: [[0.5, 0.25, "g"], [0.3, 0.75, "g"], [0.7, 0.75, "g"]] },
  4: { w: 0.17, h: 0.38, sticks: [[0.3, 0.25, "g"], [0.7, 0.25, "g"], [0.3, 0.75, "g"], [0.7, 0.75, "g"]] },
  5: { w: 0.15, h: 0.38, sticks: [[0.2, 0.25, "g"], [0.8, 0.25, "g"], [0.5, 0.5, "r"], [0.2, 0.75, "g"], [0.8, 0.75, "g"]] },
  6: { w: 0.15, h: 0.38, sticks: [0.25, 0.75].flatMap((y) => col3.map((x): Stick => [x, y, "g"])) },
  7: {
    w: 0.15,
    h: 0.27,
    sticks: [[0.5, 0.15, "r"], ...[0.5, 0.84].flatMap((y) => col3.map((x): Stick => [x, y, "g"]))],
  },
  8: { w: 0.13, h: 0.38, sticks: [0.25, 0.75].flatMap((y) => [0.14, 0.38, 0.62, 0.86].map((x): Stick => [x, y, "g"])) },
  9: { w: 0.15, h: 0.27, sticks: [0.16, 0.5, 0.84].flatMap((y) => col3.map((x, c): Stick => [x, y, c === 1 ? "r" : "g"])) },
};

function Bamboo(props: { x: number; y: number; w: number; h: number; ink: Ink; one?: boolean }) {
  const { w, h } = props;
  const nodes = h >= 10;
  return (
    <View
      class={cx("absolute rounded-full overflow-hidden justify-center", fill[props.ink])}
      style={{ left: props.x - w / 2, top: props.y - h / 2, width: w, height: h }}
    >
      {nodes ? <View class="bg-tile-face/80" style={{ height: Math.max(1, h * 0.06) }} /> : null}
      {props.one ? (
        <View class="absolute rounded-full bg-suit-wan" style={{ left: w * 0.2, top: h * 0.08, width: w * 0.6, height: w * 0.6 }} />
      ) : null}
    </View>
  );
}

/** 一张牌的正面图案。 */
export function TileFace(props: { tile: Tile; metrics: FaceMetrics }) {
  const suit = () => suitOf(props.tile);
  const rank = () => rankOf(props.tile);
  const m = () => props.metrics;
  return (
    <View class="items-center justify-center" style={{ width: m().w, height: m().h }}>
      {suit() === 0 ? (
        <>
          <Text class="text-tile-ink font-bold leading-none" style={{ fontSize: m().rank }}>
            {numeral(props.tile)}
          </Text>
          <Text class="text-suit-wan font-bold leading-none" style={{ fontSize: m().wan, marginTop: m().h * 0.04 }}>
            萬
          </Text>
        </>
      ) : suit() === 2 ? (
        <View class="relative" style={{ width: m().w, height: m().h }}>
          {TONG[rank()].dots.map(([x, y, ink]) => (
            <Coin x={x * m().w} y={y * m().h} d={TONG[rank()].d * Math.min(m().w, m().h * 0.72)} ink={ink} big={rank() === 1} />
          ))}
        </View>
      ) : (
        <View class="relative" style={{ width: m().w, height: m().h }}>
          {TIAO[rank()].sticks.map(([x, y, ink]) => (
            <Bamboo x={x * m().w} y={y * m().h} w={TIAO[rank()].w * m().w} h={TIAO[rank()].h * m().h} ink={ink} one={rank() === 1} />
          ))}
        </View>
      )}
    </View>
  );
}
