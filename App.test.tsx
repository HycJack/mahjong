import { t } from "nsh/i18n";
import { expect, open, test } from "nsh/test";

const SHOTS: string | undefined = undefined;

test("定缺后轮到你出牌，选中再打出", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 860, clock: { time: 1700000000000 } });
  await app.waitFor("id:start");
  if (SHOTS) await app.screenshot(`${SHOTS}/dingque-light.png`);
  await app.press("id:void-tong");
  await app.press("id:start");
  await app.waitFor("id:start", { state: "gone" });
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
  await app.press("id:start");
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
  await app.waitFor("id:start");
}, 120000);

test("GitHub 入口打开项目主页", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 860 });
  await app.press("id:void-tong");
  await app.press("id:start");
  await app.press("text:GitHub");
  expect(app.openedUrls()).toContain("https://github.com/huacnlee/mahjong");
  await app.press("text:规则");
  await app.press("text:源代码与下载");
  expect(app.openedUrls().length).toBe(2);
});

test("应用名：中文是血战到底，英文是 Mojiang", () => {
  expect(t("app.name", { locale: "zh-CN" })).toBe("血战到底");
  expect(t("app.name", { locale: "en" })).toBe("Mojiang");
});

test("开局可以换牌背风格", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 860 });
  await app.press("id:style-blue");
  expect(app.shows("id:style-blue")).toBe(true);
  await app.press("id:style-red");
  await app.press("id:void-tong");
  await app.press("id:start");
  expect(app.shows("id:style-red")).toBe(false);
});

test("载入八句喊牌语音，新一局时洗牌", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 860 });
  await app.waitUntil(() => app.audio().filter((c) => c.command === "load" && c.src.includes("voice/")).length === 8);
  const voices = app.audio().filter((c) => c.command === "load" && c.src.includes("voice/")).map((c) => c.src.replace(/.*voice\//, ""));
  expect(voices.sort()).toEqual(["female/gang.m4a", "female/hu.m4a", "female/peng.m4a", "female/zimo.m4a", "male/gang.m4a", "male/hu.m4a", "male/peng.m4a", "male/zimo.m4a"]);
  await app.press("id:void-tong");
  await app.press("id:start");
  const before = app.audio().filter((c) => c.command === "play" && c.src.length > 0).length;
  await app.press("text:新一局");
  expect(app.audio().filter((c) => c.command === "play").length).toBeGreaterThan(before);
});

test("开局默认选推荐的缺门，回车开始", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 860, clock: { time: 1700000000000 } });
  await app.waitFor("id:start");
  expect(app.texts().some((s) => s.endsWith("· 推荐"))).toBe(true);
  // 只选缺门不会开局，要点“开始”。
  await app.press("id:void-wan");
  expect(app.shows("id:start")).toBe(true);
  await app.keyboard.press("enter");
  await app.waitFor("id:start", { state: "gone" });
  expect(app.shows("text:缺万")).toBe(true);
});
