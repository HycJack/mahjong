// 规则：胡牌判定、番型、向听数和听牌。只看牌，不看对局。

import { type Counts, isTerminal, rankOf, type Suit, SUITS, suitOf, type Tile } from "./tile";

/** 番数封顶。 */
export const MAX_FAN = 5;

/** 一个番数值多少分：平胡 1 分，每番翻倍，封顶。 */
export const points = (fan: number) => 2 ** Math.min(fan, MAX_FAN);

/** 碰、直杠（杠别人打的）、补杠（碰上加一张）、暗杠。 */
export type MeldKind = "peng" | "minggang" | "bugang" | "angang";

export interface Meld {
  kind: MeldKind;
  tile: Tile;
  /** 牌从谁那里来；暗杠和补杠没有。 */
  from: number | null;
}

export const isGang = (k: MeldKind) => k !== "peng";
export const meldSize = (k: MeldKind) => (isGang(k) ? 4 : 3);

/** 胡牌时的情形，影响加番。 */
export interface WinContext {
  selfDraw?: boolean;
  /** 杠后补牌自摸。 */
  afterGang?: boolean;
  /** 别人杠后打出的牌点炮。 */
  gangDiscard?: boolean;
  /** 抢别人补杠的牌。 */
  robbedGang?: boolean;
  /** 摸的是最后一张，或点炮的是最后一张打出的牌。 */
  lastTile?: boolean;
}

/** 一手胡牌的番型与番数。 */
export interface Score {
  fan: number;
  names: string[];
}

type Set = { kind: "triplet" | "sequence"; at: number };

const total = (c: Counts) => c.reduce((a, b) => a + b, 0);
const firstTile = (c: Counts) => c.findIndex((n) => n > 0);

/** 能否把 `c` 全部拆成刻子和顺子（会临时改动 `c`，返回前复原）。 */
function allSets(c: Counts): boolean {
  const i = firstTile(c);
  if (i < 0) return true;
  if (c[i] >= 3) {
    c[i] -= 3;
    const ok = allSets(c);
    c[i] += 3;
    if (ok) return true;
  }
  if (rankOf(i) <= 7 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--, c[i + 1]--, c[i + 2]--;
    const ok = allSets(c);
    c[i]++, c[i + 1]++, c[i + 2]++;
    return ok;
  }
  return false;
}

function collectSets(c: Counts, sets: Set[], out: Set[][]) {
  const i = firstTile(c);
  if (i < 0) {
    out.push([...sets]);
    return;
  }
  if (c[i] >= 3) {
    c[i] -= 3;
    sets.push({ kind: "triplet", at: i });
    collectSets(c, sets, out);
    sets.pop();
    c[i] += 3;
  }
  if (rankOf(i) <= 7 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--, c[i + 1]--, c[i + 2]--;
    sets.push({ kind: "sequence", at: i });
    collectSets(c, sets, out);
    sets.pop();
    c[i]++, c[i + 1]++, c[i + 2]++;
  }
}

function decompositions(hand: Counts): { pair: number; sets: Set[] }[] {
  const c = [...hand];
  const out: { pair: number; sets: Set[] }[] = [];
  for (let pair = 0; pair < 27; pair++) {
    if (c[pair] < 2) continue;
    c[pair] -= 2;
    const found: Set[][] = [];
    collectSets(c, [], found);
    for (const sets of found) out.push({ pair, sets });
    c[pair] += 2;
  }
  return out;
}

const hasSuit = (c: Counts, s: Suit) => c.slice(s * 9, s * 9 + 9).some((n) => n > 0);

const isSevenPairs = (hand: Counts, melds: readonly Meld[]) =>
  melds.length === 0 && total(hand) === 14 && hand.every((n) => n % 2 === 0);

function isStandard(hand: Counts): boolean {
  const c = [...hand];
  for (let pair = 0; pair < 27; pair++) {
    if (c[pair] < 2) continue;
    c[pair] -= 2;
    const ok = allSets(c);
    c[pair] += 2;
    if (ok) return true;
  }
  return false;
}

/** 手牌（已含胡的那张）连同副露，是否成胡。缺的那门不能有牌。 */
export function isWin(hand: Counts, melds: readonly Meld[], voidSuit: Suit | null): boolean {
  if (voidSuit !== null && hasSuit(hand, voidSuit)) return false;
  if (total(hand) + 3 * melds.length !== 14) return false;
  return isSevenPairs(hand, melds) || isStandard(hand);
}

/** 胡牌的番型。`hand` 已含胡的那张；不成胡返回 `null`。 */
export function evaluate(hand: Counts, melds: readonly Meld[], voidSuit: Suit | null, ctx: WinContext = {}): Score | null {
  if (!isWin(hand, melds, voidSuit)) return null;
  const all = [...hand];
  for (const m of melds) all[m.tile] += meldSize(m.kind);
  const suits = SUITS.filter((s) => hasSuit(all, s)).length;
  const roots = all.filter((n) => n === 4).length;

  let pattern: Score = { fan: 0, names: [] };
  if (isSevenPairs(hand, melds)) pattern = { fan: 2, names: ["七对"] };
  for (const d of decompositions(hand)) {
    let fan = 0;
    const names: string[] = [];
    if (d.sets.every((s) => s.kind === "triplet")) {
      const twoFiveEight = all.every((n, i) => n === 0 || [2, 5, 8].includes(rankOf(i)));
      if (twoFiveEight) {
        fan += 3;
        names.push("将对");
      } else {
        fan += 1;
        names.push("对对胡");
      }
      if (total(hand) === 2) {
        fan += 1;
        names.push("金钩钓");
      }
    }
    const setTerminal = (s: Set) => (s.kind === "triplet" ? isTerminal(s.at) : rankOf(s.at) === 1 || rankOf(s.at) === 7);
    if (isTerminal(d.pair) && d.sets.every(setTerminal) && melds.every((m) => isTerminal(m.tile))) {
      fan += 2;
      names.push("带幺九");
    }
    if (fan > pattern.fan) pattern = { fan, names };
  }

  let fan = pattern.fan;
  const names = [...pattern.names];
  if (suits === 1) {
    fan += 2;
    names.unshift("清一色");
  }
  if (roots > 0) {
    fan += roots;
    names.push(`根×${roots}`);
  }
  const extras: [boolean | undefined, string][] = [
    [ctx.selfDraw, "自摸"],
    [ctx.afterGang && ctx.selfDraw, "杠上开花"],
    [ctx.gangDiscard, "杠上炮"],
    [ctx.robbedGang, "抢杠胡"],
    [ctx.lastTile && ctx.selfDraw, "海底捞月"],
    [ctx.lastTile && !ctx.selfDraw, "海底炮"],
  ];
  for (const [on, name] of extras) {
    if (on) {
      fan += 1;
      names.push(name);
    }
  }
  if (names.length === 0) names.push("平胡");
  return { fan, names };
}

