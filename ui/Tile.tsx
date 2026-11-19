import { Text, View } from "nsh";
import { Button as BaseButton } from "nsh/base";
import { type Tile as TileId, tileName } from "../game/tile";
import { cx } from "./cx";
import { transition } from "./motion";
import { type FaceMetrics, TileFace } from "./TileFace";

export type TileSize = "xs" | "sm" | "md" | "ml" | "lg";

const sizes: Record<TileSize, { box: string; edge: string; face: FaceMetrics }> = {
  xs: { box: "w-[18px] h-[25px]", edge: "border-b-[2px]", face: { w: 15, h: 19, rank: 10, wan: 8 } },
  sm: { box: "w-[24px] h-[33px]", edge: "border-b-[2px]", face: { w: 20, h: 26, rank: 12, wan: 10 } },
  md: { box: "w-[30px] h-[41px]", edge: "border-b-[3px]", face: { w: 25, h: 32, rank: 15, wan: 13 } },
  ml: { box: "w-[38px] h-[53px]", edge: "border-b-[3px]", face: { w: 31, h: 42, rank: 18, wan: 16 } },
  lg: { box: "w-[46px] h-[64px]", edge: "border-b-[4px]", face: { w: 38, h: 51, rank: 22, wan: 20 } },
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
  return (
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
        "transition-all hover:-translate-y-1 selected:-translate-y-2 selected:ring-2 selected:ring-seat-turn",
        "focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
        transition.base,
        props.muted && "opacity-45",
      )}
    >
      <Face tile={props.tile} size={props.size ?? "lg"} />
    </BaseButton>
  );
}
