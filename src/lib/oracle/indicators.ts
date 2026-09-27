export function ema(values: number[], span: number): number[] {
  const n = values.length;
  const out = new Array<number>(n);
  const alpha = 2 / (span + 1);
  let prev = values[0] ?? 0;
  out[0] = prev;
  for (let i = 1; i < n; i++) {
    const v = values[i] ?? prev;
    prev = alpha * v + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

export function rollingMean(values: number[], window: number): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(Number.NaN);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += values[i] ?? 0;
    if (i >= window) sum -= values[i - window] ?? 0;
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

export function rsiWilderRolling(close: number[], period: number): number[] {
  const n = close.length;
  const gain = new Array<number>(n).fill(0);
  const loss = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const d = (close[i] ?? 0) - (close[i - 1] ?? 0);
    gain[i] = d > 0 ? d : 0;
    loss[i] = d < 0 ? -d : 0;
  }
  const gMean = rollingMean(gain, period);
  const lMean = rollingMean(loss, period);
  const out = new Array<number>(n).fill(Number.NaN);
  for (let i = 0; i < n; i++) {
    const g = gMean[i];
    const l = lMean[i];
    if (g === undefined || l === undefined || Number.isNaN(g) || Number.isNaN(l)) continue;
    if (l === 0) {
      out[i] = g === 0 ? 50 : 100;
    } else {
      const rs = g / l;
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}

export function rollingMax(values: number[], window: number, shift = 0): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(Number.NaN);
  const src = shift ? values.map((_, i) => (i >= shift ? values[i - shift]! : Number.NaN)) : values;
  for (let i = 0; i < n; i++) {
    const start = i - window + 1;
    if (start < 0) continue;
    let m = -Infinity;
    let ok = true;
    for (let j = start; j <= i; j++) {
      const v = src[j];
      if (v === undefined || Number.isNaN(v)) {
        ok = false;
        break;
      }
      if (v > m) m = v;
    }
    if (ok) out[i] = m;
  }
  return out;
}

export function rollingMin(values: number[], window: number, shift = 0): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(Number.NaN);
  const src = shift ? values.map((_, i) => (i >= shift ? values[i - shift]! : Number.NaN)) : values;
  for (let i = 0; i < n; i++) {
    const start = i - window + 1;
    if (start < 0) continue;
    let m = Infinity;
    let ok = true;
    for (let j = start; j <= i; j++) {
      const v = src[j];
      if (v === undefined || Number.isNaN(v)) {
        ok = false;
        break;
      }
      if (v < m) m = v;
    }
    if (ok) out[i] = m;
  }
  return out;
}

export function pctChange(values: number[], periods = 1): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(Number.NaN);
  for (let i = periods; i < n; i++) {
    const prev = values[i - periods] ?? 0;
    const cur = values[i] ?? 0;
    out[i] = prev === 0 ? Number.NaN : (cur - prev) / prev;
  }
  return out;
}

export function rollingStd(values: number[], window: number): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(Number.NaN);
  for (let i = window - 1; i < n; i++) {
    let sum = 0;
    let sumSq = 0;
    let c = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const v = values[j];
      if (v === undefined || Number.isNaN(v)) continue;
      sum += v;
      sumSq += v * v;
      c += 1;
    }
    if (c < 2) continue;
    const mean = sum / c;
    const var_ = sumSq / c - mean * mean;
    out[i] = Math.sqrt(Math.max(0, var_));
  }
  return out;
}

export function rollingRankPct(
  values: number[],
  window: number,
  minPeriods: number,
): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(Number.NaN);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - window + 1);
    const slice: number[] = [];
    for (let j = start; j <= i; j++) {
      const v = values[j];
      if (v !== undefined && !Number.isNaN(v)) slice.push(v);
    }
    if (slice.length < minPeriods) continue;
    const cur = values[i];
    if (cur === undefined || Number.isNaN(cur)) continue;
    let le = 0;
    for (const v of slice) if (v <= cur) le += 1;
    out[i] = le / slice.length;
  }
  return out;
}

export function finite(v: number | undefined, fallback = 0): number {
  return v !== undefined && Number.isFinite(v) ? v : fallback;
}
