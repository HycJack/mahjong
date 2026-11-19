// 应用图标的源：nsh test assets/icon-src/icon.test.tsx --target macos 生成 assets/icon.png（1024×1024）。
import { mount, View } from "nsh";
import { TileFace } from "../../ui/TileFace";

function Icon() {
  return (
    <View class="flex-1 bg-felt items-center justify-center">
      <View class="absolute w-[230px] h-[310px] rounded-[26px] bg-tile-back border-b-[18px] border-tile-back-edge" style={{ transform: [{ rotate: "-14deg" }, { translateX: -70 }, { translateY: 6 }] }} />
      <View
        class="w-[240px] h-[322px] rounded-[26px] bg-tile-face border-b-[20px] border-tile-edge items-center justify-center shadow-xl"
        style={{ transform: [{ rotate: "6deg" }, { translateX: 40 }] }}
      >
        <TileFace tile={18 + 4} metrics={{ w: 196, h: 262, rank: 0, wan: 0 }} />
      </View>
    </View>
  );
}

mount(Icon);
