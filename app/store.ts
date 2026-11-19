// 牌桌的状态：一局 Game、它的只读快照、玩家的选牌、播报和累计分。
// Game 是可变对象；每次改动后 bump()，快照 view() 随之重算，界面只读快照。

import { announce, batch, computed, signal, Storage } from "nsh";
import {
  canDiscard,
  type ClaimOptions,
  countsOfPlayer,
  Game,
  type GameEvent,
  HUMAN,
  holdsVoid,
  isActive,
  type Response,
  seatName,
  type Settlement,
  tilesOf,
  type Win,
} from "../game/engine";
import { type Meld, points, waits } from "../game/rules";
import { countsOf, type Suit, SUITS, suitOf, type Tile } from "../game/tile";
import { createSounds } from "../ui/sound";

export interface SeatView {
  seat: number;
  name: string;
  /** 手牌（只有玩家自己，或胡牌后摊开的才有）。 */
  hand: Tile[];
  handCount: number;
  drawn: { tile: Tile; id: number } | null;
  melds: Meld[];
  discards: Tile[];
  voidSuit: Suit | null;
  win: Win | null;
  delta: number;
  total: number;
  isTurn: boolean;
  thinking: boolean;
}

export interface TableView {
  seats: SeatView[];
  wall: number;
  dealer: number;
  phase: Game["phase"]["kind"];
  /** 玩家这一轮能对别人的牌做什么。 */
  claim: { tile: Tile; from: number; options: ClaimOptions } | null;
  /** 玩家自己回合能做什么。 */
  turn: { zimo: boolean; gangs: Tile[] } | null;
  lastDiscard: { seat: number; tile: Tile } | null;
  events: GameEvent[];
  settlements: Settlement[];
  /** 玩家手里还有缺门的牌。 */
  mustPlayVoid: boolean;
}

const TOTALS_KEY = "xuezhan.totals";
const ROUND_KEY = "xuezhan.round";

/** 电脑每步的停顿，毫秒。 */
const PACE = { act: 650, claim: 420, fast: 160 };

