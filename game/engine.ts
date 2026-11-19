// 一局血战到底：发牌、定缺、摸打、碰杠胡、结算。纯状态机，不依赖界面。
//
// 座位 0 是玩家，1 下家，2 对家，3 上家；出牌顺序 0 → 1 → 2 → 3。
// 一家胡了就离场，其余继续，直到只剩一家没胡或者牌墙摸完。

import * as ai from "./ai";
import { bestWaitScore, evaluate, isWin, MAX_FAN, type Meld, meldSize, points, type Score, type WinContext } from "./rules";
import { type Counts, countsOf, fullSet, Rng, type Suit, suitName, suitOf, type Tile, tileName, sortTiles } from "./tile";

export const HUMAN = 0;
export const SEATS = 4;
export const SEAT_NAMES = ["你", "下家", "对家", "上家"] as const;
export const seatName = (seat: number) => SEAT_NAMES[seat];

/** 一家胡牌的记录。 */
export interface Win {
  /** 第几个胡的，从 1 开始。 */
  order: number;
  tile: Tile;
  score: Score;
  /** 点炮的一家；自摸为 `null`。 */
  from: number | null;
}

export interface Player {
  /** 手牌，已排序，不含刚摸的那张。 */
  hand: Tile[];
  /** 刚摸到、还没打出的那张。 */
  drawn: Tile | null;
  melds: Meld[];
  discards: Tile[];
  voidSuit: Suit | null;
  win: Win | null;
  /** 本局得失分。 */
  delta: number;
}

/** 手牌加上刚摸的那张。 */
export const tilesOf = (p: Player): Tile[] => (p.drawn === null ? [...p.hand] : [...p.hand, p.drawn]);
export const countsOfPlayer = (p: Player): Counts => countsOf(tilesOf(p));
export const isActive = (p: Player) => p.win === null;
/** 手里还有缺门的牌（花猪）。 */
export const holdsVoid = (p: Player) => p.voidSuit !== null && tilesOf(p).some((t) => suitOf(t) === p.voidSuit);

/** 此刻能不能打出这张：有缺门的牌就只能先打缺门。 */
export function canDiscard(p: Player, t: Tile): boolean {
  const tiles = tilesOf(p);
  if (!tiles.includes(t)) return false;
  if (holdsVoid(p)) return suitOf(t) === p.voidSuit;
  return true;
}

/** 别人打出一张牌后，某家可以做的事。 */
export interface ClaimOptions {
  hu: boolean;
  peng: boolean;
  gang: boolean;
}
const NO_OPTIONS: ClaimOptions = { hu: false, peng: false, gang: false };
export const hasAny = (o: ClaimOptions) => o.hu || o.peng || o.gang;

export type Response = "hu" | "peng" | "gang" | "pass";

export interface Claim {
  tile: Tile;
  from: number;
  /** 打出的牌，或补杠的那张（只能抢杠胡）。 */
  source: "discard" | "bugang";
  options: ClaimOptions[];
  responses: (Response | null)[];
}

/** 还没回应、又有得选的人。 */
export const claimWaiting = (c: Claim) =>
  [0, 1, 2, 3].filter((s) => hasAny(c.options[s]) && c.responses[s] === null);

export type Phase =
  | { kind: "dingque" }
  | { kind: "act"; seat: number }
  | { kind: "claim"; claim: Claim }
  | { kind: "over" };

/** 自己回合能做的事。 */
export interface TurnOptions {
  zimo: boolean;
  /** 可以暗杠或补杠的牌。 */
  gangs: Tile[];
}

/** 局末某家的结算说明（查花猪、查大叫）。 */
export interface Settlement {
  seat: number;
  note: string;
}

/** 牌桌上的一件事，界面用它来做提示和动效。 */
export interface GameEvent {
  id: number;
  seat: number;
  kind: "discard" | "peng" | "gang" | "hu" | "zimo" | "info";
  text: string;
}

function newPlayer(): Player {
  return { hand: [], drawn: null, melds: [], discards: [], voidSuit: null, win: null, delta: 0 };
}

function sortPlayer(p: Player) {
  if (p.drawn !== null) {
    p.hand.push(p.drawn);
    p.drawn = null;
  }
  sortTiles(p.hand);
}

function take(p: Player, t: Tile, n: number) {
  for (let k = 0; k < n; k++) {
    if (p.drawn === t) p.drawn = null;
    else {
      const i = p.hand.indexOf(t);
      if (i >= 0) p.hand.splice(i, 1);
    }
  }
  sortPlayer(p);
}

