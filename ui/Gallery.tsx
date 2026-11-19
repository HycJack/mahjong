// ui 组件陈列：nsh run ui/Gallery.tsx 查看所有牌面、尺寸与控件状态。
import { mount, Text, View } from "nsh";
import { Badge, Button, HandTile, Surface, Tile, TileBack } from ".";

const ALL = Array.from({ length: 27 }, (_, i) => i);

function Gallery() {
  return (
    <View class="flex-1 bg-background p-4 gap-3">
      <Surface variant="felt" class="p-4 gap-3">
        {(["lg", "md", "sm", "xs"] as const).map((size) => (
          <View class="flex-row flex-wrap gap-1 items-end">
            {ALL.map((t) => (size === "lg" ? <HandTile tile={t} /> : <Tile tile={t} size={size} />))}
            <TileBack size={size} />
          </View>
        ))}
        <View class="flex-row gap-1 items-end">
          <HandTile tile={4} selected />
          <HandTile tile={13} muted />
          <Tile tile={22} size="md" highlight />
        </View>
      </Surface>
      <View class="flex-row gap-2 items-center">
        <Button label="再来一局" variant="primary" />
        <Button label="规则" variant="ghost" />
        <Button label="新一局" variant="outline" />
        <Button label="碰" variant="call" size="lg" shortcut="P" />
        <Button label="胡" variant="win" size="lg" shortcut="H" />
        <Button label="不可用" disabled />
        <Badge label="下家" variant="turn" strong />
        <Badge label="缺万" variant="wan" />
        <Badge label="胡 · 3 番" variant="win" strong />
        <Text class="text-[13px] text-muted-foreground">ui 陈列</Text>
      </View>
    </View>
  );
}

mount(Gallery);
