import { Text, View } from "nsh";
import { cx } from "./cx";
import { transition } from "./motion";

export type BadgeVariant = "neutral" | "felt" | "turn" | "win" | "wan" | "tiao" | "tong" | "gain" | "loss";

const variants: Record<BadgeVariant, { box: string; text: string }> = {
  neutral: { box: "bg-muted", text: "text-muted-foreground" },
  felt: { box: "bg-felt-deep", text: "text-felt-foreground" },
  turn: { box: "bg-seat-turn", text: "text-seat-turn-foreground" },
  win: { box: "bg-win", text: "text-win-foreground" },
  wan: { box: "bg-tile-face", text: "text-suit-wan" },
  tiao: { box: "bg-tile-face", text: "text-suit-tiao" },
  tong: { box: "bg-tile-face", text: "text-suit-tong" },
  gain: { box: "bg-transparent", text: "text-gain" },
  loss: { box: "bg-transparent", text: "text-loss" },
};

/** 小标签：座位名、缺门、胡牌、分数。 */
export function Badge(props: { label: string; variant?: BadgeVariant; strong?: boolean; class?: string; accessibilityLabel?: string }) {
  const v = () => variants[props.variant ?? "neutral"];
  return (
    <View
      accessibilityLabel={props.accessibilityLabel}
      class={cx("h-5 px-1.5 rounded-[4px] items-center justify-center transition-colors", transition.base, v().box, props.class)}
    >
      <Text class={cx("text-[12px] leading-none", props.strong && "font-semibold", v().text)}>{props.label}</Text>
    </View>
  );
}