export function createTable(seed = Date.now()) {
  let game = new Game(seed >>> 0, 0);
  const version = signal(0);
  const round = signal(1);
  const totals = signal([0, 0, 0, 0]);
  const selected = signal<number | null>(null);
  const banner = signal<{ id: number; seat: number; text: string; kind: GameEvent["kind"] } | null>(null);
  /** 玩家已经胡了之后，电脑加快出牌。 */
  const fast = signal(false);
  let drawId = 0;
  let lastDrawn: Tile | null = null;
  let lastEvent = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let settled = false;
  const sounds = createSounds();
  let lastDrawSound = 0;
  let claimWasOpen = false;

  void (async () => {
    try {
      const t = await Storage.getItem(TOTALS_KEY);
      const r = await Storage.getItem(ROUND_KEY);
      batch(() => {
        if (t) totals.set(JSON.parse(t));
        if (r) round.set(Number(r) || 1);
      });
    } catch {
      // 读不到就从零开始。
    }
  })();

  const view = computed<TableView>(() => {
    version();
    const g = game;
    const acting = g.acting;
    const claim = g.claim;
    const seats = g.players.map((p, seat): SeatView => {
      const showHand = seat === HUMAN || !isActive(p) || g.isOver;
      if (seat === HUMAN && p.drawn !== lastDrawn) {
        lastDrawn = p.drawn;
        drawId++;
      }
      return {
        seat,
        name: seatName(seat),
        hand: showHand ? [...p.hand] : [],
        handCount: tilesOf(p).length,
        drawn: p.drawn === null ? null : { tile: p.drawn, id: seat === HUMAN ? drawId : 0 },
        melds: p.melds.map((m) => ({ ...m })),
        discards: [...p.discards],
        voidSuit: p.voidSuit,
        win: p.win,
        delta: p.delta,
        total: totals()[seat],
        isTurn: acting === seat,
        thinking: (acting === seat && seat !== HUMAN) || (claim !== null && seat !== HUMAN && claim.responses[seat] === null && Object.values(claim.options[seat]).some(Boolean)),
      };
    });
    const humanClaim = claim && claim.responses[HUMAN] === null && Object.values(claim.options[HUMAN]).some(Boolean)
      ? { tile: claim.tile, from: claim.from, options: claim.options[HUMAN] }
      : null;
    return {
      seats,
      wall: g.wall.length,
      dealer: g.dealer,
      phase: g.phase.kind,
      claim: humanClaim,
      turn: acting === HUMAN ? g.turnOptions(HUMAN) : null,
      lastDiscard: g.lastDiscard,
      events: [...g.events],
      settlements: [...g.settlements],
      mustPlayVoid: holdsVoid(g.players[HUMAN]),
    };
  });

  /** 玩家的手牌：排好序的手牌，摸到的那张在最后。 */
  const myTiles = computed(() => {
    const me = view().seats[HUMAN];
    return me.drawn === null ? me.hand : [...me.hand, me.drawn.tile];
  });

  /** 选中的牌打出后听什么（没选中时，13 张时听什么）。 */
  const waitHint = computed(() => {
    version();
    const p = game.players[HUMAN];
    if (!isActive(p) || game.phase.kind === "dingque") return null;
    const tiles = myTiles();
    const sel = selected();
    const total = tiles.length + p.melds.length * 3;
    if (total === 14) {
      if (sel === null || sel >= tiles.length) return null;
      const c = countsOf(tiles);
      c[tiles[sel]]--;
      return { after: tiles[sel], waits: waits(c, p.melds, p.voidSuit) };
    }
    return { after: null, waits: waits(countsOfPlayer(p), p.melds, p.voidSuit) };
  });

  function bump() {
    const g = game;
    batch(() => {
      version.update((v) => v + 1);
      const n = myTiles().length;
      const s = selected();
      if (s !== null && s >= n) selected.set(null);
      // 播报碰、杠、胡。
      for (const e of g.events) {
        if (e.id <= lastEvent) continue;
        lastEvent = e.id;
        if (e.seat !== HUMAN || e.kind !== "discard") announce(e.text);
        playFor(e);
        if (e.kind === "peng" || e.kind === "gang" || e.kind === "hu" || e.kind === "zimo") {
          banner.set({ id: e.id, seat: e.seat, text: { peng: "碰", gang: "杠", hu: "胡", zimo: "自摸" }[e.kind], kind: e.kind });
        }
      }
      if (!isActive(g.players[HUMAN])) fast.set(true);
    });
    // 摸到新牌、轮到你表态时的提示音。
    if (drawId !== lastDrawSound && view().seats[HUMAN].drawn !== null) {
      lastDrawSound = drawId;
      sounds.play("draw", { volume: 0.7 });
    }
    const claimOpen = view().claim !== null;
    if (claimOpen && !claimWasOpen) sounds.play("notice");
    claimWasOpen = claimOpen;
    if (g.isOver && !settled) {
      settled = true;
      if (g.players[HUMAN].win === null) sounds.play("over", { volume: 0.8, rate: g.players[HUMAN].delta >= 0 ? 1 : 0.85 });
      const next = totals().map((t, i) => t + g.players[i].delta);
      totals.set(next);
      void Storage.setItem(TOTALS_KEY, JSON.stringify(next)).catch(() => {});
    }
    schedule();
  }

  /** 牌桌上的事对应的声音：自己的响一些，别人的轻一些、音高略有不同。 */
  function playFor(e: GameEvent) {
    const mine = e.seat === HUMAN;
    const volume = mine ? 1 : 0.55;
    const rate = mine ? 1 : [1, 0.94, 1.06, 0.98][e.seat];
    if (e.kind === "discard") sounds.play("discard", { volume, rate });
    else if (e.kind === "peng") sounds.play("meld", { volume, rate });
    else if (e.kind === "gang") sounds.play("meld", { volume, rate: rate * 0.88 });
    else if (e.kind === "hu" || e.kind === "zimo") sounds.play("win", { volume: mine ? 1 : 0.5, rate: mine ? 1 : 0.9 });
  }

  function schedule() {
    if (timer !== null) return;
    if (!game.waitingOnAi) return;
    const delay = fast() ? PACE.fast : game.phase.kind === "claim" ? PACE.claim : PACE.act;
    const g = game;
    timer = setTimeout(() => {
      timer = null;
      if (g !== game) return;
      g.aiStep();
      bump();
    }, delay);
  }

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  // ---- 玩家的操作 ----

  function chooseVoid(suit: Suit) {
    game.chooseVoid(suit);
    bump();
  }

  /** 点一张牌：没选中就选中，已选中就打出。 */
  function pressTile(index: number) {
    if (selected() === index) discardSelected();
    else selected.set(index);
  }

  function discardSelected() {
    const i = selected();
    if (i === null) return;
    const t = myTiles()[i];
    if (t === undefined) return;
    if (game.discard(HUMAN, t)) {
      selected.set(null);
      bump();
    }
  }

  function moveSelection(step: number) {
    const n = myTiles().length;
    if (n === 0) return;
    const s = selected();
    selected.set(s === null ? (step > 0 ? 0 : n - 1) : (s + step + n) % n);
  }

  function respond(r: Response) {
    if (game.respond(HUMAN, r)) bump();
  }

  function zimo() {
    if (game.zimo(HUMAN)) bump();
  }

  function gang(t: Tile) {
    if (game.gang(HUMAN, t)) bump();
  }

  /** 选中的牌能不能打。 */
  function canPlay(index: number) {
    const t = myTiles()[index];
    return view().turn !== null && t !== undefined && canDiscard(game.players[HUMAN], t);
  }

  function newRound() {
    clearTimer();
    const r = round() + 1;
    void Storage.setItem(ROUND_KEY, String(r)).catch(() => {});
    batch(() => {
      game = new Game((Date.now() ^ (r * 2654435761)) >>> 0, (game.dealer + 1) % 4);
      round.set(r);
      selected.set(null);
      banner.set(null);
      fast.set(false);
      settled = false;
      lastEvent = 0;
      lastDrawn = null;
    });
    bump();
  }

  function resetTotals() {
    totals.set([0, 0, 0, 0]);
    round.set(1);
    void Storage.setItem(TOTALS_KEY, JSON.stringify([0, 0, 0, 0])).catch(() => {});
    void Storage.setItem(ROUND_KEY, "1").catch(() => {});
  }

  /** 定缺推荐：电脑的打法也用这一招。 */
  const suggestedVoid = computed<Suit>(() => {
    version();
    const tiles = tilesOf(game.players[HUMAN]);
    let best: Suit = 0;
    let key = Infinity;
    for (const s of SUITS) {
      const n = tiles.filter((t) => suitOf(t) === s).length;
      if (n < key) {
        key = n;
        best = s;
      }
    }
    return best;
  });

  const suitCounts = computed(() => {
    version();
    const tiles = tilesOf(game.players[HUMAN]);
    return SUITS.map((s) => tiles.filter((t) => suitOf(t) === s).length);
  });

  return {
    view,
    myTiles,
    waitHint,
    selected,
    banner,
    round,
    totals,
    fast,
    suggestedVoid,
    suitCounts,
    chooseVoid,
    pressTile,
    discardSelected,
    moveSelection,
    respond,
    zimo,
    gang,
    canPlay,
    newRound,
    resetTotals,
    sounds,
    points,
    /** 测试用：直接拿到这一局。 */
    game: () => game,
  };
}

export type Table = ReturnType<typeof createTable>;
