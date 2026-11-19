// 布局档位：桌面用宽松布局；手机横屏（或很小的窗口）用紧凑布局。

import { computed, platform, windowSize } from "nsh";

/** 触屏设备：不显示键盘提示。 */
export const touch = platform.os === "ios" || platform.os === "android";

/** 窗口矮或窄时用紧凑布局。 */
export const compact = computed(() => windowSize().height < 600 || windowSize().width < 980);
