/** 拼接类名，跳过空值。 */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
