// 动效 token：时长、弹簧和各处的进入动效。组件和页面只从这里取值（见 DESIGN.md）。
// 会“落下”“弹起”的东西（牌、播报、徽标）用弹簧，颜色和遮罩用时长曲线。

import type { MotionSpec, MotionSpring } from "nsh";

export const duration = { instant: 120, fast: 180, base: 240, slow: 360, slower: 500 } as const;

/** 过渡用的类名，与上面的时长一一对应。 */
export const transition = {
  instant: "duration-[120ms] ease-out motion-reduce:transition-none",
  fast: "duration-[180ms] ease-out motion-reduce:transition-none",
  base: "duration-[240ms] ease-in-out motion-reduce:transition-none",
} as const;

/** 弹簧：snappy 跟手不晃，soft 稳一点，bouncy 带一次回弹（只给“好消息”）。 */
export const spring = {
  snappy: { stiffness: 520, damping: 34, mass: 1 },
  soft: { stiffness: 260, damping: 26, mass: 1 },
  bouncy: { stiffness: 360, damping: 15, mass: 1 },
} satisfies Record<string, MotionSpring>;

const fade = (ms: number): MotionSpec => ({ keyframes: { opacity: [0, 1] }, duration: ms, easing: "easeOut" });

/** 进入动效。弹簧从第一帧出发，停在最后一帧；透明度单独用时长淡入。 */
export const enter = {
  /** 牌落进牌河：从上方 10pt、0.7 倍弹到位。 */
  discard: { keyframes: { scale: [0.7, 1], translateY: [-10, 0], opacity: [0, 1] }, spring: spring.snappy },
  /** 摸到的新牌从上方 24pt 落下。 */
  draw: { keyframes: { translateY: [-24, 0], opacity: [0, 1] }, spring: spring.soft },
  /** 碰、杠的牌组从一侧滑入。 */
  meld: { keyframes: { translateX: [16, 0], scale: [0.85, 1], opacity: [0, 1] }, spring: spring.soft },
  /** 胡牌后摊开的手牌逐张翻起。 */
  reveal: { keyframes: { translateY: [8, 0], scale: [0.9, 1], opacity: [0, 1] }, spring: spring.soft },
  /** 操作条、提示从下方升起。 */
  rise: { keyframes: { translateY: [12, 0], opacity: [0, 1] }, spring: spring.snappy },
  /** 播报、胡字徽标弹出，带回弹。 */
  pop: { keyframes: { scale: [0.4, 1], opacity: [0, 1] }, spring: spring.bouncy },
  /** 对话框内容。 */
  dialog: { keyframes: { scale: [0.92, 1], translateY: [8, 0], opacity: [0, 1] }, spring: spring.soft },
  fade: fade(duration.fast),
} satisfies Record<string, MotionSpec>;

/** 强调：已经在场的东西被“拍一下”（分数变动、轮到谁）。 */
export const nudge: { bump: MotionSpec; lift: (y: number) => MotionSpec } = {
  bump: { keyframes: { scale: [1.25, 1] }, spring: spring.bouncy },
  lift: (y) => ({ keyframes: { translateY: [y] }, spring: spring.snappy }),
};
