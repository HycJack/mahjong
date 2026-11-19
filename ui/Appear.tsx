import { createMotion, type JSX, View } from "nsh";
import { enter } from "./motion";

/** 第一次出现时播放一个进入动效的容器（减弱动效时由系统跳过）。 */
export function Appear(props: { motion: keyof typeof enter; class?: string; children?: JSX.Element }) {
  const [name, options] = enter[props.motion];
  const m = createMotion({ enter: name, ...options });
  return (
    <View class={props.class} style={m.style}>
      {props.children}
    </View>
  );
}
