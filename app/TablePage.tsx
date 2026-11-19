// 牌桌：四家座位、牌河、中央信息、播报，以及定缺和结算对话框。

import { cleanup, effect, keymap, Scroll, signal, Text, untracked, View } from "nsh";
import { HUMAN, SEAT_NAMES } from "../game/engine";
import { points } from "../game/rules";
import { type Suit, suitName, SUITS } from "../game/tile";
import { Appear, Button, cx, Dialog, ExternalLink, Surface, Tile } from "../ui";
import { compact, REPO_URL } from "./layout";
import { MyHand } from "./MyHand";
import { OtherHand, River, SeatHeader, signed } from "./Seat";
import type { Table } from "./store";

/** 碰、杠、胡的大字播报，出现后自己淡出。 */
function Banner(props: { table: Table }) {
  const t = props.table;
  return (
    <View class="absolute inset-0 items-center justify-center pointer-events-none">
      <Each of={t.banner() ? [t.banner()!] : []} key={(b) => b.id}>
        {(b) => {
          const id = b().id;
          const timer = setTimeout(() => {
            if (t.banner()?.id === id) t.banner.set(null);
          }, 1100);
          cleanup(() => clearTimeout(timer));
          return (
            <Appear motion="pop" class="items-center gap-1">
              <View
                class={cx(
                  "px-6 py-2 rounded-[12px] shadow-lg",
                  b().kind === "hu" || b().kind === "zimo" ? "bg-win" : "bg-tile-face",
                )}
              >
                <Text
                  class={cx(
                    "text-[40px] font-bold leading-tight",
                    b().kind === "hu" || b().kind === "zimo" ? "text-win-foreground" : "text-tile-ink",
                  )}
                >
                  {b().text}
                </Text>
              </View>
              <Text class="text-[13px] text-felt-foreground">{SEAT_NAMES[b().seat]}</Text>
            </Appear>
          );
        }}
      </Each>
    </View>
  );
}

/** 中央：剩余牌数、局数、最近的事。 */
function Center(props: { table: Table }) {
  const t = props.table;
  const last = () => {
    const e = t.view().events;
    return e.length > 0 ? e[e.length - 1].text : "";
  };
  return (
    <Surface variant="inset" class={cx("items-center", compact() ? "w-[180px] px-3 py-1.5 gap-0.5" : "w-[220px] px-4 py-3 gap-1.5")} accessibilityLabel="牌桌信息">
      <Text class="text-[12px] text-felt-muted">{`第 ${t.round()} 局`}</Text>
      <View class="flex-row items-baseline gap-1">
        <Text class={cx(compact() ? "text-[22px]" : "text-[30px]", "font-semibold text-felt-foreground tabular-nums leading-none")}>{String(t.view().wall)}</Text>
        <Text class="text-[12px] text-felt-muted">张</Text>
      </View>
      <Text class={cx("line-clamp-2 text-[12px] text-felt-foreground text-center", compact() ? "min-h-[16px]" : "min-h-[32px]")}>
        {last()}
      </Text>
    </Surface>
  );
}

function VoidDialog(props: { table: Table }) {
  const t = props.table;
  const open = () => t.view().phase === "dingque";
  const variants = ["wan", "tiao", "tong"] as const;
  return (
    <Dialog
      open={open()}
      title="定缺"
      description="选一门不要的花色：要先把这门打完，手里有它就不能胡。"
      width="md"
    >
      <View class="gap-4">
        <View class="flex-row flex-wrap gap-0.5 justify-center bg-felt rounded-(--radius) p-3">
          <Each of={t.myTiles()} key="index">
            {(tile) => <Tile tile={tile()} size="sm" />}
          </Each>
        </View>
        <View class="flex-row gap-3">
          <Each of={SUITS}>
            {(s) => (
              <View class="flex-1 gap-1 items-center">
                <Button
                  label={`缺${suitName(s())}`}
                  variant={t.suggestedVoid() === s() ? "primary" : "outline"}
                  size="lg"
                  shortcut={String(s() + 1)}
                  class="w-full"
                  testID={`void-${variants[s()]}`}
                  onPress={() => t.chooseVoid(s() as Suit)}
                />
                <Text class="text-[12px] text-muted-foreground">
                  {`${t.suitCounts()[s()]} 张${t.suggestedVoid() === s() ? " · 推荐" : ""}`}
                </Text>
              </View>
            )}
          </Each>
        </View>
      </View>
    </Dialog>
  );
}

