// 电脑的打法：先打缺门，再按向听数和进张数选牌；能胡就胡，碰杠只在不拖慢听牌时要。

import type { ClaimOptions, Player, Response } from "./engine";
import { shanten } from "./rules";
import { type Counts, countsOf, rankOf, type Suit, SUITS, suitOf, type Tile } from "./tile";

const tilesOf = (p: Player): Tile[] => (p.drawn === null ? [...p.hand] : [...p.hand, p.drawn]);

/** 定缺：张数最少的那门；一样多时缺对子少的那门。 */
export function chooseVoid(tiles: readonly Tile[]): Suit {
  const c = countsOf(tiles);
  let best: Suit = 0;
  let bestKey = Infinity;
  for (const s of SUITS) {
    const part = c.slice(s * 9, s * 9 + 9);
    const n = part.reduce((a, b) => a + b, 0);
    const pairs = part.filter((x) => x >= 2).length;
    const key = n * 4 + pairs;
    if (key < bestKey) {
      bestKey = key;
      best = s;
    }
  }
  return best;
}

/** 打出 `t` 后的向听数和进张数（还没见到的、能让向听数变小的牌）。 */
export function discardValue(c: Counts, melds: number, voidSuit: Suit | null, visible: Counts, t: Tile) {
  const after = [...c];
  after[t]--;
  const s = shanten(after, melds);
  let ukeire = 0;
  for (let i = 0; i < 27; i++) {
    if (suitOf(i) === voidSuit || after[i] >= 4) continue;
    after[i]++;
    if (shanten(after, melds) < s) ukeire += 4 - Math.min(visible[i], 4);
    after[i]--;
  }
  return { shanten: s, ukeire };
}

const edgeness = (t: Tile) => Math.abs(rankOf(t) - 5);

/** 选一张打出的牌。 */
export function chooseDiscard(p: Player, visible: Counts): Tile {
  const tiles = tilesOf(p);
  const c = countsOf(tiles);
  const voids = tiles.filter((t) => suitOf(t) === p.voidSuit);
  if (voids.length > 0) {
    // 缺门的牌：先打孤张，再打成对的；同样先打边张。
    return voids.reduce((a, b) => (c[b] < c[a] || (c[b] === c[a] && edgeness(b) > edgeness(a)) ? b : a));
  }
  let best: Tile = tiles[tiles.length - 1];
  let bestKey: [number, number, number] = [Infinity, 0, 0];
  for (const t of new Set(tiles)) {
    const v = discardValue(c, p.melds.length, p.voidSuit, visible, t);
    const key: [number, number, number] = [v.shanten, -v.ukeire, -edgeness(t)];
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) {
      best = t;
      bestKey = key;
    }
  }
  return best;
}

/** 手里多一张时，打掉最合适的那张后的向听数。 */
function bestAfterDiscard(c: Counts, melds: number): number {
  const work = [...c];
  let best = 8;
  for (let i = 0; i < 27; i++) {
    if (work[i] === 0) continue;
    work[i]--;
    best = Math.min(best, shanten(work, melds));
    work[i]++;
  }
  return best;
}

/** 自己回合的杠：不增加向听数才杠。 */
export function chooseGang(p: Player, gangs: readonly Tile[]): Tile | null {
  const c = countsOf(tilesOf(p));
  const now = bestAfterDiscard(c, p.melds.length);
  for (const t of gangs) {
    const bu = p.melds.some((m) => m.kind === "peng" && m.tile === t);
    const after = [...c];
    after[t] -= bu ? 1 : 4;
    if (shanten(after, bu ? p.melds.length : p.melds.length + 1) <= now) return t;
  }
  return null;
}

/** 对别人打出的牌表态。 */
export function respond(p: Player, t: Tile, options: ClaimOptions): Response {
  if (options.hu) return "hu";
  const c = countsOf(tilesOf(p));
  const melds = p.melds.length;
  const now = shanten(c, melds);
  if (options.gang) {
    const after = [...c];
    after[t] -= 3;
    if (shanten(after, melds + 1) <= now) return "gang";
  }
  if (options.peng) {
    const after = [...c];
    after[t] -= 2;
    if (bestAfterDiscard(after, melds + 1) < now) return "peng";
  }
  return "pass";
}
