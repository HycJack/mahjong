import { type JSX, Text } from "nsh";
import { Button as BaseButton } from "nsh/base";
import { cx } from "./cx";
import { transition } from "./motion";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "call" | "win";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, { box: string; text: string }> = {
  primary: { box: "bg-primary hover:bg-primary/90 active:bg-primary/80", text: "text-primary-foreground" },
  secondary: { box: "bg-secondary hover:bg-accent active:bg-accent/80", text: "text-secondary-foreground" },
  ghost: { box: "bg-transparent hover:bg-accent active:bg-accent/80", text: "text-foreground" },
  outline: { box: "bg-card border border-border hover:bg-accent active:bg-accent/80", text: "text-foreground" },
  // 牌桌上的碰、杠、过：象牙底，压在绒布上。
  call: { box: "bg-tile-face border-b-2 border-tile-edge hover:bg-tile-face/90 active:bg-tile-edge", text: "text-tile-ink" },
  win: { box: "bg-win border-b-2 border-win/60 hover:bg-win/90 active:bg-win/80", text: "text-win-foreground" },
};

const sizes: Record<ButtonSize, { box: string; text: string }> = {
  sm: { box: "h-7 px-2.5 gap-1.5", text: "text-[12px]" },
  md: { box: "h-8 px-3.5 gap-2", text: "text-[13px]" },
  lg: { box: "h-11 min-w-[72px] px-5 gap-2", text: "text-[17px] font-semibold" },
};

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** 快捷键提示，跟在文字后面，如 "H"。 */
  shortcut?: string;
  tooltip?: string;
  accessibilityLabel?: string;
  testID?: string;
  /** 布局用：宽度、flex、外边距。 */
  class?: string;
  icon?: JSX.Element;
  onPress?: () => void;
}

export function Button(props: ButtonProps) {
  const v = () => variants[props.variant ?? "secondary"];
  const s = () => sizes[props.size ?? "md"];
  return (
    <BaseButton
      disabled={props.disabled}
      tooltip={props.tooltip}
      testID={props.testID}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      onPress={props.onPress}
      class={cx(
        "flex-row items-center justify-center rounded-(--radius) transition-all active:scale-[0.97]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-45",
        transition.instant,
        v().box,
        s().box,
        props.class,
      )}
    >
      {props.icon}
      <Text class={cx(v().text, s().text)}>{props.label}</Text>
      {props.shortcut ? <Text class={cx(v().text, "text-[11px] opacity-60")}>{props.shortcut}</Text> : null}
    </BaseButton>
  );
}
