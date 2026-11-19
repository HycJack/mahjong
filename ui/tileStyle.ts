// 牌背风格：朱砂、宝蓝、琥珀。颜色在主题里（back-<id>、back-<id>-hi、back-<id>-edge），
// 这里只保存玩家选的是哪一套，并记住到下次。

import { signal, Storage } from "nsh";

export type TileStyle = "red" | "blue" | "gold";

export const TILE_STYLES: { id: TileStyle; name: string }[] = [
  { id: "red", name: "朱砂" },
  { id: "blue", name: "宝蓝" },
  { id: "gold", name: "琥珀" },
];

const KEY = "xuezhan.tileStyle";
const current = signal<TileStyle>("red");

void Storage.getItem(KEY)
  .then((v) => {
    if (TILE_STYLES.some((s) => s.id === v)) current.set(v as TileStyle);
  })
  .catch(() => {});

/** 当前牌背风格（响应式）。 */
export const tileStyle = () => current();

export function setTileStyle(style: TileStyle) {
  current.set(style);
  void Storage.setItem(KEY, style).catch(() => {});
}
