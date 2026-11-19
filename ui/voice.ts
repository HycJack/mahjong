// 喊牌的语音：碰、杠、自摸、胡了，男声和女声两套（录音在 assets/voice/）。
// 你的声音可以选男声、女声，或关掉全部语音；三家电脑固定：下家男、对家女、上家男。

import { signal, Sound, Storage } from "nsh";
import { VOICE_FILES, type VoiceGender, type VoiceLine } from "../assets/voice";

export type VoiceSetting = VoiceGender | "off";
export const VOICE_SETTINGS: { id: VoiceSetting; name: string }[] = [
  { id: "male", name: "voice.male" },
  { id: "female", name: "voice.female" },
  { id: "off", name: "voice.off" },
];

const KEY = "xuezhan.voice";
const COMPUTERS: VoiceGender[] = ["male", "female", "male"]; // 下家、对家、上家

export function createVoice() {
  const setting = signal<VoiceSetting>("female");
  const loaded = new Map<string, Sound>();
  void (async () => {
    try {
      const saved = await Storage.getItem(KEY);
      if (saved === "male" || saved === "female" || saved === "off") setting.set(saved);
      if (!(await Sound.available())) return;
      for (const gender of ["male", "female"] as const) {
        for (const [line, src] of Object.entries(VOICE_FILES[gender])) {
          // 每句单独载入：一句解不开（格式不支持）不影响其他句。
          if (src) await Sound.load(src).then((s) => loaded.set(`${gender}/${line}`, s), () => {});
        }
      }
    } catch {
      // 没有录音或不能出声也能玩。
    }
  })();
  return {
    setting,
    /** 有没有任何录音（没有时设置里提示）。 */
    hasRecordings: () => Object.values(VOICE_FILES).some((g) => Object.keys(g).length > 0),
    set(next: VoiceSetting) {
      setting.set(next);
      void Storage.setItem(KEY, next).catch(() => {});
    },
    /** 第 seat 家喊出 line（0 是你）。 */
    say(seat: number, line: VoiceLine, volume = 1) {
      const s = setting();
      if (s === "off") return;
      const gender = seat === 0 ? s : COMPUTERS[seat - 1];
      try {
        loaded.get(`${gender}/${line}`)?.play({ volume: volume * 0.9 });
      } catch {
        // 播放失败不影响游戏。
      }
    },
  };
}

export type Voice = ReturnType<typeof createVoice>;
