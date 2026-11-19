import { Canvas } from "nsh";
import { Choice } from "./Choice";
import { drawBack, palette, type TileBox } from "./tileArt";
import { setTileStyle, TILE_STYLES, tileStyle } from "./tileStyle";

const mini: TileBox = { w: 30, h: 41, edge: 3, r: 4 };

/** 牌背风格：每个选项是一张该风格的小牌背加名字。 */
export function StylePicker(props: { class?: string }) {
  return (
    <Choice
      label="牌背"
      value={tileStyle}
      onChange={setTileStyle}
      testIDPrefix="style"
      class={props.class}
      options={TILE_STYLES.map((s) => ({
        id: s.id,
        label: s.name,
        preview: <Canvas style={{ width: mini.w, height: mini.h }} draw={(c) => drawBack(c, mini, palette(s.id))} />,
      }))}
    />
  );
}
