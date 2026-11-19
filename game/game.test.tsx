import { expect, test } from "nsh/test";
import { chooseDiscard } from "./ai";
import { Game, HUMAN, isActive, tilesOf } from "./engine";
import { evaluate, type Meld, points, shanten, waits } from "./rules";
import { countsOf, type Suit, suitOf, type Tile, tile } from "./tile";

/** "123w456t789b55w" → 牌；w 万、t 条、b 筒。 */
function parse(s: string): Tile[] {
  const out: Tile[] = [];
  let digits: number[] = [];
  for (const ch of s) {
    if (ch >= "1" && ch <= "9") digits.push(Number(ch));
    else {
      const suit = ({ w: 0, t: 1, b: 2 } as Record<string, Suit>)[ch];
      for (const d of digits) out.push(tile(suit, d));
      digits = [];
    }
  }
  return out;
}
const c = (s: string) => countsOf(parse(s));

test("平胡一分", () => {
  const s = evaluate(c("123w456w789t234t55t"), [], 2)!;
  expect(s).toEqual({ fan: 0, names: ["平胡"] });
  expect(points(s.fan)).toBe(1);
});

test("手里有缺门不能胡", () => {
  expect(evaluate(c("123w456w789t234t55b"), [], 2)).toBe(null);
});

test("清一色对对胡", () => {
  expect(evaluate(c("111w333w555w777w99w"), [], 1)).toEqual({ fan: 3, names: ["清一色", "对对胡"] });
});

test("七对带根", () => {
  expect(evaluate(c("1111w22w33w44w55w66t"), [], 2)).toEqual({ fan: 3, names: ["七对", "根×1"] });
});

test("暗杠后杠上开花", () => {
  const melds: Meld[] = [{ kind: "angang", tile: tile(0, 9), from: null }];
  const s = evaluate(c("123w456t789t55w"), melds, 2, { selfDraw: true, afterGang: true })!;
  expect(s.names).toEqual(["根×1", "自摸", "杠上开花"]);
  expect(s.fan).toBe(3);
});

test("带幺九", () => {
  expect(evaluate(c("123w789w123t789t11t"), [], 2)!.names).toEqual(["带幺九"]);
});

test("听牌", () => {
  expect(waits(c("123w456w789t23t55t"), [], 2)).toEqual([tile(1, 1), tile(1, 4)]);
});

test("向听数", () => {
  expect(shanten(c("123w456w789t234t55t"), 0)).toBe(-1);
  expect(shanten(c("123w456w789t23t55t"), 0)).toBe(0);
  expect(shanten(c("123w456w789t2t55t9b"), 0)).toBe(1);
  expect(shanten(c("11w22w33w44w55w66t7t"), 0)).toBe(0);
});

test("发牌", () => {
  const g = new Game(7, 0);
  expect(tilesOf(g.players[0]).length).toBe(14);
  for (const s of [1, 2, 3]) expect(tilesOf(g.players[s]).length).toBe(13);
  expect(g.wall.length).toBe(55);
  expect(g.phase.kind).toBe("dingque");
});

test("有缺门的牌必须先打", () => {
  const g = new Game(11, 0);
  g.chooseVoid(0);
  const p = g.players[HUMAN];
  const wan = tilesOf(p).find((t) => t < 9);
  const other = tilesOf(p).find((t) => t >= 9)!;
  if (wan !== undefined) {
    expect(g.discard(HUMAN, other)).toBe(false);
    expect(g.discard(HUMAN, wan)).toBe(true);
  }
});

/** 让人也按电脑的打法自动打完一局。 */
function autoplay(seed: number, each?: (g: Game) => void) {
  const g = new Game(seed, seed % 4);
  g.chooseVoid(0);
  for (let steps = 0; steps < 2000 && !g.isOver; steps++) {
    each?.(g);
    if (g.waitingOnAi) {
      g.aiStep();
      continue;
    }
    if (g.phase.kind === "act") {
      const opts = g.turnOptions(HUMAN);
      if (opts.zimo) g.zimo(HUMAN);
      else g.discard(HUMAN, chooseDiscard(g.players[HUMAN], g.visible(HUMAN)));
    } else if (g.phase.kind === "claim") {
      g.respond(HUMAN, g.phase.claim.options[HUMAN].hu ? "hu" : "pass");
    }
  }
  return g;
}

for (let group = 0; group < 10; group++) {
  test(`自动对局都能打完，分数守恒（第 ${group + 1} 组）`, () => {
    for (let seed = group * 4 + 1; seed <= group * 4 + 4; seed++) {
      const g = autoplay(seed);
      expect(g.isOver).toBe(true);
      expect(g.players.reduce((a, p) => a + p.delta, 0)).toBe(0);
      for (const p of g.players) {
        const n = tilesOf(p).length + p.melds.length * 3;
        expect(isActive(p) ? n === 13 : n === 14).toBe(true);
      }
    }
  });
}

test("定缺的那门始终排在手牌最右边", () => {
  for (let seed = 1; seed <= 12; seed++) {
    autoplay(seed, (g) => {
      for (const p of g.players) {
        const first = p.hand.findIndex((t) => suitOf(t) === p.voidSuit);
        if (first >= 0) expect(p.hand.slice(first).every((t) => suitOf(t) === p.voidSuit)).toBe(true);
      }
    });
  }
});
