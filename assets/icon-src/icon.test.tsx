// 重新生成 assets/icon.png 和 assets/icon-macos.png：nsh test assets/icon-src/icon.test.tsx --target macos，
// 再运行 scripts/icon-macos.sh（截图四周多留了一圈，脚本裁成 1024，并做出 macOS 的圆角内缩版本）。
// headless 运行不绘制画面，截图会被拒绝，这时什么也不做。
import { open, test } from "nsh/test";

test("icon", async () => {
  const app = await open("./Icon.tsx", { width: 544, height: 544, colorScheme: "light" });
  await app.wait(300);
  await app.screenshot("assets/icon-src/raw.png").catch(() => {});
});
