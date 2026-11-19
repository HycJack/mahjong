import { createMotion, effect, Text, untracked, View } from "nsh";
import { Button as BaseButton } from "nsh/base";
import { type Tile as TileId, tileName } from "../game/tile";
import { cx } from "./cx";
import { nudge, transition } from "./motion";
import { type FaceMetrics, TileFace } from "./TileFace";

export type TileSize = "xs" | "sm" | "md" | "ml" | "lg";

const sizes: Record<TileSize, { box: string; edge: string; face: FaceMetrics }> = {
  xs: { box: "w-[20px] h-[28px]", edge: "border-b-[2px]", face: { w: 16, h: 21, rank: 11, wan: 9 } },
  sm: { box: "w-[32px] h-[44px]", edge: "border-b-[3px]", face: { w: 26, h: 34, rank: 16, wan: 13 } },
  md: { box: "w-[38px] h-[52px]", edge: "border-b-[3px]", face: { w: 31, h: 41, rank: 19, wan: 16 } },
  ml: { box: "w-[42px] h-[58px]", edge: "border-b-[3px]", face: { w: 35, h: 46, rank: 20, wan: 18 } },
  lg: { box: "w-[58px] h-[80px]", edge: "border-b-[5px]", face: { w: 48, h: 64, rank: 28, wan: 25 } },
};

function Face(props: { tile: TileId; size: TileSize }) {
  return <TileFace tile={props.tile} metrics={sizes[props.size].face} />;
}

const faceBox = "items-center justify-center rounded-(--radius-tile) bg-tile-face border-tile-edge";

/** 一张静态的牌：牌河、副露、摊开的手牌。 */
export function Tile(props: { tile: TileId; size?: TileSize; highlight?: boolean; dim?: boolean }) {
  const size = () => props.size ?? "md";
  return (
    <View
      accessibilityLabel={tileName(props.tile)}
      class={cx(
        faceBox,
        sizes[size()].box,
        sizes[size()].edge,
        props.highlight && "ring-2 ring-seat-turn",
        props.dim && "opacity-50",
      )}
    >
      <Face tile={props.tile} size={size()} />
    </View>
  );
}

/** 牌背：别人的手牌、暗杠。 */
export function TileBack(props: { size?: TileSize }) {
  const s = () => sizes[props.size ?? "md"];
  return <View class={cx("rounded-(--radius-tile) bg-tile-back border-tile-back-edge", s().box, s().edge)} />;
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
  onPress?: () => void;
}) {
  // 选中时整张牌用弹簧抬起，取消时落回；连按两张也能接着上一段速度走。
  const lift = createMotion();
  effect(() => {
    const up = props.selected === true;
    untracked(() => void lift.play(nudge.lift(up ? -14 : 0)));
  });
  return (
    <View style={lift.style}>
    <BaseButton
      selected={props.selected}
      disabled={props.disabled}
      testID={props.testID}
      accessibilityLabel={tileName(props.tile)}
      onPress={props.onPress}
      class={cx(
        faceBox,
        sizes[props.size ?? "lg"].box,
        sizes[props.size ?? "lg"].edge,
        "transition-all hover:-translate-y-1 selected:ring-2 selected:ring-seat-turn",
        "focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
        transition.base,
        props.muted && "opacity-45",
      )}
    >
      <Face tile={props.tile} size={props.size ?? "lg"} />
    </BaseButton>
    </View>
  );
}
