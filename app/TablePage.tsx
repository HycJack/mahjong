// 牌桌：四家座位、牌河、中央信息、播报，以及定缺和结算对话框。

import { cleanup, effect, keymap, Scroll, signal, Text, untracked, View } from "nsh";
import { t as tr } from "nsh/i18n";
import { HUMAN, seatName } from "../game/engine";
import { fanName, points } from "../game/rules";
import { type Suit, suitName, suitOf, SUITS } from "../game/tile";
import { Appear, Button, Choice, cx, Dialog, ExternalLink, StylePicker, Surface, Tile } from "../ui";
import { language, setLanguage } from "../ui/language";
import { VOICE_SETTINGS } from "../ui/voice";
import { compact, REPO_URL } from "./layout";
import { balance, money, signedMoney, yuan } from "./money";
import { MyHand } from "./MyHand";
import { OtherHand, Purse, River, SeatHeader, signed } from "./Seat";
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
              <Text class="text-[13px] text-felt-foreground">{seatName(b().seat)}</Text>
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
    <Surface variant="inset" class={cx("items-center", compact() ? "w-[180px] px-3 py-1.5 gap-0.5" : "w-[220px] px-4 py-3 gap-1.5")} accessibilityLabel={tr("table.info.a11y")}>
      <Text class="text-[12px] text-felt-muted">{tr("bar.round", { n: t.round() })}</Text>
      <View class="flex-row items-baseline gap-1">
        <Text class={cx(compact() ? "text-[22px]" : "text-[30px]", "font-semibold text-felt-foreground tabular-nums leading-none")}>{String(t.view().wall)}</Text>
        <Text class="text-[12px] text-felt-muted">{tr("table.tilesLeft")}</Text>
      </View>
      <Text class={cx("line-clamp-2 text-[12px] text-felt-foreground text-center", compact() ? "min-h-[16px]" : "min-h-[32px]")}>
        {last()}
      </Text>
    </Surface>
  );
}

/** 开局：看手牌、选缺门（默认推荐的那门）、选牌背和语音，然后点“开始”。 */
function StartDialog(props: { table: Table; pick: () => Suit; onPick: (s: Suit) => void; onStart: () => void }) {
  const t = props.table;
  const open = () => t.view().phase === "dingque";
  const variants = ["wan", "tiao", "tong"] as const;
  return (
    <Dialog
      open={open()}
      title={tr("bar.round", { n: t.round() })}
      description={tr("start.description")}
      width="md"
      footer={<Button label={tr("start.go")} variant="primary" size="lg" shortcut="↵" testID="start" onPress={props.onStart} />}
    >
      <View class="gap-4">
        <View class="flex-row flex-wrap gap-0.5 justify-center bg-felt rounded-(--radius) p-3">
          <Each of={t.myTiles()} key="index">
            {(tile) => <Tile tile={tile()} size="sm" dim={suitOf(tile()) === props.pick()} />}
          </Each>
        </View>
        <View class="gap-2">
          <Choice
            label={tr("start.void")}
            value={() => variants[props.pick()]}
            onChange={(v) => props.onPick(variants.indexOf(v) as Suit)}
            testIDPrefix="void"
            options={SUITS.map((s) => ({
              id: variants[s],
              label: tr("start.option", { suit: suitName(s) }),
              hint: `${tr("start.count", { n: t.suitCounts()[s] })}${t.suggestedVoid() === s ? ` · ${tr("start.suggested")}` : ""}`,
            }))}
          />
          <StylePicker />
          <Choice
            label={tr("start.voice")}
            value={t.voice.setting}
            onChange={(v) => t.voice.set(v)}
            testIDPrefix="voice"
            options={VOICE_SETTINGS.map((v) => ({ id: v.id, label: tr(v.name) }))}
          />
          <Choice
            label={tr("start.language")}
            value={language}
            onChange={setLanguage}
            testIDPrefix="lang"
            options={[
              { id: "en", label: "English" },
              { id: "zh-CN", label: "中文" },
            ]}
          />
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
        ? tr("result.winLine", {
            order: s.win.order,
            how: s.win.from === null ? tr("result.selfDraw") : tr("result.from", { seat: seatName(s.win.from) }),
            names: s.win.score.names.map(fanName).join(" "),
            fan: s.win.score.fan,
            amount: money(yuan(points(s.win.score.fan))),
          })
        : "";
      return { seat: s.seat, name: s.name, detail: [win, ...notes].filter(Boolean).join(tr("result.sep")) || tr("result.noWin"), delta: s.delta, total: s.total };
    });
  const mine = () => t.view().seats[HUMAN].delta;
  return (
    <Dialog
      open={props.open()}
      title={mine() > 0 ? tr("result.won", { amount: money(yuan(mine())) }) : mine() < 0 ? tr("result.lost", { amount: money(yuan(-mine())) }) : tr("result.even")}
      description={tr("result.ended", { n: t.round() })}
      width="md"
      dismissible
      onClose={props.onClose}
      footer={
        <>
          <Button label={tr("result.view")} variant="ghost" onPress={props.onClose} />
          <Button label={tr("result.again")} variant="primary" shortcut="↵" testID="again" onPress={() => t.newRound()} />
        </>
      }
    >
      <View class="gap-0 border border-border rounded-(--radius)" accessibilityLabel={tr("result.a11y")}>
        <Each of={rows()} key="index">
          {(r, i) => (
            <View class={cx("flex-row items-center gap-3 px-3 py-2.5", i() > 0 && "border-t border-border")}>
              <Text class="w-14 text-[13px] font-semibold text-popover-foreground">{r().name}</Text>
              <Text class="flex-1 text-[12px] text-muted-foreground">{r().detail}</Text>
              <Text class={cx("w-16 text-right text-[14px] font-semibold tabular-nums", r().delta > 0 ? "text-gain" : r().delta < 0 ? "text-loss" : "text-muted-foreground")}>
                {signedMoney(r().delta)}
              </Text>
              <Text class="w-[112px] text-right text-[12px] text-muted-foreground tabular-nums">{tr("result.balance", { amount: money(balance(r().total)) })}</Text>
            </View>
          )}
        </Each>
      </View>
    </Dialog>
  );
}

