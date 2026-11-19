// 玩家自己的区域：操作条、听牌提示、副露和手牌。

import { Text, View } from "nsh";
import { HUMAN } from "../game/engine";
import { tileName } from "../game/tile";
import { Appear, Button, HandTile, Kbd } from "../ui";
import { MeldGroup, SeatHeader } from "./Seat";
import type { Table } from "./store";

export function ActionBar(props: { table: Table }) {
  const t = props.table;
  const claim = () => t.view().claim;
  const turn = () => t.view().turn;
  return (
    <View class="h-11 flex-row items-center justify-center gap-2">
      <If when={claim()}>
        {(c) => (
          <Appear motion="rise" class="flex-row items-center gap-2">
            <Text class="text-[13px] text-felt-foreground mr-1">
              {`${["你", "下家", "对家", "上家"][c().from]}打出${tileName(c().tile)}`}
            </Text>
            <If when={c().options.hu}>
              <Button label="胡" variant="win" size="lg" shortcut="H" testID="hu" onPress={() => t.respond("hu")} />
            </If>
            <If when={c().options.gang}>
              <Button label="杠" variant="call" size="lg" shortcut="G" testID="gang" onPress={() => t.respond("gang")} />
            </If>
            <If when={c().options.peng}>
              <Button label="碰" variant="call" size="lg" shortcut="P" testID="peng" onPress={() => t.respond("peng")} />
            </If>
            <Button label="过" variant="call" size="lg" shortcut="Esc" testID="pass" onPress={() => t.respond("pass")} />
          </Appear>
        )}
      </If>
      <If when={turn() && (turn()!.zimo || turn()!.gangs.length > 0) ? turn() : null}>
        {(o) => (
          <Appear motion="rise" class="flex-row items-center gap-2">
            <If when={o().zimo}>
              <Button label="自摸" variant="win" size="lg" shortcut="H" testID="zimo" onPress={() => t.zimo()} />
            </If>
            <Each of={o().gangs}>
              {(g) => (
                <Button
                  label={`杠${tileName(g())}`}
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
    if (me().win) return "你已胡牌，其余三家继续血战";
    if (v.phase === "over" || v.phase === "dingque") return "";
    const h = t.waitHint();
    if (v.turn) {
      if (v.mustPlayVoid) return "先把缺门的牌打完";
      if (h && h.after !== null) {
        return h.waits.length > 0 ? `打出${tileName(h.after)}后听：${h.waits.map(tileName).join("、")}` : `打出${tileName(h.after)}后不听牌`;
      }
      return "轮到你出牌：点一下选中，再点一下打出";
    }
    if (h && h.waits.length > 0) return `听：${h.waits.map(tileName).join("、")}`;
    return "";
  };
  return (
    <View class="h-6 flex-row items-center justify-center gap-3">
      <Text class="text-[13px] text-felt-foreground">
        {text()}
      </Text>
      <If when={t.view().turn !== null}>
        <View class="flex-row items-center gap-1">
          <Kbd label="←" />
          <Kbd label="→" />
          <Text class="text-[12px] text-felt-muted">选牌</Text>
          <Kbd label="Enter" />
          <Text class="text-[12px] text-felt-muted">打出</Text>
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
  return (
    <View class="items-center gap-1.5">
      <ActionBar table={t} />
      <Hint table={t} />
      <View class="flex-row items-end gap-4">
        <View class="pb-1">
          <SeatHeader seat={me} dealer={t.view().dealer === HUMAN} />
        </View>
        <If when={me().melds.length > 0}>
          <View class="flex-row gap-1.5 items-end">
            <Each of={me().melds} key="index">
              {(m) => <MeldGroup meld={m} size="md" />}
            </Each>
          </View>
        </If>
        <View accessibilityLabel="你的手牌" class="flex-row items-end gap-1 pt-3">
          <Each of={me().hand} key="index">
            {(tile, i) => (
              <HandTile
                tile={tile()}
                selected={t.selected() === i()}
                muted={myTurn() && !t.canPlay(i())}
                disabled={me().win !== null}
                testID={`hand-${i()}`}
                onPress={() => t.pressTile(i())}
              />
            )}
          </Each>
          <If when={me().drawn}>
            {(d) => (
              <Appear motion="draw" class="ml-3">
                <HandTile
                  tile={d().tile}
                  selected={t.selected() === handLength()}
                  muted={myTurn() && !t.canPlay(handLength())}
                  disabled={me().win !== null}
                  testID="drawn"
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
