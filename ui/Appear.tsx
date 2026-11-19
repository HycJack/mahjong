import { createMotion, type JSX, View } from "nsh";
import { enter } from "./motion";

/** 第一次出现时播放一个进入动效的容器；`delay` 用来错开一组（毫秒）。减弱动效时直接到位。 */
export function Appear(props: { motion: keyof typeof enter; delay?: number; class?: string; children?: JSX.Element }) {
  const spec = enter[props.motion];
  const m = createMotion({ enter: props.delay ? { ...spec, delay: props.delay } : spec });
  return (
    <View class={props.class} style={m.style}>
      {props.children}
    </View>
  );
}
