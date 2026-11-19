// 音效：牌桌上的真实声音（出牌、摸牌、碰杠、洗牌），开局时用代码合成成 WAV 载入。
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

/** 一段可复现的白噪声。 */
function noiseSource(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x3fffffff - 1;
  };
}

/** 二阶带通滤波器（RBJ），用来把噪声变成“陶瓷 / 塑料”或“桌面”的质感。 */
function bandpass(freq: number, q: number) {
  const w = (2 * Math.PI * freq) / RATE;
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const b2 = -alpha / a0;
  const a1 = (-2 * Math.cos(w)) / a0;
  const a2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x: number) => {
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

/** 渲染 seconds 秒，fn 逐个采样给出 [-1, 1] 的值；头尾 2ms 淡入淡出，避免爆音。 */
function render(seconds: number, fn: (t: number) => number): Uint8Array {
  const n = Math.floor(seconds * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / RATE);
  const edge = Math.floor(0.002 * RATE);
  for (let i = 0; i < edge; i++) {
    out[i] *= i / edge;
    out[n - 1 - i] *= i / edge;
  }
  return wav(out);
}

const TAU = Math.PI * 2;

/**
 * 牌碰到东西的一下：一段很短的带通噪声（牌本身，2–4 kHz）加几个衰减很快的泛音，
 * `table` 再加一点桌面的低频闷响（铺了绒布的桌子）。返回一个按时间取值的函数，可以叠加。
 */
function hit(opts: { at: number; pitch: number; gain: number; table: number; seed: number }) {
  const n = noiseSource(opts.seed);
  const shell = bandpass(opts.pitch, 2.2);
  const body = bandpass(opts.pitch * 0.48, 3);
  return (t: number) => {
    const u = t - opts.at;
    if (u < 0 || u > 0.12) return 0;
    const raw = n();
    const click = shell(raw) * 2.3 * Math.exp(-u / 0.006) + body(raw) * 1.15 * Math.exp(-u / 0.012);
    const ring = 0.25 * Math.sin(TAU * opts.pitch * 1.03 * u) * Math.exp(-u / 0.01);
    const thump = opts.table * Math.sin(TAU * 165 * u) * Math.exp(-u / 0.03);
    return opts.gain * (click + ring + thump);
  };
}

const sum = (parts: ((t: number) => number)[]) => (t: number) => parts.reduce((a, f) => a + f(t), 0);

/** 钟声：基音加两个泛音，慢慢衰减。 */
const bell = (f: number, t: number, tau: number) =>
  t < 0 ? 0 : (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.01 * t) + 0.12 * Math.sin(TAU * f * 3.02 * t)) * Math.exp(-t / tau);

/** 打出一张牌：拍在桌上的“啪”。三个变体，每次随机挑一个。 */
const slap = (seed: number, pitch: number) => () =>
  render(0.16, hit({ at: 0.004, pitch, gain: 0.55, table: 0.45, seed }));

/** 洗牌：一大把牌互相碰撞，先密后疏，带一点桌面的沙沙声。 */
function shuffle() {
  const rnd = noiseSource(99);
  const parts: ((t: number) => number)[] = [];
  const len = 1.8;
  for (let i = 0; i < 120; i++) {
    const r = (rnd() + 1) / 2;
    const at = 0.02 + Math.pow(r, 1.6) * (len - 0.25);
    const fade = 1 - at / len;
    parts.push(hit({ at, pitch: 2300 + ((rnd() + 1) / 2) * 1900, gain: 0.08 + 0.18 * fade * ((rnd() + 1) / 2), table: 0.05, seed: 1000 + i }));
  }
  const hiss = noiseSource(7);
  const felt = bandpass(1800, 0.7);
  const clatter = sum(parts);
  return render(len, (t) => clatter(t) + 0.05 * felt(hiss()) * Math.min(1, t / 0.15) * Math.max(0, 1 - t / len));
}

const SOURCES = {
  discard: slap(11, 3100),
  discard2: slap(23, 2750),
  discard3: slap(37, 3450),
  /** 摸牌：轻轻一滑，再“嗒”一下。 */
  draw: () => {
    const n = noiseSource(5);
    const slide = bandpass(2600, 0.9);
    const tick = hit({ at: 0.05, pitch: 3600, gain: 0.22, table: 0.08, seed: 41 });
    return render(0.14, (t) => 0.06 * slide(n()) * Math.sin(Math.PI * Math.min(1, t / 0.06)) + tick(t));
  },
  /** 碰：两张牌在手里相碰，再一起放下。 */
  peng: () =>
    render(0.3, sum([
      hit({ at: 0.005, pitch: 3800, gain: 0.4, table: 0, seed: 51 }),
      hit({ at: 0.06, pitch: 3500, gain: 0.35, table: 0, seed: 52 }),
      hit({ at: 0.15, pitch: 2900, gain: 0.5, table: 0.5, seed: 53 }),
    ])),
  /** 杠：三下相碰，最后重重放下。 */
  gang: () =>
    render(0.42, sum([
      hit({ at: 0.005, pitch: 3900, gain: 0.38, table: 0, seed: 61 }),
      hit({ at: 0.065, pitch: 3600, gain: 0.36, table: 0, seed: 62 }),
      hit({ at: 0.13, pitch: 3300, gain: 0.34, table: 0, seed: 63 }),
      hit({ at: 0.24, pitch: 2700, gain: 0.6, table: 0.7, seed: 64 }),
    ])),
  /** 开局：洗牌。 */
  shuffle,
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
