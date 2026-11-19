// 界面语言：中文或英文。默认跟随系统语言，网页版默认英文；标题栏可以切换，记住选择。

import { platform, Storage } from "nsh";
import { setLocale, t } from "nsh/i18n";

export type Language = "en" | "zh-CN";
const KEY = "xuezhan.language";

/** 现在显示的语言：看 `t` 实际选了哪种（跟着系统语言和 `setLocale` 变）。 */
export function language(): Language {
  return t("lang.id") === "zh-CN" ? "zh-CN" : "en";
}

export function setLanguage(next: Language) {
  setLocale(next);
  void Storage.setItem(KEY, next).catch(() => {});
}

/** 应用启动时调用：读回上次的选择；网页版没选过就用英文。 */
export function initLanguage() {
  if (platform.os === "web") setLocale("en");
  void Storage.getItem(KEY)
    .then((saved) => {
      if (saved === "en" || saved === "zh-CN") setLocale(saved);
    })
    .catch(() => {});
}
