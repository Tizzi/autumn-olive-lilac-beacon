import { ema, finite, pctChange, rollingMax, rollingRankPct, rollingStd } from "./indicators.ts";
import type { RegimeLabel } from "./types.ts";

export function trendScore(close: number[]): number[] {
  const e20 = ema(close, 20);
  const e50 = ema(close, 50);
  const e200 = ema(close, 200);
  const n = close.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const c = close[i] ?? 0;
    const a = e200[i] ?? 0;
    let s = 0;
    if (c > a) s += 35;
    if ((e20[i] ?? 0) > (e50[i] ?? 0)) s += 25;
    if ((e50[i] ?? 0) > a) s += 25;
    if (a !== 0 && (c - a) / a > 0.02) s += 15;
    out[i] = Math.min(100, Math.max(0, s));
  }
  return out;
}

export function volScore(close: number[], window = 30, rankWindow = 252): number[] {
  const rets = pctChange(close, 1);
  const rv = rollingStd(rets, window).map((v) =>
    Number.isNaN(v) ? Number.NaN : v * Math.sqrt(365),
  );
  const rank = rollingRankPct(rv, rankWindow, 60);
  return rank.map((r) => {
    if (Number.isNaN(r)) return Number.NaN;
    return Math.min(100, Math.max(0, (1 - r) * 100));
  });
}

export function momentumScore(close: number[]): number[] {
  const r7 = pctChange(close, 7);
  const r30 = pctChange(close, 30);
  const r90 = pctChange(close, 90);
  const n = close.length;
  const out = new Array<number>(n).fill(Number.NaN);
  const norm = (r: number, scale: number) => ((Math.tanh(r / scale) + 1) / 2) * 100;
  for (let i = 0; i < n; i++) {
    const a = r7[i];
    const b = r30[i];
    const c = r90[i];
    if (a === undefined || b === undefined || c === undefined) continue;
    if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c)) continue;
    out[i] = Math.min(
      100,
      Math.max(0, norm(a, 0.1) * 0.25 + norm(b, 0.2) * 0.45 + norm(c, 0.35) * 0.3),
    );
  }
  return out;
}

export function drawdownScore(close: number[], window = 60): number[] {
  const peak = rollingMax(close, window);
  const n = close.length;
  const out = new Array<number>(n).fill(Number.NaN);
  for (let i = 0; i < n; i++) {
    const p = peak[i];
    const c = close[i] ?? 0;
    if (p === undefined || Number.isNaN(p) || p === 0) continue;
    const dd = Math.max(-0.25, Math.min(0, (c - p) / p));
    out[i] = Math.min(100, Math.max(0, (1 + dd / 0.25) * 100));
  }
  return out;
}

export function compositeScore(close: number[]): {
  score: number[];
  trend: number[];
  vol: number[];
  mom: number[];
  dd: number[];
} {
  const trend = trendScore(close);
  const vol = volScore(close);
  const mom = momentumScore(close);
  const dd = drawdownScore(close);
  const n = close.length;
  const score = new Array<number>(n).fill(Number.NaN);
  for (let i = 0; i < n; i++) {
    const t = trend[i];
    const v = vol[i];
    const m = mom[i];
    const d = dd[i];
    if (
      t === undefined ||
      v === undefined ||
      m === undefined ||
      d === undefined ||
      Number.isNaN(t) ||
      Number.isNaN(v) ||
      Number.isNaN(m) ||
      Number.isNaN(d)
    ) {
      continue;
    }
    score[i] = Math.min(100, Math.max(0, t * 0.4 + v * 0.3 + m * 0.2 + d * 0.1));
  }
  return { score, trend, vol, mom, dd };
}

export function scoreToLabel(score: number): RegimeLabel {
  if (score >= 70) return "BULLISH";
  if (score >= 50) return "NEUTRAL";
  if (score >= 35) return "CAUTION";
  return "STRESS";
}

/**
 * A 15m bar may only consume the prior completed 1h bar. The current hour's
 * aggregate includes later 15m closes, so using it would leak future data.
 */
export function ffillHourlyOnto15m<T>(hourly: T[], bars15: number, fallback: T): T[] {
  const out = new Array<T>(bars15);
  for (let i = 0; i < bars15; i++) {
    const completedHour = Math.floor(i / 4) - 1;
    const v = completedHour >= 0 ? hourly[completedHour] : undefined;
    out[i] = v === undefined ? fallback : v;
  }
  return out;
}

export function resampleTo1h(open: number[], high: number[], low: number[], close: number[]) {
  const n = close.length;
  const hCount = Math.floor(n / 4);
  const o: number[] = [];
  const h: number[] = [];
  const l: number[] = [];
  const c: number[] = [];
  for (let i = 0; i < hCount; i++) {
    const a = i * 4;
    o.push(open[a] ?? 0);
    c.push(close[a + 3] ?? close[a] ?? 0);
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = 0; j < 4; j++) {
      hi = Math.max(hi, high[a + j] ?? -Infinity);
      lo = Math.min(lo, low[a + j] ?? Infinity);
    }
    h.push(hi);
    l.push(lo);
  }
  return { open: o, high: h, low: l, close: c };
}

export function finiteSeries(arr: number[], fallback = 50): number[] {
  let last = fallback;
  return arr.map((v) => {
    if (Number.isFinite(v)) {
      last = v;
      return v;
    }
    return last;
  });
}

export { finite };
