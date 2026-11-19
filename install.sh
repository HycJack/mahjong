#!/bin/sh
# 安装「血战到底」（macOS / Linux）：
#   curl -fsSL https://raw.githubusercontent.com/huacnlee/mojang/main/install.sh | sh
# 可选环境变量：
#   MOJANG_VERSION  指定版本（如 v1.0.0），默认最新
#   MOJANG_DIR      安装目录（Linux 默认 ~/.local/share/mojang；macOS 默认 /Applications 或 ~/Applications）
set -eu

REPO="huacnlee/mojang"
APP="血战到底"

say() { printf '%s\n' "$*"; }
fail() { printf '安装失败：%s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "需要 $1"; }

need curl
if [ -n "${MOJANG_VERSION:-}" ]; then
  BASE="https://github.com/$REPO/releases/download/$MOJANG_VERSION"
else
  BASE="https://github.com/$REPO/releases/latest/download"
fi

case "$(uname -s)" in
  Darwin)
    [ "$(uname -m)" = "arm64" ] || fail "目前只提供 Apple 芯片（arm64）的 macOS 版本"
    ASSET="mojang-macos-arm64.zip" ;;
  Linux)
    [ "$(uname -m)" = "x86_64" ] || fail "目前只提供 x86_64 的 Linux 版本"
    ASSET="mojang-linux-x86_64.tar.gz" ;;
  *) fail "不支持的系统：$(uname -s)；Windows 请用 install.ps1" ;;
esac

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

say "下载 $ASSET …"
curl -fSL --progress-bar -o "$TMP/$ASSET" "$BASE/$ASSET" || fail "下载 $ASSET 出错"
curl -fsSL -o "$TMP/SHA256SUMS" "$BASE/SHA256SUMS" || fail "下载校验文件出错"

EXPECTED="$(grep " $ASSET\$" "$TMP/SHA256SUMS" | awk '{print $1}')"
[ -n "$EXPECTED" ] || fail "校验文件里没有 $ASSET"
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL="$(sha256sum "$TMP/$ASSET" | awk '{print $1}')"
else
  ACTUAL="$(shasum -a 256 "$TMP/$ASSET" | awk '{print $1}')"
fi
[ "$EXPECTED" = "$ACTUAL" ] || fail "校验和不符，文件可能已损坏"

case "$(uname -s)" in
  Darwin)
    need ditto
    if [ -n "${MOJANG_DIR:-}" ]; then DEST="$MOJANG_DIR"
    elif [ -w /Applications ]; then DEST="/Applications"
    else DEST="$HOME/Applications"; fi
    mkdir -p "$DEST"
    ditto -x -k "$TMP/$ASSET" "$TMP/unpacked"
    rm -rf "$DEST/$APP.app"
    mv "$TMP/unpacked/$APP.app" "$DEST/$APP.app"
    xattr -r -d com.apple.quarantine "$DEST/$APP.app" >/dev/null 2>&1 || true
    say "已安装到 $DEST/$APP.app"
    say "打开：open \"$DEST/$APP.app\""
    ;;
  Linux)
    need tar
    DEST="${MOJANG_DIR:-$HOME/.local/share/mojang}"
    mkdir -p "$TMP/unpacked"
    tar -xzf "$TMP/$ASSET" -C "$TMP/unpacked"
    SRC="$(find "$TMP/unpacked" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
    [ -n "$SRC" ] || fail "压缩包内容不对"
    rm -rf "$DEST"
    mkdir -p "$(dirname "$DEST")"
    mv "$SRC" "$DEST"

    # 程序：.desktop 里的 Exec，没有就找第一个可执行文件。
    DESKTOP="$(find "$DEST" -maxdepth 2 -name '*.desktop' | head -n 1)"
    BIN=""
    if [ -n "$DESKTOP" ]; then
      EXEC="$(sed -n 's/^Exec=\([^ ]*\).*/\1/p' "$DESKTOP" | head -n 1)"
      EXEC="$(basename "$EXEC")"
      [ -n "$EXEC" ] && [ -x "$DEST/$EXEC" ] && BIN="$DEST/$EXEC"
    fi
    [ -n "$BIN" ] || BIN="$(find "$DEST" -maxdepth 1 -type f -perm -u+x | head -n 1)"
    [ -n "$BIN" ] || fail "找不到程序文件"

    mkdir -p "$HOME/.local/bin"
    ln -sf "$BIN" "$HOME/.local/bin/mojang"

    APPS="$HOME/.local/share/applications"
    mkdir -p "$APPS"
    if [ -n "$DESKTOP" ]; then
      ICON="$(find "$DEST" -maxdepth 2 -name '*.png' | head -n 1)"
      sed -e "s|^Exec=.*|Exec=\"$BIN\"|" ${ICON:+-e "s|^Icon=.*|Icon=$ICON|"} "$DESKTOP" > "$APPS/mojang.desktop"
    else
      printf '[Desktop Entry]\nType=Application\nName=%s\nExec="%s"\nCategories=Game;\n' "$APP" "$BIN" > "$APPS/mojang.desktop"
    fi
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" >/dev/null 2>&1 || true

    say "已安装到 $DEST"
    say "从应用菜单打开「$APP」，或运行：mojang（需要 ~/.local/bin 在 PATH 里）"
    say "需要 GTK 4.14 或更新版本。"
    ;;
esac
