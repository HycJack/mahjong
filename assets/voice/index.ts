// 四川话语音的录音文件（WAV 或 .m4a，每句不超过 5 秒）。import 进来的文件会随应用一起打包。
//
// male/：原始录音（去掉首尾静音、响度统一到 -1 dBFS、转成 AAC）。
// female/：女声原始录音，处理方式同上。
//
// 四句：peng 碰、gang 杠、zimo 自摸、hu 胡了（走了）。

import femaleGang from "./female/gang.m4a";
import femaleHu from "./female/hu.m4a";
import femalePeng from "./female/peng.m4a";
import femaleZimo from "./female/zimo.m4a";
import maleGang from "./male/gang.m4a";
import maleHu from "./male/hu.m4a";
import malePeng from "./male/peng.m4a";
import maleZimo from "./male/zimo.m4a";

export type VoiceLine = "peng" | "gang" | "zimo" | "hu";
export type VoiceGender = "male" | "female";

export const VOICE_FILES: Record<VoiceGender, Partial<Record<VoiceLine, string>>> = {
  male: { peng: malePeng, gang: maleGang, zimo: maleZimo, hu: maleHu },
  female: { peng: femalePeng, gang: femaleGang, zimo: femaleZimo, hu: femaleHu },
};
