import { Canvas, token } from "nsh";
import { alpha, mix } from "./tileArt";

/** 一枚筹码代表多少钱。 */
export const CHIP_VALUE = 1000;
const MAX = 6;

// 高度约等于旁边两行文字（余额 + 本局输赢）：md 约 33pt，sm 约 25pt。
const dims = {
  sm: { w: 18, t: 2 },
  md: { w: 24, t: 2.6 },
} as const;

/** 一摞筹码：每 ¥1,000 一枚，最多画 6 枚；没钱了就是空的。高度固定，与旁边的金额文字一样高，筹码从底往上堆。 */
export function ChipStack(props: { amount: number; size?: keyof typeof dims }) {
  const d = () => dims[props.size ?? "md"];
  const ry = () => d().w * 0.36;
  const height = () => ry() * 2 + d().t * MAX + 1;
  return (
    <Canvas
      accessibilityElementsHidden
      style={{ width: d().w, height: height() }}
      draw={(c) => {
        const { w, t } = d();
        const rx = w / 2;
        const r = ry();
        const n = props.amount <= 0 ? 0 : Math.min(MAX, Math.ceil(props.amount / CHIP_VALUE));
        const chip = token("chip") as string;
        const hi = token("chip-hi") as string;
        const edge = token("chip-edge") as string;
        const stripe = token("chip-stripe") as string;
        const base = height() - r - 0.5;
        if (n === 0) {
          // 空位：一圈虚线，表示这里曾经有筹码
          c.beginPath();
          c.ellipse(rx, base - t, rx - 1, r - 1, 0, 0, Math.PI * 2);
          c.setLineDash([3, 3]);
          c.lineWidth = 1;
          c.strokeStyle = alpha(edge, 0.6);
          c.stroke();
          c.setLineDash([]);
          return;
        }
        for (let i = 0; i < n; i++) {
          const y = base - t - i * t; // 这一枚顶面的中心
          // 侧面：上下两个半椭圆之间
          c.beginPath();
          c.ellipse(rx, y, rx, r, 0, Math.PI, 0, true);
          c.lineTo(w, y + t);
          c.ellipse(rx, y + t, rx, r, 0, 0, Math.PI);
          c.closePath();
          const side = c.createLinearGradient(0, 0, w, 0);
          side.addColorStop(0, edge);
          side.addColorStop(0.4, chip);
          side.addColorStop(1, mix(edge, chip, 0.3));
          c.fillStyle = side;
          c.fill();
          // 侧面的白色色块
          c.fillStyle = alpha(stripe, 0.85);
          for (const f of [0.18, 0.5, 0.82]) {
            c.fillRect(w * f - w * 0.05, y + r * Math.sin(Math.acos((w * f - rx) / rx)) * 0.92, w * 0.1, Math.max(1, t * 0.7));
          }
          // 顶面
          c.beginPath();
          c.ellipse(rx, y, rx, r, 0, 0, Math.PI * 2);
          const top = c.createRadialGradient(rx * 0.75, y - r * 0.4, 0, rx, y, rx);
          top.addColorStop(0, hi);
          top.addColorStop(1, chip);
          c.fillStyle = top;
          c.fill();
          c.lineWidth = 0.75;
          c.strokeStyle = alpha(edge, 0.7);
          c.stroke();
        }
        // 最上面一枚：一圈内环和环上的色块
        const y = base - t - (n - 1) * t;
        c.beginPath();
        c.ellipse(rx, y, rx * 0.62, r * 0.62, 0, 0, Math.PI * 2);
        c.lineWidth = Math.max(1, w * 0.05);
        c.setLineDash([w * 0.12, w * 0.1]);
        c.strokeStyle = alpha(stripe, 0.9);
        c.stroke();
        c.setLineDash([]);
      }}
    />
  );
}
