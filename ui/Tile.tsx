import { Animated, type AnimatedNode, Canvas, cleanup, createAnimatedValue, createMotion, effect, Easing, reduceMotion, untracked, View } from "nsh";
import { Button as BaseButton } from "nsh/base";
import { type Tile as TileId, tileName } from "../game/tile";
import { cx } from "./cx";
import { nudge, transition } from "./motion";
import { drawBack, drawBody, drawFace, drawSheen, palette, type TileBox } from "./tileArt";

export type TileSize = "xs" | "sm" | "md" | "ml" | "lg";

/** 每档尺寸：整张宽高、底部侧边厚度、圆角（pt）。 */
export const sizes: Record<TileSize, TileBox> = {
  xs: { w: 20, h: 28, edge: 2, r: 3 },
  sm: { w: 32, h: 44, edge: 3, r: 4 },
  md: { w: 38, h: 52, edge: 4, r: 5 },
  ml: { w: 42, h: 58, edge: 4, r: 5 },
  lg: { w: 58, h: 80, edge: 6, r: 7 },
};

/** 牌面图案占的区域：四周留边。 */
function faceRect(b: TileBox) {
  const fh = b.h - b.edge;
  return { x: b.w * 0.09, y: fh * 0.08, w: b.w * 0.82, h: fh * 0.84 };
}

/** 胡的那张：一道光泽隔一会儿扫过一次。减弱动效时不扫。 */
function createSheen(b: TileBox) {
  const x = createAnimatedValue(-b.w);
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(x, { toValue: b.w * 1.8, duration: 1100, easing: Easing.inOut(Easing.ease) }),
      Animated.delay(1800),
    ]),
    { resetBeforeIteration: true },
  );
  effect(() => {
    if (reduceMotion()) untracked(() => loop.stop());
    else untracked(() => void loop.start());
  });
  cleanup(() => loop.stop());
  return x;
}

/** 画一张正面朝上的牌。 */
function TileCanvas(props: { tile: TileId; size: TileSize; shine?: boolean }) {
  const b = sizes[props.size];
  const f = faceRect(b);
  const sheen = props.shine ? createSheen(b) : null;
  return (
    <Canvas
      style={{ width: b.w, height: b.h }}
      draw={(c) => {
        const p = palette();
        drawBody(c, b, p);
        drawFace(c, props.tile, f.x, f.y, f.w, f.h, p);
        if (sheen) drawSheen(c, b, p, sheen);
      }}
    />
  );
}

/** 一张静态的牌：牌河、副露、摊开的手牌。`highlight` 是刚打出 / 胡的那张。 */
export function Tile(props: { tile: TileId; size?: TileSize; highlight?: boolean; dim?: boolean; shine?: boolean }) {
  const size = () => props.size ?? "md";
  return (
    <View
      accessibilityLabel={tileName(props.tile)}
      class={cx(
        "rounded-(--radius-tile)",
        props.highlight && "ring-2 ring-seat-turn",
        props.dim && "opacity-50",
      )}
    >
      <TileCanvas tile={props.tile} size={size()} shine={props.shine} />
    </View>
  );
}

/** 牌背：别人的手牌、暗杠。 */
export function TileBack(props: { size?: TileSize }) {
  const b = sizes[props.size ?? "md"];
  return <Canvas style={{ width: b.w, height: b.h }} draw={(c) => drawBack(c, b, palette())} />;
}

/** 自己手里的一张牌：可以选中、打出。 */
export function HandTile(props: {
  tile: TileId;
  /** 手牌尺寸：桌面 lg，手机 ml。 */
  size?: "lg" | "ml";
  selected?: boolean;
  /** 现在不能打（缺门没打完时的其他牌，或没轮到）。 */
  disabled?: boolean;
  /** 只是暗一些，仍可选（缺门没打完时的其他牌）。 */
  muted?: boolean;
  testID?: string;
  /** 悬停波浪在这张牌处的抬起量（见 handWave.ts）。 */
  wave?: AnimatedNode;
  onPress?: () => void;
}) {
  // 选中时整张牌用弹簧抬起，取消时落回；连按两张也能接着上一段速度走。
  const lift = createMotion();
  effect(() => {
    const up = props.selected === true;
    untracked(() => void lift.play(nudge.lift(up ? -14 : 0)));
  });
  return (
    <View style={{ transform: [{ translateY: props.wave ? Animated.add(lift.translateY, props.wave) : lift.translateY }] }}>
    <BaseButton
      selected={props.selected}
      disabled={props.disabled}
      testID={props.testID}
      accessibilityLabel={tileName(props.tile)}
      onPress={props.onPress}
      class={cx(
        "rounded-(--radius-tile) transition-all selected:ring-2 selected:ring-seat-turn",
        "focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
        transition.base,
        props.muted && "opacity-45",
      )}
    >
      <TileCanvas tile={props.tile} size={props.size ?? "lg"} />
    </BaseButton>
    </View>
  );
}