/** 听哪些牌：手牌少一张时，补上哪张能胡。 */
export function waits(hand: Counts, melds: readonly Meld[], voidSuit: Suit | null): Tile[] {
  const c = [...hand];
  const out: Tile[] = [];
  for (let i = 0; i < 27; i++) {
    if ((voidSuit !== null && suitOf(i) === voidSuit) || c[i] >= 4) continue;
    c[i]++;
    if (isWin(c, melds, voidSuit)) out.push(i);
    c[i]--;
  }
  return out;
}

/** 听牌时能胡的最大番（查大叫用），不听返回 `null`。 */
export function bestWaitScore(hand: Counts, melds: readonly Meld[], voidSuit: Suit | null): Score | null {
  let best: Score | null = null;
  const c = [...hand];
  for (const t of waits(hand, melds, voidSuit)) {
    c[t]++;
    const s = evaluate(c, melds, voidSuit);
    c[t]--;
    if (s && (!best || s.fan > best.fan)) best = s;
  }
  return best;
}

// ---- 向听数 ----

/** 一门花色的牌型 → 凑出 m 组面子时最多还有几个搭子（-1 表示凑不出 m 组）。 */
const suitMemo = new Map<number, number[]>();

function suitBest(c: number[]): number[] {
  let key = 0;
  for (let i = 0; i < 9; i++) key = key * 5 + c[i];
  const found = suitMemo.get(key);
  if (found) return found;
  let i = 0;
  while (i < 9 && c[i] === 0) i++;
  const best = [-1, -1, -1, -1, -1];
  if (i === 9) {
    best[0] = 0;
    suitMemo.set(key, best);
    return best;
  }
  const merge = (dm: number, dt: number) => {
    const sub = suitBest(c);
    for (let m = 0; m < 5; m++) {
      if (sub[m] < 0) continue;
      const mm = Math.min(m + dm, 4);
      best[mm] = Math.max(best[mm], sub[m] + dt);
    }
  };
  const tryTake = (offsets: number[], dm: number, dt: number) => {
    if (offsets.some((o) => i + o > 8)) return;
    for (const o of offsets) c[i + o]--;
    if (offsets.every((o) => c[i + o] >= 0)) merge(dm, dt);
    for (const o of offsets) c[i + o]++;
  };
  tryTake([0, 0, 0], 1, 0);
  tryTake([0, 1, 2], 1, 0);
  tryTake([0, 0], 0, 1);
  tryTake([0, 1], 0, 1);
  tryTake([0, 2], 0, 1);
  tryTake([0], 0, 0);
  suitMemo.set(key, best);
  return best;
}

function normalShanten(c: Counts, need: number, head: number): number {
  const tables = [suitBest(c.slice(0, 9)), suitBest(c.slice(9, 18)), suitBest(c.slice(18, 27))];
  let best = 8;
  for (let m0 = 0; m0 < 5; m0++) {
    const t0 = tables[0][m0];
    if (t0 < 0) continue;
    for (let m1 = 0; m1 < 5; m1++) {
      const t1 = tables[1][m1];
      if (t1 < 0) continue;
      for (let m2 = 0; m2 < 5; m2++) {
        const t2 = tables[2][m2];
        if (t2 < 0) continue;
        const m = Math.min(m0 + m1 + m2, need);
        const t = Math.min(t0 + t1 + t2, need - m);
        best = Math.min(best, 2 * need - 2 * m - t - head);
      }
    }
  }
  return best;
}

const shantenMemo = new Map<string, number>();

/** 向听数：还差几张听牌；-1 表示已经胡了（手牌为 14 − 3×副露 张时）。 */
export function shanten(hand: Counts, meldCount: number): number {
  const key = hand.join("") + meldCount;
  const found = shantenMemo.get(key);
  if (found !== undefined) return found;
  const need = 4 - Math.min(meldCount, 4);
  const c = [...hand];
  let best = normalShanten(c, need, 0);
  for (let i = 0; i < 27; i++) {
    if (c[i] < 2) continue;
    c[i] -= 2;
    best = Math.min(best, normalShanten(c, need, 1));
    c[i] += 2;
  }
  if (meldCount === 0) {
    const pairs = hand.filter((n) => n >= 2).length;
    const kinds = hand.filter((n) => n >= 1).length;
    best = Math.min(best, 6 - pairs + Math.max(0, 7 - kinds));
  }
  if (shantenMemo.size > 200000) shantenMemo.clear();
  shantenMemo.set(key, best);
  return best;
}