export function RulesDialog(props: { open: () => boolean; onClose: () => void }) {
  const KEYS = ["tiles", "void", "blood", "chips", "fan", "bonus", "wind", "draw"];
  return (
    <Dialog open={props.open()} title={tr("rules.title")} dismissible onClose={props.onClose} width="md" footer={
        <>
          <ExternalLink label={tr("rules.source")} href={REPO_URL} tone="muted" class="mr-auto" />
          <Button label={tr("rules.ok")} variant="primary" onPress={props.onClose} />
        </>
      }>
      <Scroll class={compact() ? "max-h-[180px]" : "max-h-[420px]"}>
      <View class="gap-2.5">
        <Each of={KEYS}>
          {(k) => (
            <View class="flex-row gap-3">
              <Text class="w-[92px] text-[13px] font-semibold text-popover-foreground">{tr(`rules.${k()}.h`)}</Text>
              <Text class="flex-1 text-[13px] text-muted-foreground">{tr(`rules.${k()}`)}</Text>
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

  // 开局要缺的那门：没选过就是推荐的那门；每局重新来。
  const voidPick = signal<Suit | null>(null);
  effect(() => {
    t.round();
    untracked(() => voidPick.set(null));
  });
  const pick = () => voidPick() ?? t.suggestedVoid();
  const start = () => t.chooseVoid(pick());

  const blocked = () => props.rulesOpen() || resultOpen() || t.view().phase === "dingque";
  keymap.bind({
    left: () => !blocked() && t.moveSelection(-1),
    right: () => !blocked() && t.moveSelection(1),
    enter: () => {
      if (t.view().phase === "dingque" && !props.rulesOpen()) start();
      else if (resultOpen()) t.newRound();
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
    "1": () => t.view().phase === "dingque" && voidPick.set(0),
    "2": () => t.view().phase === "dingque" && voidPick.set(1),
    "3": () => t.view().phase === "dingque" && voidPick.set(2),
  });

  return (
    <View class={cx("flex-1", compact() ? "px-3 py-2 gap-1.5" : "px-5 pb-5 pt-1 gap-3")}>
      {/* 对家 */}
      <View class={cx("items-center", compact() ? "flex-row justify-center gap-3" : "gap-2")}>
        <SeatHeader seat={seat(2)} dealer={t.view().dealer === 2} align="center" />
        <OtherHand seat={seat(2)} size={compact() ? "xs" : "sm"} />
        <Purse seat={seat(2)} align="center" compact={compact()} />
      </View>

      <View class={cx("flex-1 flex-row", compact() ? "gap-2" : "gap-4")}>
        {/* 上家 */}
        <View class={cx(compact() ? "w-[150px] gap-1" : "w-[250px] gap-2")}>
          <SeatHeader seat={seat(3)} dealer={t.view().dealer === 3} />
          <OtherHand seat={seat(3)} size={compact() ? "xs" : "sm"} summary />
          <Purse seat={seat(3)} align="end" compact={compact()} />
          <River seat={seat(3)} last={lastFrom(3)} label={tr("river.3")} size={compact() ? "xs" : "sm"} class={cx("flex-1", compact() ? "mt-1" : "mt-2")} />
        </View>

        {/* 中央 */}
        <View class={cx("flex-1 items-center", compact() ? "gap-1" : "gap-3")}>
          <River seat={seat(2)} last={lastFrom(2)} label={tr("river.2")} size={compact() ? "xs" : "sm"} class={cx("justify-center", compact() ? "w-full min-h-[30px]" : "w-[460px] min-h-[94px]")} />
          <View class="flex-1 justify-center">
            <Center table={t} />
          </View>
          <River seat={seat(HUMAN)} last={lastFrom(HUMAN)} label={tr("river.0")} size={compact() ? "xs" : "sm"} class={cx("justify-center", compact() ? "w-full min-h-[30px]" : "w-[460px] min-h-[94px]")} />
        </View>

        {/* 下家 */}
        <View class={cx("items-end", compact() ? "w-[150px] gap-1" : "w-[250px] gap-2")}>
          <SeatHeader seat={seat(1)} dealer={t.view().dealer === 1} />
          <OtherHand seat={seat(1)} size={compact() ? "xs" : "sm"} summary />
          <Purse seat={seat(1)} align="start" compact={compact()} />
          <River seat={seat(1)} last={lastFrom(1)} label={tr("river.1")} size={compact() ? "xs" : "sm"} class={cx("flex-1 justify-end", compact() ? "mt-1" : "mt-2")} />
        </View>
      </View>

      <MyHand table={t} />
      <Banner table={t} />
      <StartDialog table={t} pick={pick} onPick={(s) => voidPick.set(s)} onStart={start} />
      <ResultDialog table={t} open={resultOpen} onClose={() => resultOpen.set(false)} />
    </View>
  );
}

