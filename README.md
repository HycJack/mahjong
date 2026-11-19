# 血战到底

用 [NSH](https://nsh.dev)（纯 TSX）写的四川麻将“血战到底”：你和三家电脑对战。

```sh
nsh run        # 开始玩
nsh test       # 规则与界面测试
nsh run ui/Gallery.tsx   # 查看牌面与控件
```

- `game/`：规则、对局状态机、电脑打法（不依赖界面）
- `app/`：牌桌页面与状态
- `ui/`：牌面、按钮、对话框、动效与音效
- `DESIGN.md`：设计规范、动效清单与音效清单
