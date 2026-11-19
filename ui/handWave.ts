// 手牌的悬停波浪：指针附近的牌按距离连续抬起（钟形），指针移动时波峰带着一点滞后跟过去；
// 离开时波浪用欠阻尼弹簧回落，像涟漪平复。全部是原生动画值的组合，指针移动不需要每帧跑 JS 去算每张牌。

import { Animated, type AnimatedNode, createAnimatedValue, reduceMotion } from "nsh";
import type { MouseEvent } from "nsh";

/** 钟形曲线的采样点：离波峰的距离（以牌宽为单位）与抬起量（pt，向上为负）。 */
const SHAPE: [number, number][] = [
  [-2.6, 0],
  [-1.8, -1.2],
  [-1.1, -4.5],
  [-0.5, -8.5],
  [0, -10],
  [0.5, -8.5],
  [1.1, -4.5],
  [1.8, -1.2],
  [2.6, 0],
];

export interface HandWave {
  /** 放在手牌这一行上。 */
  onMouseEnter: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseLeave: () => void;
  /** 中心在 x（行内坐标）、宽 w 的那张牌此刻的抬起量。 */
  at: (x: number, w: number) => AnimatedNode;
}

export function createHandWave(): HandWave {
  const pointer = createAnimatedValue(0);
  const presence = createAnimatedValue(0);
  let inside = false;
  const follow = (x: number) => {
    // 波峰追着指针走：略欠阻尼，快速划过时会甩出一点余波。
    void pointer.spring(x, { stiffness: 260, damping: 20 });
  };
  return {
    onMouseEnter(e) {
      if (reduceMotion()) return;
      inside = true;
      pointer.set(e.position.x);
      void presence.spring(1, { stiffness: 320, damping: 22 });
    },
    onMouseMove(e) {
      if (reduceMotion()) return;
      if (!inside) {
        inside = true;
        pointer.set(e.position.x);
        void presence.spring(1, { stiffness: 320, damping: 22 });
      }
      follow(e.position.x);
    },
    onMouseLeave() {
      inside = false;
      // 欠阻尼：落回时轻轻弹一两下，像涟漪平复。
      void presence.spring(0, { stiffness: 220, damping: 9 });
    },
    at(x, w) {
      const wave = pointer.interpolate({
        inputRange: SHAPE.map(([d]) => x + d * w),
        outputRange: SHAPE.map(([, y]) => y),
        extrapolate: "clamp",
      });
      return Animated.multiply(wave, presence);
    },
  };
}
