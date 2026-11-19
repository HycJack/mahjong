import { type JSX, Text, View } from "nsh";
import { Radio, RadioGroup } from "nsh/base";
import { cx } from "./cx";
import { transition } from "./motion";

export interface ChoiceOption<T extends string> {
  id: T;
  label: string;
  /** 选项左边的小预览（例如一张牌背）。 */
  preview?: JSX.Element;
  /** 名字后面的一句补充（例如“7 张 · 推荐”）。 */
  hint?: string;
}

/** 一组单选：前面一个标题，后面是一排可选项。←/→ 在选项间移动并选中。 */
export function Choice<T extends string>(props: {
  label: string;
  value: () => T;
  options: ChoiceOption<T>[];
  onChange: (id: T) => void;
  testIDPrefix?: string;
  class?: string;
}) {
  return (
    <RadioGroup accessibilityLabel={props.label} class={cx("flex-row flex-wrap items-center gap-2", props.class)}>
      <Text class="min-w-11 text-[13px] text-muted-foreground">{props.label}</Text>
      {props.options.map((o) => (
        <Radio
          checked={props.value() === o.id}
          onChange={() => props.onChange(o.id)}
          testID={props.testIDPrefix ? `${props.testIDPrefix}-${o.id}` : undefined}
          class={cx(
            "group flex-row items-center gap-2 h-12 rounded-(--radius) border border-border bg-transparent",
            o.preview ? "pl-1.5 pr-3" : "px-4",
            "hover:bg-accent checked:border-primary checked:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
            "transition-all",
            transition.fast,
          )}
        >
          {o.preview ? <View class="rounded-[5px] group-checked:ring-2 group-checked:ring-primary">{o.preview}</View> : null}
          <Text class="text-[13px] text-foreground group-checked:font-semibold">{o.label}</Text>
          {o.hint ? <Text class="text-[12px] text-muted-foreground tabular-nums">{o.hint}</Text> : null}
        </Radio>
      ))}
    </RadioGroup>
  );
}
