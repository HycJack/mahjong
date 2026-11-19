import { type JSX, View } from "nsh";
import { cx } from "./cx";

/** 牌桌上的一块区域（felt）或外框里的卡片（card）。 */
export function Surface(props: { variant?: "card" | "felt" | "inset"; class?: string; children?: JSX.Element; accessibilityLabel?: string }) {
  const look = () =>
    ({
      card: "bg-card border border-border rounded-(--radius)",
      felt: "bg-felt rounded-[14px]",
      inset: "bg-felt-deep/70 rounded-(--radius)",
    })[props.variant ?? "card"];
  return (
    <View accessibilityLabel={props.accessibilityLabel} class={cx(look(), props.class)}>
      {props.children}
    </View>
  );
}
