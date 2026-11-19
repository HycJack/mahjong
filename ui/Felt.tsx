import { Canvas, token } from "nsh";
import { alpha, mix } from "./tileArt";

/** 牌桌的毡布：中间亮、四周暗的径向渐变，内侧一圈桌沿线。铺在 felt 表面的最底层。 */
export function Felt() {
  return (
    <Canvas
      class="absolute inset-0 pointer-events-none"
      accessibilityElementsHidden
      draw={(c, size) => {
        const felt = token("felt") as string;
        const hi = token("felt-hi") as string;
        const deep = token("felt-deep") as string;
        const line = token("felt-line") as string;
        const r = token("radius") as number;
        const { width: w, height: h } = size;
        const g = c.createRadialGradient(w / 2, h * 0.46, 0, w / 2, h / 2, Math.max(w, h) * 0.62);
        g.addColorStop(0, hi);
        g.addColorStop(0.55, felt);
        g.addColorStop(1, mix(felt, deep, 0.9));
        c.beginPath();
        c.roundRect(0, 0, w, h, r);
        c.fillStyle = g;
        c.fill();
        const inset = Math.min(10, w * 0.012);
        c.beginPath();
        c.roundRect(inset, inset, w - inset * 2, h - inset * 2, Math.max(2, r - 2));
        c.lineWidth = 1;
        c.strokeStyle = alpha(line, 0.8);
        c.stroke();
      }}
    />
  );
}
