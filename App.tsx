import { keymap, mount, signal, Text, View } from "nsh";
import { createNavStack, NavPage, NavStack } from "nsh/base";
import { titleBar } from "nsh/desktop";
import { compact, touch } from "./app/layout";
import { createTable } from "./app/store";
import { RulesDialog, TablePage } from "./app/TablePage";
import { Badge, Button, cx } from "./ui";

function Game() {
  const table = createTable();
  const rulesOpen = signal(false);
  const newRound = () => table.newRound();
  keymap.bind({ "mod+n": newRound, "shift+/": () => rulesOpen.set(true), m: () => table.sounds.toggle() });

  return (
    <View class="flex-1 bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      {/* 自绘标题栏：整条可拖动窗口，左右让出系统的窗口按钮。 */}
      <View
        desktop={{ windowDrag: true }}
        style={{ paddingLeft: titleBar().left + 16, paddingRight: titleBar().right + 16 }}
        class={cx("flex-row items-center gap-3", compact() ? "h-9" : "h-12")}
      >
        <Text role="header" class="text-[15px] font-semibold text-foreground">
          血战到底
        </Text>
        <Badge label={`第 ${table.round()} 局`} />
        <Text class={cx("text-[12px] text-muted-foreground", compact() && "hidden")}>
          {`累计：${table.totals().map((s, i) => `${["你", "下家", "对家", "上家"][i]} ${s > 0 ? "+" : ""}${s}`).join("　")}`}
        </Text>
        <View class="flex-1" />
        <Button
          label={table.sounds.enabled() ? "音效 开" : "音效 关"}
          variant="ghost"
          size="sm"
          shortcut="M"
          testID="sound"
          accessibilityLabel={table.sounds.enabled() ? "关闭音效" : "打开音效"}
          onPress={() => table.sounds.toggle()}
        />
        <Button label="规则" variant="ghost" size="sm" shortcut="?" onPress={() => rulesOpen.set(true)} />
        <Button label="新一局" variant="outline" size="sm" shortcut={keymap.label("mod+n")} onPress={newRound} />
      </View>
      <View class={cx("flex-1", compact() ? "px-2 pb-2" : "px-3 pb-3")}>
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

mount(App);
