// 自动更新：启动时（之后每 6 小时）检查 GitHub Release 里签名的 latest.json。
// 桌面版：后台下载，设为“退出时安装”，标题栏出现“重启更新”，点了立即安装并重启。
// 手机版：只能给链接，标题栏出现“新版本”，点了打开下载页。网页版和开发运行时检查结果为 null。

import { locale, openUrl, signal } from "nsh";
import { checkForUpdate, downloadUpdate, installAndRestart, installOnQuit, type AppUpdate } from "nsh/updater";

export type UpdateState =
  | { kind: "idle" }
  | { kind: "downloading"; version: string; progress: number }
  | { kind: "ready"; version: string }
  | { kind: "link"; version: string; url: string };

const EVERY = 6 * 60 * 60 * 1000;

export function createUpdater() {
  const state = signal<UpdateState>({ kind: "idle" });
  let busy = false;

  async function fetchUpdate(found: AppUpdate) {
    if (!found.canInstall) {
      state.set({ kind: "link", version: found.version, url: found.url });
      return;
    }
    state.set({ kind: "downloading", version: found.version, progress: 0 });
    await downloadUpdate(({ received, total }) => {
      state.set({ kind: "downloading", version: found.version, progress: total ? received / total : 0 });
    });
    await installOnQuit();
    state.set({ kind: "ready", version: found.version });
  }

  async function check() {
    if (busy || state().kind === "ready") return;
    busy = true;
    try {
      const found = await checkForUpdate({ locale: locale() });
      if (found) await fetchUpdate(found);
    } catch (error) {
      // 没网或者清单不对：这次不提示，下次再查。
      console.warn("update check failed", error);
      if (state().kind === "downloading") state.set({ kind: "idle" });
    } finally {
      busy = false;
    }
  }

  /** 标题栏按钮：已下载就重启安装，手机上打开下载页。 */
  async function apply() {
    const s = state();
    if (s.kind === "ready") await installAndRestart().catch((e) => console.warn("install failed", e));
    else if (s.kind === "link") await openUrl(s.url);
  }

  void check();
  setInterval(() => void check(), EVERY);
  return { state, check, apply };
}

export type Updater = ReturnType<typeof createUpdater>;
