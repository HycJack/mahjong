// 玩家自己的区域：操作条、听牌提示、副露和手牌。

import { t as tr } from "nsh/i18n";
import { Text, View } from "nsh";
import { HUMAN, seatName } from "../game/engine";
import { tileName } from "../game/tile";
import { Appear, Button, createHandWave, cx, HandTile, Kbd, tileSizes } from "../ui";
import { compact, touch } from "./layout";
import { MeldGroup, Purse, SeatHeader } from "./Seat";
import type { Table } from "./store";

export function ActionBar(props: { table: Table }) {
  const t = props.table;
  const claim = () => t.view().claim;
  const turn = () => t.view().turn;
  return (
    <View class={cx("flex-row items-center justify-center gap-2", compact() ? "h-10" : "h-11")}>
      <If when={claim()}>
        {(c) => (
          <Appear motion="rise" class="flex-row items-center gap-2">
            <Text class="text-[13px] text-felt-foreground mr-1">
              {tr("hand.discarded", { seat: seatName(c().from), tile: tileName(c().tile) })}
            </Text>
            <If when={c().options.hu}>
              <Button label={tr("call.hu")} variant="win" size="lg" shortcut="H" testID="hu" onPress={() => t.respond("hu")} />
            </If>
            <If when={c().options.gang}>
              <Button label={tr("call.gang")} variant="call" size="lg" shortcut="G" testID="gang" onPress={() => t.respond("gang")} />
            </If>
            <If when={c().options.peng}>
              <Button label={tr("call.peng")} variant="call" size="lg" shortcut="P" testID="peng" onPress={() => t.respond("peng")} />
            </If>
            <Button label={tr("call.pass")} variant="call" size="lg" shortcut="Esc" testID="pass" onPress={() => t.respond("pass")} />
          </Appear>
        )}
      </If>
      <If when={turn() && (turn()!.zimo || turn()!.gangs.length > 0) ? turn() : null}>
        {(o) => (
          <Appear motion="rise" class="flex-row items-center gap-2">
            <If when={o().zimo}>
              <Button label={tr("call.zimo")} variant="win" size="lg" shortcut="H" testID="zimo" onPress={() => t.zimo()} />
            </If>
            <Each of={o().gangs}>
              {(g) => (
                <Button
                  label={tr("hand.kongTile", { tile: tileName(g()) })}
                  variant="call"
                  size="lg"
                  shortcut="G"
                  testID={`gang-${g()}`}
                  onPress={() => t.gang(g())}
                />
              )}
            </Each>
          </Appear>
        )}
      </If>
    </View>
  );
}

/** 听牌提示与操作说明。 */
function Hint(props: { table: Table }) {
  const t = props.table;
  const me = () => t.view().seats[HUMAN];
  const text = () => {
    const v = t.view();
    if (me().win) return tr("hand.won");
    if (v.phase === "over" || v.phase === "dingque") return "";
    const h = t.waitHint();
    if (v.turn) {
      if (v.mustPlayVoid) return tr("hand.mustVoid");
      if (h && h.after !== null) {
        return h.waits.length > 0
          ? tr("hand.after.waits", { tile: tileName(h.after), waits: h.waits.map(tileName).join(tr("list.sep")) })
          : tr("hand.after.none", { tile: tileName(h.after) });
      }
      return tr("hand.yourTurn");
    }
    if (h && h.waits.length > 0) return tr("hand.waits", { waits: h.waits.map(tileName).join(tr("list.sep")) });
    return "";
  };
  return (
    <View class={cx("flex-row items-center gap-3", compact() ? "flex-1 justify-start" : "h-6 justify-center")}>
      <Text class={cx("text-felt-foreground", compact() ? "text-[12px]" : "text-[13px]")}>
        {text()}
      </Text>
      <If when={t.view().turn !== null && !touch && !compact()}>
        <View class="flex-row items-center gap-1">
          <Kbd label="←" />
          <Kbd label="→" />
          <Text class="text-[12px] text-felt-muted">{tr("hand.key.select")}</Text>
          <Kbd label="Enter" />
          <Text class="text-[12px] text-felt-muted">{tr("hand.key.discard")}</Text>
        </View>
      </If>
    </View>
  );
}

export function MyHand(props: { table: Table }) {
  const t = props.table;
  const me = () => t.view().seats[HUMAN];
  const myTurn = () => t.view().turn !== null;
  const handLength = () => me().hand.length;
  const handSize = () => (compact() ? "ml" : "lg");
  // 悬停波浪：按每张牌在这一行里的中心算抬起量。gap-1 是 4pt，摸到的牌前面多 ml-3 / ml-2。
  const wave = createHandWave();
  const GAP = 4;
  const tileW = () => tileSizes[handSize()].w;
  const centerOf = (i: number) => i * (tileW() + GAP) + tileW() / 2;
  const drawnCenter = () => handLength() * (tileW() + GAP) - GAP + (compact() ? 8 : 12) + tileW() / 2;
  return (
    <View class={cx("items-center", compact() ? "gap-1" : "gap-1.5")}>
      <If
        when={compact()}
        else={
          <>
            <ActionBar table={t} />
            <Hint table={t} />
          </>
        }
      >
        {/* 紧凑布局：座位、提示、操作放在一行。 */}
        <View class="self-stretch flex-row items-center gap-3 h-10">
          <SeatHeader seat={me} dealer={t.view().dealer === HUMAN} />
          <Purse seat={me} compact />
          <Hint table={t} />
          <ActionBar table={t} />
        </View>
      </If>
      <View class={cx("flex-row items-end", compact() ? "gap-2" : "gap-4")}>
        <If when={!compact()}>
          <View class="pb-1 gap-3">
            <Purse seat={me} />
            <SeatHeader seat={me} dealer={t.view().dealer === HUMAN} />
          </View>
        </If>
        <If when={me().melds.length > 0}>
          <View class="flex-row gap-1.5 items-end">
            <Each of={me().melds} key="index">
              {(m) => <MeldGroup meld={m} size={compact() ? "sm" : "md"} />}
            </Each>
          </View>
        </If>
        <View
          accessibilityLabel={tr("hand.a11y")}
          class={cx("flex-row items-end gap-1", compact() ? "pt-2" : "pt-3")}
          onMouseEnter={wave.onMouseEnter}
          onMouseMove={wave.onMouseMove}
          onMouseLeave={wave.onMouseLeave}
        >
          <Each of={me().hand} key="index">
            {(tile, i) => (
              <HandTile
                size={handSize()}
                tile={tile()}
                selected={t.selected() === i()}
                muted={myTurn() && !t.canPlay(i())}
                disabled={me().win !== null}
                testID={`hand-${i()}`}
                wave={wave.at(centerOf(i()), tileW())}
                onPress={() => t.pressTile(i())}
              />
            )}
          </Each>
          <If when={me().drawn}>
            {(d) => (
              <Appear motion="draw" class={compact() ? "ml-2" : "ml-3"}>
                <HandTile
                  size={handSize()}
                  tile={d().tile}
                  selected={t.selected() === handLength()}
                  muted={myTurn() && !t.canPlay(handLength())}
                  disabled={me().win !== null}
                  testID="drawn"
                  wave={wave.at(drawnCenter(), tileW())}
                  onPress={() => t.pressTile(handLength())}
                />
              </Appear>
            )}
          </If>
        </View>
      </View>
    </View>
  );
}
