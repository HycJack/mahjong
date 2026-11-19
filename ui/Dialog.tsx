import { type JSX, Text, View } from "nsh";
import { Dialog as BaseDialog } from "nsh/base";
import { Appear } from "./Appear";

/** 居中对话框：标题、说明、内容、底部按钮。 */
export function Dialog(props: {
  open: boolean;
  title: string;
  description?: string;
  /** 能否用 Esc 或点遮罩关掉。 */
  dismissible?: boolean;
  onClose?: () => void;
  footer?: JSX.Element;
  children?: JSX.Element;
  width?: "sm" | "md";
}) {
  return (
    <BaseDialog
      open={props.open}
      animation="fade"
      accessibilityLabel={props.title}
      closeOnEscape={props.dismissible ?? false}
      closeOnBackdropPress={props.dismissible ?? false}
      onClose={props.onClose}
      class="flex-1 items-center justify-center"
      backdropClass="bg-black/45"
    >
      <Appear motion="dialog">
        <View
          class={
            (props.width === "md" ? "w-[560px]" : "w-[420px]") +
            " bg-popover border border-border rounded-[12px] p-5 gap-4 shadow-xl"
          }
        >
          <View class="gap-1">
            <Text class="text-[16px] font-semibold text-popover-foreground">{props.title}</Text>
            {props.description ? <Text class="text-[13px] text-muted-foreground">{props.description}</Text> : null}
          </View>
          {props.children}
          {props.footer ? <View class="flex-row justify-end gap-2">{props.footer}</View> : null}
        </View>
      </Appear>
    </BaseDialog>
  );
}
