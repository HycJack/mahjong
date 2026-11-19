import { Canvas, Text, View } from "nsh";
import { Radio, RadioGroup } from "nsh/base";
import { cx } from "./cx";
import { transition } from "./motion";
import { drawBack, palette, type TileBox } from "./tileArt";
import { setTileStyle, TILE_STYLES, tileStyle } from "./tileStyle";

const mini: TileBox = { w: 30, h: 41, edge: 3, r: 4 };

/** 牌背风格：每个选项是一张该风格的小牌背加名字。←/→ 在选项间移动并选中。 */
export function StylePicker(props: { class?: string }) {
  return (
    <RadioGroup accessibilityLabel="牌背风格" class={cx("flex-row items-center gap-2", props.class)}>
      <Text class="text-[13px] text-muted-foreground mr-1">牌背</Text>
      {TILE_STYLES.map((s) => (
        <Radio
          checked={tileStyle() === s.id}
          onChange={() => setTileStyle(s.id)}
          testID={`style-${s.id}`}
          class={cx(
            "group flex-row items-center gap-2 h-12 pl-1.5 pr-3 rounded-(--radius) border border-border bg-transparent",
            "hover:bg-accent checked:border-primary checked:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
            "transition-all",
            transition.fast,
          )}
        >
          <View class="rounded-[5px] group-checked:ring-2 group-checked:ring-primary">
            <Canvas style={{ width: mini.w, height: mini.h }} draw={(c) => drawBack(c, mini, palette(s.id))} />
          </View>
          <Text class="text-[13px] text-foreground group-checked:font-semibold">{s.name}</Text>
        </Radio>
      ))}
    </RadioGroup>
  );
}
