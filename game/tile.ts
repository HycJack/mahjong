// 牌：四川麻将只用万、条、筒三门，每门 1–9，每张 4 枚，共 108 张。
// 一张牌是 0..26 的整数：花色 × 9 + (点数 − 1)。

import { t } from "nsh/i18n";

export type Tile = number;
export type Suit = 0 | 1 | 2;
/** 每种牌的枚数，按牌的编号排列，长 27。 */
export type Counts = number[];

export const SUITS: readonly Suit[] = [0, 1, 2];
const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

export const tile = (suit: Suit, rank: number): Tile => suit * 9 + rank - 1;
export const suitOf = (t: Tile): Suit => Math.floor(t / 9) as Suit;
/** 点数，1–9。 */
export const rankOf = (t: Tile): number => (t % 9) + 1;
export const isTerminal = (t: Tile) => rankOf(t) === 1 || rankOf(t) === 9;
/** 花色名，按界面语言：万 / Characters。 */
export const suitName = (s: Suit) => t(`suit.${s}`);
/** 中文点数：一 … 九（画在牌面上，不随语言变）。 */
export const numeral = (t: Tile) => NUMERALS[rankOf(t) - 1];
/** 牌名，按界面语言："五筒" / "5 Dots"。 */
export const tileName = (x: Tile) => t("tile.name", { rank: rankOf(x), numeral: numeral(x), suit: suitName(suitOf(x)) });

/** 一整副牌，未洗。 */
export function fullSet(): Tile[] {
  const out: Tile[] = [];
  for (let t = 0; t < 27; t++) out.push(t, t, t, t);
  return out;
}

export function countsOf(tiles: readonly Tile[]): Counts {
  const c = new Array<number>(27).fill(0);
  for (const t of tiles) c[t]++;
  return c;
}

export const sortTiles = (tiles: Tile[]) => tiles.sort((a, b) => a - b);

/** 确定性的随机数（mulberry32），让一局可以按种子重放。 */
export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  below(n: number): number {
    return Math.floor(this.next() * n);
  }
  shuffle<T>(items: T[]) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.below(i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
  }
}
