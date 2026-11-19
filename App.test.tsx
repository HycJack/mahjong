import { expect, open, test } from "nsh/test";

const SHOTS: string | undefined = undefined;

test("定缺后轮到你出牌，选中再打出", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 860, clock: { time: 1700000000000 } });
  await app.waitFor("text:定缺");
  if (SHOTS) await app.screenshot(`${SHOTS}/dingque-light.png`);
  await app.press("id:void-tong");
  await app.waitFor("text:定缺", { state: "gone" });
  // 你是庄，先出牌。
  await app.waitFor("id:drawn");
  await app.press("id:drawn");
  if (SHOTS) await app.screenshot(`${SHOTS}/table-light.png`);
  await app.press("id:drawn");
  await app.waitUntil(() => app.count("id:drawn") === 0);
});

test("一局能打到结算，再来一局", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 860, clock: { time: 1700000000000 } });
  await app.press("id:void-tong");
  for (let step = 0; step < 400; step++) {
    if (app.shows("id:again")) break;
    if (app.shows("id:hu")) await app.press("id:hu");
    else if (app.shows("id:zimo")) await app.press("id:zimo");
    else if (app.shows("id:pass")) await app.press("id:pass");
    else if (app.shows("text:先把缺门的牌打完")) {
      // 缺筒：筒排在手牌最后；摸到的那张也可能是筒。
      let last = 0;
      while (app.shows(`id:hand-${last + 1}`)) last++;
      await app.press(`id:hand-${last}`);
      await app.press(`id:hand-${last}`);
      if (app.shows("text:先把缺门的牌打完") && app.shows("id:drawn")) {
        await app.press("id:drawn");
        await app.press("id:drawn");
      }
    } else if (app.shows("id:drawn") || app.shows("text:轮到你出牌：点一下选中，再点一下打出")) {
      const target = app.shows("id:drawn") ? "id:drawn" : "id:hand-0";
      await app.press(target);
      await app.press(target);
    }
    await app.clock!.runFor(700);
  }
  expect(app.shows("id:again")).toBe(true);
  if (SHOTS) {
    await app.screenshot(`${SHOTS}/result-light.png`);
    await app.setColorScheme("dark");
    await app.screenshot(`${SHOTS}/result-dark.png`);
  }
  await app.press("id:again");
  await app.waitFor("text:定缺");
}, 120000);