export class Game {
  readonly players: Player[];
  readonly wall: Tile[];
  phase: Phase = { kind: "dingque" };
  readonly dealer: number;
  /** 最近发生的事，新的在后。 */
  readonly events: GameEvent[] = [];
  /** 局末查叫、查花猪的说明。 */
  readonly settlements: Settlement[] = [];
  /** 最近一次打出、还在牌河里的牌。 */
  lastDiscard: { seat: number; tile: Tile } | null = null;
  /** 当前出牌者是杠后补的牌（杠上开花）。 */
  private afterGang = false;
  /** 这张打出的牌是杠后打出的（杠上炮）。 */
  private gangDiscard = false;
  /** 当前出牌者刚摸了牌，可以自摸。 */
  private drew = true;
  private wins = 0;
  private eventId = 0;

  /** 洗牌、发牌，三家电脑定缺，等玩家定缺。 */
  constructor(seed: number, dealer = 0) {
    const rng = new Rng(seed);
    const wall = fullSet();
    rng.shuffle(wall);
    this.players = [newPlayer(), newPlayer(), newPlayer(), newPlayer()];
    this.players.forEach((p, seat) => {
      p.hand = sortTiles(wall.splice(wall.length - (seat === dealer ? 14 : 13)));
    });
    // 庄家的第 14 张算作摸到的牌。
    const d = this.players[dealer];
    d.drawn = d.hand.pop() ?? null;
    this.players.forEach((p, seat) => {
      if (seat !== HUMAN) p.voidSuit = ai.chooseVoid(tilesOf(p));
    });
    this.wall = wall;
    this.dealer = dealer;
    this.say(dealer, "info", `${seatName(dealer)}坐庄`);
  }

  get isOver() {
    return this.phase.kind === "over";
  }

  private say(seat: number, kind: GameEvent["kind"], text: string) {
    this.events.push({ id: ++this.eventId, seat, kind, text });
    if (this.events.length > 60) this.events.shift();
  }

  activeCount() {
    return this.players.filter(isActive).length;
  }

  private nextActive(after: number): number {
    for (let k = 1; k <= SEATS; k++) {
      const s = (after + k) % SEATS;
      if (isActive(this.players[s])) return s;
    }
    return after;
  }

  /** 牌桌上看得见的牌：各家打出的、副露的，加上 `seat` 自己的手牌。 */
  visible(seat: number): Counts {
    const c = countsOfPlayer(this.players[seat]);
    for (const p of this.players) {
      for (const t of p.discards) c[t]++;
      for (const m of p.melds) c[m.tile] += meldSize(m.kind);
    }
    return c;
  }

  // ---- 定缺 ----

  /** 玩家定缺，然后庄家开始出牌。 */
  chooseVoid(suit: Suit) {
    if (this.phase.kind !== "dingque") return;
    this.players[HUMAN].voidSuit = suit;
    const line = this.players.map((p, s) => `${seatName(s)}缺${p.voidSuit === null ? "" : suitName(p.voidSuit)}`).join("，");
    this.say(HUMAN, "info", line);
    this.drew = true;
    this.phase = { kind: "act", seat: this.dealer };
  }

  // ---- 自己的回合 ----

  /** 现在轮到谁出牌。 */
  get acting(): number | null {
    return this.phase.kind === "act" ? this.phase.seat : null;
  }

  turnOptions(seat: number): TurnOptions {
    if (this.acting !== seat) return { zimo: false, gangs: [] };
    const p = this.players[seat];
    const c = countsOfPlayer(p);
    const zimo = this.drew && isWin(c, p.melds, p.voidSuit);
    const gangs: Tile[] = [];
    if (this.wall.length > 0) {
      for (let t = 0; t < 27; t++) {
        if (suitOf(t) === p.voidSuit) continue;
        const bu = c[t] >= 1 && p.melds.some((m) => m.kind === "peng" && m.tile === t);
        if (c[t] === 4 || bu) gangs.push(t);
      }
    }
    return { zimo, gangs };
  }

  /** 自摸。 */
  zimo(seat: number): boolean {
    if (!this.turnOptions(seat).zimo) return false;
    const p = this.players[seat];
    const t = p.drawn ?? p.hand[p.hand.length - 1];
    const ctx: WinContext = { selfDraw: true, afterGang: this.afterGang, lastTile: this.wall.length === 0 };
    const score = evaluate(countsOfPlayer(p), p.melds, p.voidSuit, ctx)!;
    const pts = points(score.fan);
    this.players.forEach((q, s) => {
      if (s !== seat && isActive(q)) {
        q.delta -= pts;
        p.delta += pts;
      }
    });
    this.recordWin(seat, t, score, null);
    sortPlayer(p);
    this.afterGang = false;
    this.continueAfterWin(seat);
    return true;
  }

  private recordWin(seat: number, t: Tile, score: Score, from: number | null) {
    this.wins++;
    const how = from === null ? "自摸" : `胡${seatName(from)}的`;
    this.say(seat, from === null ? "zimo" : "hu", `${seatName(seat)}${how}${tileName(t)}，${score.fan} 番：${score.names.join(" · ")}`);
    this.players[seat].win = { order: this.wins, tile: t, score, from };
  }

