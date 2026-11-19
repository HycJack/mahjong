import { keymap, mount, signal, Text, View } from "nsh";
import { createNavStack, NavPage, NavStack } from "nsh/base";
import { titleBar } from "nsh/desktop";
import { t } from "nsh/i18n";
import { compact, REPO_URL, touch } from "./app/layout";
import { createTable } from "./app/store";
import { createUpdater } from "./app/updater";
import { RulesDialog, TablePage } from "./app/TablePage";
import { Badge, Button, cx, ExternalLink, Felt } from "./ui";
import { initLanguage, language, setLanguage } from "./ui/language";

function Game() {
  const table = createTable();
  const rulesOpen = signal(false);
  const updater = createUpdater();
  const update = updater.state;
  const updateLabel = () => {
    const u = update();
    if (u.kind === "downloading") return t("update.downloading", { percent: Math.round(u.progress * 100) });
    if (u.kind === "ready") return t("update.restart", { version: u.version });
    if (u.kind === "link") return t("update.available", { version: u.version });
    return "";
  };
  const newRound = () => table.newRound();
  keymap.bind({ "mod+n": newRound, "shift+/": () => rulesOpen.set(true), m: () => table.sounds.toggle() });

  return (
    <View class="flex-1 bg-felt pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      {/* 整个窗口都是牌桌的绒布：标题栏、刘海两侧和底部都铺满。 */}
      <Felt bleed />
      {/* 自绘标题栏：整条可拖动窗口，左右让出系统的窗口按钮。 */}
      <View
        desktop={{ windowDrag: true }}
        // 四周统一 20pt 边距：红绿灯离左边 20（nsh.json 的 controlsOffset），右边按钮离右边 20。
        style={{ paddingLeft: titleBar().left + 12, paddingRight: titleBar().right + 20 }}
        class={cx("flex-row items-center gap-3", compact() ? "h-9" : "h-12")}
      >
        <Text role="header" class="text-[15px] font-semibold text-felt-foreground">
          {t("app.name")}
        </Text>
        <Badge label={t("bar.round", { n: table.round() })} variant="felt" />
        <View class="flex-1" />
        <If when={update().kind !== "idle"}>
          <Button
            label={updateLabel()}
            variant="feltOutline"
            size="sm"
            testID="update"
            disabled={update().kind === "downloading"}
            onPress={() => void updater.apply()}
          />
        </If>
        <ExternalLink label="GitHub" tone="felt" href={REPO_URL} accessibilityLabel={t("bar.github.a11y")} />
        <Button
          label={t(table.sounds.enabled() ? "bar.sound.on" : "bar.sound.off")}
          variant="feltGhost"
          size="sm"
          shortcut="M"
          testID="sound"
          accessibilityLabel={t(table.sounds.enabled() ? "bar.sound.turnOff" : "bar.sound.turnOn")}
          onPress={() => table.sounds.toggle()}
        />
        <Button
          label={t("lang.switch")}
          variant="feltGhost"
          size="sm"
          testID="language"
          accessibilityLabel={t("lang.switch.a11y")}
          onPress={() => setLanguage(language() === "zh-CN" ? "en" : "zh-CN")}
        />
        <Button label={t("bar.rules")} variant="feltGhost" size="sm" shortcut="?" onPress={() => rulesOpen.set(true)} />
        <Button label={t("bar.newRound")} variant="feltOutline" size="sm" shortcut={keymap.label("mod+n")} onPress={newRound} />
      </View>
      <View class="flex-1">
        <TablePage table={table} rulesOpen={rulesOpen} onRulesClose={() => rulesOpen.set(false)} />
      </View>
      <RulesDialog open={rulesOpen} onClose={() => rulesOpen.set(false)} />
    </View>
  );
}

/** 手机上用单页导航栈：隐藏系统导航栏，只用横屏。桌面和 Web 直接是游戏。 */
function App() {
  if (!touch) return <Game />;
  const stack = createNavStack(["game"]);
  const landscape = { supportedOrientations: ["landscape" as const] };
  return (
    <NavStack state={stack} class="flex-1">
      {() => (
        <NavPage headerVisible={false} ios={landscape} android={landscape} class="flex-1">
          <Game />
        </NavPage>
      )}
    </NavStack>
  );
}

initLanguage();
mount(App);
