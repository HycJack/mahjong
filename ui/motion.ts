// 动效 token：时长、位移、缩放。组件和页面只从这里取值（见 DESIGN.md）。

import type { MotionName, MotionPlayOptions } from "nsh";

export const duration = { instant: 120, fast: 180, base: 240, slow: 360, slower: 500 } as const;

/** 过渡用的类名，与上面的时长一一对应。 */
export const transition = {
  instant: "duration-[120ms] ease-out motion-reduce:transition-none",
  fast: "duration-[180ms] ease-out motion-reduce:transition-none",
  base: "duration-[240ms] ease-in-out motion-reduce:transition-none",
} as const;

/** 出现的动效：预设名加时长。 */
export const enter = {
  /** 牌进入牌河。 */
  discard: ["zoomIn", { duration: duration.fast, easing: "easeOut" }],
  /** 摸到的新牌落下。 */
  draw: ["fadeInDown", { duration: duration.base, easing: "easeOut" }],
  /** 操作条、分数、提示从下方升起。 */
  rise: ["fadeInUp", { duration: duration.fast, easing: "easeOut" }],
  /** 播报、胡字徽标弹出。 */
  pop: ["popIn", { duration: duration.slow }],
  /** 对话框内容。 */
  dialog: ["zoomIn", { duration: duration.slow, easing: "easeOut" }],
  fade: ["fadeIn", { duration: duration.fast }],
} satisfies Record<string, [MotionName, MotionPlayOptions]>;