function ResultDialog(props: { table: Table; open: () => boolean; onClose: () => void }) {
  const t = props.table;
  const rows = () =>
    t.view().seats.map((s) => {
      const notes = t.view().settlements.filter((n) => n.seat === s.seat).map((n) => n.note);
      const win = s.win
        ? `第 ${s.win.order} 个胡 · ${s.win.from === null ? "自摸" : `点炮：${SEAT_NAMES[s.win.from]}`} · ${s.win.score.names.join(" ")} · ${s.win.score.fan} 番 ${points(s.win.score.fan)} 分`
        : "";
      return { seat: s.seat, name: s.name, detail: [win, ...notes].filter(Boolean).join("；") || "未胡", delta: s.delta, total: s.total };
    });
  const mine = () => t.view().seats[HUMAN].delta;
  return (
    <Dialog
      open={props.open()}
      title={mine() > 0 ? `本局赢 ${mine()} 分` : mine() < 0 ? `本局输 ${-mine()} 分` : "本局不输不赢"}
      description={`第 ${t.round()} 局结束`}
      width="md"
      dismissible
      onClose={props.onClose}
      footer={
        <>
          <Button label="看牌桌" variant="ghost" onPress={props.onClose} />
          <Button label="再来一局" variant="primary" shortcut="↵" testID="again" onPress={() => t.newRound()} />
        </>
      }
    >
      <View class="gap-0 border border-border rounded-(--radius)" accessibilityLabel="结算">
        <Each of={rows()} key="index">
          {(r, i) => (
            <View class={cx("flex-row items-center gap-3 px-3 py-2.5", i() > 0 && "border-t border-border")}>
              <Text class="w-10 text-[13px] font-semibold text-popover-foreground">{r().name}</Text>
              <Text class="flex-1 text-[12px] text-muted-foreground">{r().detail}</Text>
              <Text class={cx("w-12 text-right text-[14px] font-semibold tabular-nums", r().delta > 0 ? "text-gain" : r().delta < 0 ? "text-loss" : "text-muted-foreground")}>
                {signed(r().delta)}
              </Text>
              <Text class="w-14 text-right text-[12px] text-muted-foreground tabular-nums">{`累计 ${signed(r().total)}`}</Text>
            </View>
          )}
        </Each>
      </View>
    </Dialog>
  );
}

export function RulesDialog(props: { open: () => boolean; onClose: () => void }) {
  const lines = [
    ["牌", "只有万、条、筒，共 108 张；不能吃，只能碰和杠。"],
    ["定缺", "开局选一门不要的花色，先打完它；手里有缺门的牌不能胡。"],
    ["血战", "一家胡了就离场，其余继续，直到只剩一家或牌摸完。一炮可以多响。"],
    ["计分", "平胡 1 分，每番翻倍，最多 5 番（32 分）。自摸三家都给。"],
    ["番型", "清一色 2、对对胡 1、将对 3、七对 2、带幺九 2、金钩钓 1，每个根（四张一样）1。"],
    ["加番", "自摸、杠上开花、杠上炮、抢杠胡、海底捞月、海底炮，各 1 番。"],
    ["刮风下雨", "暗杠每家给 2 分，补杠每家给 1 分，直杠由放杠的人给 2 分。"],
    ["流局", "查花猪：手里还有缺门的赔每家 32 分。查大叫：没听牌的赔听牌的人他能胡的最大分。"],
  ];
  return (
    <Dialog open={props.open()} title="规则" dismissible onClose={props.onClose} width="md" footer={
        <>
          <ExternalLink label="源代码与下载" href={REPO_URL} tone="muted" class="mr-auto" />
          <Button label="知道了" variant="primary" onPress={props.onClose} />
        </>
      }>
      <Scroll class={compact() ? "max-h-[180px]" : "max-h-[420px]"}>
      <View class="gap-2.5">
        <Each of={lines}>
          {(l) => (
            <View class="flex-row gap-3">
              <Text class="w-16 text-[13px] font-semibold text-popover-foreground">{l()[0]}</Text>
              <Text class="flex-1 text-[13px] text-muted-foreground">{l()[1]}</Text>
            </View>
          )}
        </Each>
      </View>
      </Scroll>
    </Dialog>
  );
}

