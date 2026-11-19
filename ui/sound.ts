// 音效：一套竹木质感的短声，开局时用代码合成成 WAV 载入。
// 每个声音只对应一种事件；界面不靠声音传达任何信息，关掉也完全可玩。

import { signal, Sound, Storage } from "nsh";

const RATE = 22050;

/** 把 [-1, 1] 的采样写成 16 位单声道 WAV。 */
function wav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true));
  return bytes;
}

function render(seconds: number, fn: (t: number, noise: () => number) => number): Uint8Array {
  const n = Math.floor(seconds * RATE);
  const out = new Float32Array(n);
  let seed = 12345;
  const noise = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x3fffffff - 1;
  };
  for (let i = 0; i < n; i++) out[i] = fn(i / RATE, noise);
  // 头尾各 2ms 淡入淡出，避免爆音。
  const edge = Math.floor(0.002 * RATE);
  for (let i = 0; i < edge; i++) {
    out[i] *= i / edge;
    out[n - 1 - i] *= i / edge;
  }
  return wav(out);
}

const TAU = Math.PI * 2;

/** 木块相碰：几个衰减很快的泛音加一点噪声。 */
const clack = (t: number, noise: () => number) =>
  0.55 * Math.sin(TAU * 1150 * t) * Math.exp(-t / 0.018) +
  0.3 * Math.sin(TAU * 2380 * t) * Math.exp(-t / 0.012) +
  0.15 * Math.sin(TAU * 3500 * t) * Math.exp(-t / 0.008) +
  0.25 * noise() * Math.exp(-t / 0.004);

/** 钟声：基音加两个泛音，慢慢衰减。 */
const bell = (f: number, t: number, tau: number) =>
  t < 0 ? 0 : (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.01 * t) + 0.12 * Math.sin(TAU * f * 3.02 * t)) * Math.exp(-t / tau);

const SOURCES = {
  /** 打出一张牌。 */
  discard: () => render(0.14, clack),
  /** 摸牌：更轻的一下。 */
  draw: () => render(0.06, (t, noise) => 0.35 * Math.sin(TAU * 1900 * t) * Math.exp(-t / 0.007) + 0.15 * noise() * Math.exp(-t / 0.003)),
  /** 碰、杠：两下相碰。 */
  meld: () => render(0.26, (t, noise) => clack(t, noise) + (t > 0.09 ? clack(t - 0.09, noise) : 0)),
  /** 轮到你决定（碰杠胡）：一声轻铃。 */
  notice: () => render(0.6, (t) => 0.32 * bell(1320, t, 0.18)),
  /** 胡牌：上行的五声音阶。 */
  win: () => render(1.1, (t) => 0.22 * [523, 659, 784, 1047].reduce((a, f, i) => a + bell(f, t - i * 0.09, 0.35), 0)),
  /** 一局结束。 */
  over: () => render(1.0, (t) => 0.2 * [784, 659, 523].reduce((a, f, i) => a + bell(f, t - i * 0.12, 0.4), 0)),
} as const;

export type SoundName = keyof typeof SOURCES;

const KEY = "xuezhan.sound";

/** 载入全部音效；载入失败（没有声音的平台、测试）就静默。 */
export function createSounds() {
  const enabled = signal(true);
  const loaded = new Map<SoundName, Sound>();

  void (async () => {
    try {
      const saved = await Storage.getItem(KEY);
      if (saved !== null) enabled.set(saved === "1");
      if (!(await Sound.available())) return;
      for (const name of Object.keys(SOURCES) as SoundName[]) {
        loaded.set(name, await Sound.load(SOURCES[name]()));
      }
    } catch {
      // 没有声音也能玩。
    }
  })();

  return {
    enabled,
    toggle() {
      const next = !enabled();
      enabled.set(next);
      void Storage.setItem(KEY, next ? "1" : "0").catch(() => {});
    },
    /** 音量保持在系统声音之下。 */
    play(name: SoundName, options: { volume?: number; rate?: number } = {}) {
      if (!enabled()) return;
      try {
        loaded.get(name)?.play({ volume: (options.volume ?? 1) * 0.6, rate: options.rate ?? 1 });
      } catch {
        // 播放失败不影响游戏。
      }
    },
  };
}

export type Sounds = ReturnType<typeof createSounds>;
