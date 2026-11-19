# 血战到底

用 [NSH](https://nsh.dev)（纯 TSX）写的四川麻将“血战到底”：你和三家电脑对战。

**在线玩：** https://huacnlee.github.io/mojang/

## 安装

macOS（Apple 芯片）/ Linux（x86_64，需要 GTK 4.14+）：

```sh
curl -fsSL https://huacnlee.github.io/mojang/install.sh | sh
```

Windows（PowerShell）：

```powershell
irm https://huacnlee.github.io/mojang/install.ps1 | iex
```

脚本会从 [Releases](https://github.com/huacnlee/mojang/releases) 下载对应安装包，核对 `SHA256SUMS` 后安装。指定版本：`MOJANG_VERSION=v1.0.0`。

手机：

- **Android**：在 Releases 下载 `mojang-android.apk` 安装。
- **iOS**：Releases 里有模拟器包 `mojang-ios-simulator.zip`；装到真机需要开发者签名（见 `.github/workflows/release.yml` 里的 Secrets 说明）。

## 玩法

开局定缺（`1` `2` `3`），点一张牌选中、再点一下打出（或 `←` `→` 选牌、`Enter` 打出）。别人打出你能要的牌时出现 胡 `H` / 杠 `G` / 碰 `P` / 过 `Esc`。`⌘N` 新一局，`?` 规则，`M` 开关音效。手机上横屏玩。

## 开发

```sh
nsh run                  # 运行
nsh test                 # 规则与界面测试
nsh run ui/Gallery.tsx   # 查看牌面与控件
nsh test assets/icon-src/icon.test.tsx --target macos   # 重新生成图标
```

- `game/`：规则、对局状态机、电脑打法（不依赖界面）
- `app/`：牌桌页面、布局档位与状态
- `ui/`：牌面、按钮、对话框、动效与音效
- `DESIGN.md`：设计规范、动效清单与音效清单

## 发布

推送到 `main` 自动发布网页版；打 `v*` tag 自动打包 macOS、Windows、Linux、iOS、Android 并创建 Release。