  private continueAfterWin(lastWinner: number) {
    if (this.activeCount() <= 1) this.finish("三家已胡，本局结束");
    else this.draw(this.nextActive(lastWinner));
  }

  /** 暗杠或补杠。 */
  gang(seat: number, t: Tile): boolean {
    if (!this.turnOptions(seat).gangs.includes(t)) return false;
    const p = this.players[seat];
    const meld = p.melds.find((m) => m.kind === "peng" && m.tile === t);
    if (meld) {
      // 补杠：先问有没有人抢杠胡。
      take(p, t, 1);
      meld.kind = "bugang";
      this.say(seat, "gang", `${seatName(seat)}补杠${tileName(t)}`);
      const options = this.players.map((_, s) => (s === seat ? NO_OPTIONS : { ...NO_OPTIONS, hu: this.canHuWith(s, t) }));
      if (options.some((o) => o.hu)) {
        this.phase = { kind: "claim", claim: { tile: t, from: seat, source: "bugang", options, responses: [null, null, null, null] } };
      } else {
        this.settleBuGang(seat);
      }
    } else {
      take(p, t, 4);
      p.melds.push({ kind: "angang", tile: t, from: null });
      this.say(seat, "gang", `${seatName(seat)}暗杠`);
      this.payEach(seat, 2);
      this.drawAfterGang(seat);
    }
    return true;
  }

  private settleBuGang(seat: number) {
    this.payEach(seat, 1);
    this.drawAfterGang(seat);
  }

  /** 刮风下雨：每家还在场的人付 `amount`。 */
  private payEach(to: number, amount: number) {
    this.players.forEach((q, s) => {
      if (s !== to && isActive(q)) {
        q.delta -= amount;
        this.players[to].delta += amount;
      }
    });
  }

  private drawAfterGang(seat: number) {
    this.draw(seat);
    if (this.acting === seat) this.afterGang = true;
  }

  /** 打出一张牌。 */
  discard(seat: number, t: Tile): boolean {
    if (this.acting !== seat || !canDiscard(this.players[seat], t)) return false;
    const gangDiscard = this.afterGang;
    this.afterGang = false;
    this.drew = false;
    const p = this.players[seat];
    take(p, t, 1);
    p.discards.push(t);
    this.lastDiscard = { seat, tile: t };
    this.say(seat, "discard", `${seatName(seat)}打出${tileName(t)}`);

    const options = this.players.map((q, s): ClaimOptions => {
      if (s === seat || !isActive(q) || q.voidSuit === suitOf(t)) return NO_OPTIONS;
      const n = countsOfPlayer(q)[t];
      const wallLeft = this.wall.length > 0;
      return { hu: this.canHuWith(s, t), peng: n >= 2 && wallLeft, gang: n === 3 && wallLeft };
    });
    if (options.some(hasAny)) {
      this.gangDiscard = gangDiscard;
      this.phase = { kind: "claim", claim: { tile: t, from: seat, source: "discard", options, responses: [null, null, null, null] } };
    } else {
      this.draw(this.nextActive(seat));
    }
    return true;
  }

  private canHuWith(seat: number, t: Tile): boolean {
    const p = this.players[seat];
    if (!isActive(p)) return false;
    const c = countsOfPlayer(p);
    c[t]++;
    return isWin(c, p.melds, p.voidSuit);
  }

  private draw(seat: number) {
    const t = this.wall.pop();
    if (t === undefined) {
      this.finish("牌摸完了，流局查叫");
      return;
    }
    const p = this.players[seat];
    sortPlayer(p);
    p.drawn = t;
    this.drew = true;
    this.afterGang = false;
    this.phase = { kind: "act", seat };
  }

  // ---- 对别人的牌表态 ----

  get claim(): Claim | null {
    return this.phase.kind === "claim" ? this.phase.claim : null;
  }

  /** 某家对当前这张牌的选择；不在可选范围内的选择算作过。 */
  respond(seat: number, response: Response): boolean {
    const claim = this.claim;
    if (!claim) return false;
    const o = claim.options[seat];
    if (!hasAny(o) || claim.responses[seat] !== null) return false;
    const allowed = response === "pass" || o[response];
    claim.responses[seat] = allowed ? response : "pass";
    if (claimWaiting(claim).length === 0) this.resolve(claim);
    return true;
  }

