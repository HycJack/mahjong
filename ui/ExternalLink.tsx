import { Text } from "nsh";
import { Link } from "nsh/base";
import { cx } from "./cx";
import { transition } from "./motion";

/** 指向站外的链接：样子与 ghost 小按钮一致，带 ↗ 表明会离开应用。 */
export function ExternalLink(props: { label: string; href: string; tone?: "default" | "muted" | "felt"; class?: string; accessibilityLabel?: string }) {
  return (
    <Link
      href={props.href}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      class={cx(
        "h-7 px-2.5 flex-row items-center gap-1 rounded-(--radius) bg-transparent active:scale-[0.97]",
        props.tone === "felt" ? "hover:bg-felt-deep active:bg-felt-deep/80" : "hover:bg-accent active:bg-accent/80",
        "transition-all focus-visible:ring-2 focus-visible:ring-ring",
        transition.instant,
        props.class,
      )}
    >
      <Text class={cx("text-[12px]", props.tone === "felt" ? "text-felt-foreground" : props.tone === "muted" ? "text-muted-foreground" : "text-foreground")}>
        {props.label}
      </Text>
      <Text class={cx("text-[11px]", props.tone === "felt" ? "text-felt-muted" : "text-muted-foreground")}>↗</Text>
    </Link>
  );
}
