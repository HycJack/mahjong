// 重新生成 assets/icon.png：nsh test assets/icon-src/icon.test.tsx --target macos
// headless 运行不绘制画面，截图会被拒绝，这时什么也不做。
import { open, test } from "nsh/test";

test("icon", async () => {
  const app = await open("./Icon.tsx", { width: 512, height: 512, colorScheme: "light" });
  await app.wait(300);
  await app.screenshot("assets/icon.png").catch(() => {});
});
