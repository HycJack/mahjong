// 应用图标的源：nsh test assets/icon-src/icon.test.tsx --target macos 生成 assets/icon.png（1024×1024）。
// 与牌桌上的牌是同一套绘制（ui/tileArt.ts），只是放大。
import { Canvas, mount, View } from "nsh";
import { Felt } from "../../ui/Felt";
import { tile } from "../../game/tile";
import { drawBack, drawBody, drawFace, palette, type TileBox } from "../../ui/tileArt";

/** 正面那张：一条（孔雀）。 */
const FACE = tile(1, 1);

const back: TileBox = { w: 230, h: 310, edge: 22, r: 26 };
const front: TileBox = { w: 240, h: 322, edge: 24, r: 26 };

function Icon() {
  return (
    <View class="flex-1 bg-felt items-center justify-center">
      <Felt />
      <View class="absolute" style={{ transform: [{ rotate: "-14deg" }, { translateX: -70 }, { translateY: 6 }] }}>
        <Canvas style={{ width: back.w, height: back.h }} draw={(c) => drawBack(c, back, palette())} />
      </View>
      <View class="shadow-xl rounded-[26px]" style={{ transform: [{ rotate: "6deg" }, { translateX: 40 }] }}>
        <Canvas
          style={{ width: front.w, height: front.h }}
          draw={(c) => {
            const p = palette();
            drawBody(c, front, p);
            const fh = front.h - front.edge;
            drawFace(c, FACE, front.w * 0.09, fh * 0.08, front.w * 0.82, fh * 0.84, p);
          }}
        />
      </View>
    </View>
  );
}

mount(Icon);
