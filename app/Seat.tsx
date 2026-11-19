// 一家的座位：名字、缺门、分数、状态，以及副露和手牌。

import { createMotion, effect, Text, untracked, View } from "nsh";
import { isGang, type Meld, points } from "../game/rules";
import { suitName, type Suit, type Tile as TileId } from "../game/tile";
import { Appear, Badge, type BadgeVariant, cx, nudge, Tile, TileBack, type TileSize } from "../ui";
import { money, signedMoney, yuan } from "./money";
import type { SeatView } from "./store";

const voidVariant: BadgeVariant[] = ["wan", "tiao", "tong"];

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** 思考中的小圆点，只在思考时呼吸。 */
function Thinking() {
  const m = createMotion({ enter: "glow", iterations: "infinite", duration: 1200 });
  return <View accessibilityLabel="思考中" class="w-2 h-2 rounded-full bg-seat-turn" style={m.style} />;
}

/** 座位的标题行。 */
export function SeatHeader(props: { seat: () => SeatView; dealer: boolean; align?: "start" | "center" }) {
  const s = () => props.seat();
  // 轮到这家时名字弹一下；分数变动时数字弹一下。
  const turnPop = createMotion();
  const scorePop = createMotion();
  let wasTurn = false;
  effect(() => {
    const turn = s().isTurn;
    if (turn && !wasTurn) untracked(() => void turnPop.play(nudge.bump));
    wasTurn = turn;
  });
  let lastDelta = 0;
  effect(() => {
    const d = s().delta;
    if (d !== lastDelta) untracked(() => void scorePop.play(nudge.bump));
    lastDelta = d;
  });
  return (
    <View class={cx("flex-row items-center gap-1.5", props.align === "center" && "justify-center")}>
      <View style={turnPop.style}>
        <Badge label={s().name} variant={s().isTurn ? "turn" : "felt"} strong />
      </View>
      <If when={props.dealer}>
        <Badge label="庄" variant="felt" accessibilityLabel="庄家" />
      </If>
      <If when={s().voidSuit !== null}>
        <Badge
          label={`缺${suitName(s().voidSuit as Suit)}`}
          variant={voidVariant[s().voidSuit ?? 0]}
          accessibilityLabel={`定缺${suitName(s().voidSuit as Suit)}`}
        />
      </If>
      <If when={s().win}>
        {(win) => (
          <Appear motion="pop">
            <Badge
              label={`${win().from === null ? "自摸" : "胡"} · ${win().score.fan > 0 ? `${win().score.fan} 番` : "平胡"}`}
              variant="win"
              strong
              accessibilityLabel={`第${win().order}个胡牌，${win().score.fan}番，${money(yuan(points(win().score.fan)))}`}
            />
          </Appear>
        )}
      </If>
      <If when={s().thinking}>
        <Thinking />
      </If>
      <Text
        style={scorePop.style}
        accessibilityLabel={`本局${signedMoney(s().delta)}`}
        class={cx(
          "text-[13px] font-semibold tabular-nums ml-1",
          s().delta > 0 ? "text-gain" : s().delta < 0 ? "text-loss" : "text-felt-muted",
        )}
      >
        {signedMoney(s().delta)}
      </Text>
    </View>
  );
}

/** 一组副露。暗杠第一、四张盖着。 */
export function MeldGroup(props: { meld: () => Meld; size: TileSize }) {
  const n = () => (isGang(props.meld().kind) ? 4 : 3);
  return (
    <View class="flex-row gap-px" accessibilityLabel={meldLabel(props.meld())}>
      <Each of={Array.from({ length: n() }, (_, i) => i)}>
        {(i) => (
          <If
            when={props.meld().kind === "angang" && (i() === 0 || i() === 3)}
            else={<Tile tile={props.meld().tile} size={props.size} />}
          >
            <TileBack size={props.size} />
          </If>
        )}
      </Each>
    </View>
  );
}

function meldLabel(m: Meld) {
  return { peng: "碰", minggang: "明杠", bugang: "补杠", angang: "暗杠" }[m.kind];
}

/** 别人的手：没胡是牌背，胡了摊开（胡的那张高亮）。 */
export function OtherHand(props: { seat: () => SeatView; size: TileSize; summary?: boolean }) {
  const s = () => props.seat();
  // 两侧（summary）是竖向一栏：副露、手牌各占一行，摊开的手牌按栏宽换行。
  const stacked = () => props.summary === true;
  return (
    <View class={cx("gap-1.5", stacked() ? "self-stretch" : "flex-row items-end")}>
      <View class={cx("flex-row gap-1.5 items-end", stacked() && "flex-wrap")}>
        <Each of={s().melds} key="index">
          {(m) => (
            <Appear motion="meld">
              <MeldGroup meld={m} size={props.size} />
            </Appear>
          )}
        </Each>
      </View>
      <If
        when={s().hand.length > 0}
        else={
          stacked() ? (
            <View class="flex-row items-center gap-1" accessibilityLabel={`${s().handCount} 张手牌`}>
              <TileBack size={props.size} />
              <Text class="text-[12px] text-felt-muted tabular-nums">{`×${s().handCount}`}</Text>
            </View>
          ) : (
            <View class="flex-row gap-px" accessibilityLabel={`${s().handCount} 张手牌`}>
              <Each of={Array.from({ length: s().handCount }, (_, i) => i)} key="index">
                {() => <TileBack size={props.size} />}
              </Each>
            </View>
          )
        }
      >
        <View class={cx("flex-row gap-px", stacked() && "flex-wrap")}>
          <Each of={revealed(s())} key="index">
            {(t, i) => (
              <Appear motion="reveal" delay={i() * 25}>
                <Tile tile={t().tile} size={stacked() ? "xs" : props.size} highlight={t().win} shine={t().win} />
              </Appear>
            )}
          </Each>
        </View>
      </If>
    </View>
  );
}

/** 摊开的手牌：胡的那张放在最后并标出。 */
function revealed(s: SeatView): { tile: TileId; win: boolean }[] {
  const tiles = s.drawn === null ? [...s.hand] : [...s.hand, s.drawn.tile];
  const win = s.win?.tile;
  if (win === undefined) return tiles.map((tile) => ({ tile, win: false }));
  const i = tiles.lastIndexOf(win);
  const rest = tiles.filter((_, k) => k !== i);
  return [...rest.map((tile) => ({ tile, win: false })), { tile: win, win: true }];
}

/** 牌河：打出的牌，最后一张标出。 */
export function River(props: { seat: () => SeatView; last: () => boolean; label: string; size?: TileSize; class?: string }) {
  return (
    <View accessibilityLabel={props.label} class={cx("flex-row flex-wrap content-start", props.size === "xs" ? "gap-[2px]" : "gap-[3px]", props.class)}>
      <Each of={props.seat().discards} key="index">
        {(t, i) => (
          <Appear motion="discard">
            <Tile tile={t()} size={props.size ?? "sm"} highlight={props.last() && i() === props.seat().discards.length - 1} />
          </Appear>
        )}
      </Each>
    </View>
  );
}
