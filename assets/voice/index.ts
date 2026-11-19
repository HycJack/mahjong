// 四川话语音的录音文件。把录音放进 male/、female/（WAV 或 .m4a，每句不超过 5 秒），
// 再在下面 import 并填进表里，打包时就会带上；没填的句子不出声。
//
//   import malePeng from "./male/peng.m4a";
//   male: { peng: malePeng, ... }
//
// 四句：peng 碰、gang 杠、zimo 自摸、hu 胡了（走了）。

export type VoiceLine = "peng" | "gang" | "zimo" | "hu";
export type VoiceGender = "male" | "female";

export const VOICE_FILES: Record<VoiceGender, Partial<Record<VoiceLine, string>>> = {
  male: {},
  female: {},
};