export function TablePage(props: { table: Table; rulesOpen: () => boolean; onRulesClose: () => void }) {
  const t = props.table;
  const seat = (s: number) => () => t.view().seats[s];
  const lastFrom = (s: number) => () => t.view().lastDiscard?.seat === s;
  const resultOpen = signal(false);

  // 一局结束时打开结算，新一局时关上。
  effect(() => {
    const over = t.view().phase === "over";
    untracked(() => resultOpen.set(over));
  });

  const blocked = () => props.rulesOpen() || resultOpen() || t.view().phase === "dingque";
  keymap.bind({
    left: () => !blocked() && t.moveSelection(-1),
    right: () => !blocked() && t.moveSelection(1),
    enter: () => {
      if (resultOpen()) t.newRound();
      else if (!blocked()) t.discardSelected();
    },
    h: () => {
      if (blocked()) return;
      if (t.view().claim?.options.hu) t.respond("hu");
      else if (t.view().turn?.zimo) t.zimo();
    },
    p: () => !blocked() && t.view().claim?.options.peng && t.respond("peng"),
    g: () => {
      if (blocked()) return;
      if (t.view().claim?.options.gang) t.respond("gang");
      else {
        const g = t.view().turn?.gangs[0];
        if (g !== undefined) t.gang(g);
      }
    },
    escape: () => !blocked() && t.view().claim && t.respond("pass"),
    "1": () => t.view().phase === "dingque" && t.chooseVoid(0),
    "2": () => t.view().phase === "dingque" && t.chooseVoid(1),
    "3": () => t.view().phase === "dingque" && t.chooseVoid(2),
  });

  return (
    <Surface variant="felt" class={cx("flex-1", compact() ? "px-3 py-2 gap-1.5" : "p-4 gap-3")}>
      {/* 对家 */}
      <View class={cx("items-center", compact() ? "flex-row justify-center gap-3" : "gap-2")}>
        <SeatHeader seat={seat(2)} dealer={t.view().dealer === 2} align="center" />
        <OtherHand seat={seat(2)} size={compact() ? "xs" : "sm"} />
      </View>

      <View class={cx("flex-1 flex-row", compact() ? "gap-2" : "gap-4")}>
        {/* 上家 */}
        <View class={cx(compact() ? "w-[150px] gap-1" : "w-[250px] gap-2")}>
          <SeatHeader seat={seat(3)} dealer={t.view().dealer === 3} />
          <OtherHand seat={seat(3)} size={compact() ? "xs" : "sm"} summary />
          <River seat={seat(3)} last={lastFrom(3)} label="上家的牌河" size={compact() ? "xs" : "sm"} class={cx("flex-1", compact() ? "mt-1" : "mt-2")} />
        </View>

        {/* 中央 */}
        <View class={cx("flex-1 items-center", compact() ? "gap-1" : "gap-3")}>
          <River seat={seat(2)} last={lastFrom(2)} label="对家的牌河" size={compact() ? "xs" : "sm"} class={cx("justify-center", compact() ? "w-full min-h-[30px]" : "w-[460px] min-h-[94px]")} />
          <View class="flex-1 justify-center">
            <Center table={t} />
          </View>
          <River seat={seat(HUMAN)} last={lastFrom(HUMAN)} label="你的牌河" size={compact() ? "xs" : "sm"} class={cx("justify-center", compact() ? "w-full min-h-[30px]" : "w-[460px] min-h-[94px]")} />
        </View>

        {/* 下家 */}
        <View class={cx("items-end", compact() ? "w-[150px] gap-1" : "w-[250px] gap-2")}>
          <SeatHeader seat={seat(1)} dealer={t.view().dealer === 1} />
          <OtherHand seat={seat(1)} size={compact() ? "xs" : "sm"} summary />
          <River seat={seat(1)} last={lastFrom(1)} label="下家的牌河" size={compact() ? "xs" : "sm"} class={cx("flex-1 justify-end", compact() ? "mt-1" : "mt-2")} />
        </View>
      </View>

      <MyHand table={t} />
      <Banner table={t} />
      <VoidDialog table={t} />
      <ResultDialog table={t} open={resultOpen} onClose={() => resultOpen.set(false)} />
    </Surface>
  );
}

