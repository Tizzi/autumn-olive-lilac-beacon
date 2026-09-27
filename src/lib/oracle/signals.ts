import { ema, rsiWilderRolling, rollingMax, rollingMin } from "./indicators.ts";
import type { SignalSettings, SignalVotes } from "./types.ts";

function emptyVotes(): SignalVotes {
  return { emaCross: 0, emaTrendRsi: 0, rsiMeanRevert: 0, breakout: 0, macd: 0 };
}

export function emaCrossSignal(close: number[], fast: number, slow: number): number[] {
  const f = ema(close, fast);
  const s = ema(close, slow);
  const n = close.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const up = (f[i] ?? 0) > (s[i] ?? 0) && (f[i - 1] ?? 0) <= (s[i - 1] ?? 0);
    const down = (f[i] ?? 0) < (s[i] ?? 0) && (f[i - 1] ?? 0) >= (s[i - 1] ?? 0);
    if (up) out[i] = 1;
    else if (down) out[i] = -1;
  }
  return out;
}

export function emaTrendRsiSignal(
  close: number[],
  trendEmaN: number,
  rsiPeriod: number,
  oversold: number,
  overbought: number,
): number[] {
  const trend = ema(close, trendEmaN);
  const rsi = rsiWilderRolling(close, rsiPeriod);
  const n = close.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const r = rsi[i];
    if (r === undefined || Number.isNaN(r)) continue;
    if ((close[i] ?? 0) > (trend[i] ?? 0) && r < oversold) out[i] = 1;
    else if ((close[i] ?? 0) < (trend[i] ?? 0) && r > overbought) out[i] = -1;
  }
  return out;
}

export function rsiMeanRevertSignal(
  close: number[],
  period: number,
  oversold: number,
  overbought: number,
): number[] {
  const rsi = rsiWilderRolling(close, period);
  const n = close.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const r = rsi[i];
    if (r === undefined || Number.isNaN(r)) continue;
    if (r < oversold) out[i] = 1;
    else if (r > overbought) out[i] = -1;
  }
  return out;
}

export function breakoutSignal(high: number[], low: number[], close: number[], window: number): number[] {
  const hi = rollingMax(high, window, 1);
  const lo = rollingMin(low, window, 1);
  const n = close.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const h = hi[i];
    const l = lo[i];
    if (h === undefined || l === undefined || Number.isNaN(h) || Number.isNaN(l)) continue;
    if ((close[i] ?? 0) > h) out[i] = 1;
    else if ((close[i] ?? 0) < l) out[i] = -1;
  }
  return out;
}

export function macdSignal(close: number[], fast: number, slow: number, signal: number): number[] {
  const fastE = ema(close, fast);
  const slowE = ema(close, slow);
  const macdLine = fastE.map((v, i) => v - (slowE[i] ?? 0));
  const sig = ema(macdLine, signal);
  const hist = macdLine.map((v, i) => v - (sig[i] ?? 0));
  const n = close.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const h = hist[i] ?? 0;
    const p = hist[i - 1] ?? 0;
    if (h > 0 && p <= 0) out[i] = 1;
    else if (h < 0 && p >= 0) out[i] = -1;
  }
  return out;
}

export function buildVotes(
  close: number[],
  high: number[],
  low: number[],
  p: {
    fastEma: number;
    slowEma: number;
    trendEma: number;
    rsiPeriod: number;
    rsiOversold: number;
    rsiOverbought: number;
    rsiPeriod2: number;
    oversold: number;
    overbought: number;
    breakoutWindow: number;
    macdFast: number;
    macdSlow: number;
    macdSignal: number;
    signals: SignalSettings;
  },
): { votes: SignalVotes[]; longVotes: number[]; shortVotes: number[] } {
  const emaC = emaCrossSignal(close, p.fastEma, p.slowEma);
  const trend = emaTrendRsiSignal(close, p.trendEma, p.rsiPeriod, p.rsiOversold, p.rsiOverbought);
  const mean = rsiMeanRevertSignal(close, p.rsiPeriod2, p.oversold, p.overbought);
  const brk = breakoutSignal(high, low, close, p.breakoutWindow);
  const macd = macdSignal(close, p.macdFast, p.macdSlow, p.macdSignal);
  const n = close.length;
  const votes: SignalVotes[] = new Array(n);
  const longVotes = new Array<number>(n);
  const shortVotes = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const v: SignalVotes = {
      emaCross: p.signals.emaCross ? (emaC[i] ?? 0) : 0,
      emaTrendRsi: p.signals.emaTrendRsi ? (trend[i] ?? 0) : 0,
      rsiMeanRevert: p.signals.rsiMeanRevert ? (mean[i] ?? 0) : 0,
      breakout: p.signals.breakout ? (brk[i] ?? 0) : 0,
      macd: p.signals.macd ? (macd[i] ?? 0) : 0,
    };
    votes[i] = v;
    longVotes[i] =
      (v.emaCross === 1 ? 1 : 0) +
      (v.emaTrendRsi === 1 ? 1 : 0) +
      (v.rsiMeanRevert === 1 ? 1 : 0) +
      (v.breakout === 1 ? 1 : 0) +
      (v.macd === 1 ? 1 : 0);
    shortVotes[i] =
      (v.emaCross === -1 ? 1 : 0) +
      (v.emaTrendRsi === -1 ? 1 : 0) +
      (v.rsiMeanRevert === -1 ? 1 : 0) +
      (v.breakout === -1 ? 1 : 0) +
      (v.macd === -1 ? 1 : 0);
  }
  return { votes, longVotes, shortVotes };
}

export { emptyVotes };