  private resolve(claim: Claim) {
    const { tile: t, from, source, responses } = claim;
    // 胡优先，按出牌顺序，一炮可以多响。
    const order = [1, 2, 3].map((k) => (from + k) % SEATS);
    const winners = order.filter((s) => responses[s] === "hu");
    if (winners.length > 0) {
      for (const s of winners) {
        const p = this.players[s];
        const c = countsOfPlayer(p);
        c[t]++;
        const ctx: WinContext = {
          gangDiscard: source === "discard" && this.gangDiscard,
          robbedGang: source === "bugang",
          lastTile: this.wall.length === 0,
        };
        const score = evaluate(c, p.melds, p.voidSuit, ctx)!;
        const pts = points(score.fan);
        this.players[from].delta -= pts;
        p.delta += pts;
        p.hand.push(t);
        sortPlayer(p);
        this.recordWin(s, t, score, from);
      }
      if (source === "discard") {
        this.players[from].discards.pop();
        this.lastDiscard = null;
      } else {
        // 被抢的杠退回成碰。
        const m = this.players[from].melds.find((m) => m.tile === t);
        if (m) m.kind = "peng";
      }
      this.gangDiscard = false;
      this.continueAfterWin(winners[winners.length - 1]);
      return;
    }
    this.gangDiscard = false;
    if (source === "bugang") {
      this.settleBuGang(from);
      return;
    }
    const taker = order.find((s) => responses[s] === "gang" || responses[s] === "peng");
    if (taker === undefined) {
      this.draw(this.nextActive(from));
      return;
    }
    this.players[from].discards.pop();
    this.lastDiscard = null;
    const gang = responses[taker] === "gang";
    const p = this.players[taker];
    take(p, t, gang ? 3 : 2);
    p.melds.push({ kind: gang ? "minggang" : "peng", tile: t, from });
    if (gang) {
      this.say(taker, "gang", `${seatName(taker)}杠${tileName(t)}`);
      this.players[from].delta -= 2;
      p.delta += 2;
      this.drawAfterGang(taker);
    } else {
      this.say(taker, "peng", `${seatName(taker)}碰${tileName(t)}`);
      this.drew = false;
      this.afterGang = false;
      this.phase = { kind: "act", seat: taker };
    }
  }

  // ---- 局末 ----

  private finish(why: string) {
    this.say(HUMAN, "info", why);
    if (this.wall.length === 0 && this.activeCount() >= 2) this.settleDraw();
    this.phase = { kind: "over" };
  }

  /** 流局：查花猪、查大叫。 */
  private settleDraw() {
    const active = [0, 1, 2, 3].filter((s) => isActive(this.players[s]));
    const pigs = active.filter((s) => holdsVoid(this.players[s]));
    const max = points(MAX_FAN);
    for (const pig of pigs) {
      for (const s of active) {
        if (pigs.includes(s)) continue;
        this.players[pig].delta -= max;
        this.players[s].delta += max;
      }
      this.settlements.push({ seat: pig, note: `花猪，赔每家 ${max} 分` });
    }
    const ready: { seat: number; score: Score }[] = [];
    for (const s of active) {
      if (pigs.includes(s)) continue;
      const p = this.players[s];
      const score = bestWaitScore(countsOfPlayer(p), p.melds, p.voidSuit);
      if (score) ready.push({ seat: s, score });
    }
    for (const r of ready) this.settlements.push({ seat: r.seat, note: `听牌，最大 ${r.score.fan} 番` });
    for (const s of active) {
      if (pigs.includes(s) || ready.some((r) => r.seat === s)) continue;
      let paid = 0;
      for (const r of ready) {
        const pts = points(r.score.fan);
        this.players[s].delta -= pts;
        this.players[r.seat].delta += pts;
        paid += pts;
      }
      this.settlements.push({ seat: s, note: ready.length === 0 ? "没听牌" : `没听牌，赔 ${paid} 分` });
    }
  }

  // ---- 电脑 ----

  /** 现在是不是在等电脑。 */
  get waitingOnAi(): boolean {
    switch (this.phase.kind) {
      case "act":
        return this.phase.seat !== HUMAN;
      case "claim":
        return claimWaiting(this.phase.claim).some((s) => s !== HUMAN);
      default:
        return false;
    }
  }

  /** 让电脑走一步；没有该电脑做的事就返回 `false`。 */
  aiStep(): boolean {
    const phase = this.phase;
    if (phase.kind === "act" && phase.seat !== HUMAN) {
      const seat = phase.seat;
      const opts = this.turnOptions(seat);
      if (opts.zimo) return this.zimo(seat);
      const p = this.players[seat];
      const g = ai.chooseGang(p, opts.gangs);
      if (g !== null) return this.gang(seat, g);
      return this.discard(seat, ai.chooseDiscard(p, this.visible(seat)));
    }
    if (phase.kind === "claim") {
      const c = phase.claim;
      for (const s of claimWaiting(c).filter((s) => s !== HUMAN)) {
        this.respond(s, ai.respond(this.players[s], c.tile, c.options[s]));
      }
      return true;
    }
    return false;
  }
}
