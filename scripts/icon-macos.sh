#!/bin/sh
# 由 assets/icon-src/raw.png（1088×1088 截图）生成：
#   assets/icon.png        1024×1024 铺满，给 iOS、Android、Windows、Linux、Web（系统自己加圆角）
#   assets/icon-macos.png  1024×1024 透明画布，图案 824×824 居中、圆角 185、带投影（macOS 的图标规范）
set -eu
body=$(mktemp -t mahjong-icon).png
cd "$(dirname "$0")/.."
raw=assets/icon-src/raw.png
magick "$raw" -gravity center -crop 1024x1024+0+0 +repage -alpha off assets/icon.png
magick assets/icon.png -resize 824x824 \
  \( -size 824x824 xc:none -fill white -draw "roundrectangle 0,0 823,823 185,185" \) \
  -compose DstIn -composite "$body"
magick -size 1024x1024 xc:none \
  \( "$body" -background black -shadow 40x14+0+10 \) -gravity center -geometry +0+10 -composite \
  "$body" -gravity center -composite assets/icon-macos.png
rm -f "$body"
echo "assets/icon.png, assets/icon-macos.png"
