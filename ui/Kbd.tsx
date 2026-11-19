import { Text, View } from "nsh";

/** 键位提示。 */
export function Kbd(props: { label: string }) {
  return (
    <View class="h-[18px] min-w-[18px] px-1 rounded-[4px] bg-felt-deep border border-felt-line items-center justify-center">
      <Text class="text-[11px] leading-none text-felt-muted">{props.label}</Text>
    </View>
  );
}
