export const CHART = {
  profit: "var(--color-profit)",
  loss: "var(--color-loss)",
  accent: "var(--color-accent)",
  muted: "var(--color-muted)",
  dim: "var(--color-dim)",
  fg: "var(--color-fg)",
  caution: "var(--color-caution)",
  surface: "var(--color-surface)",
  grid: "color-mix(in oklab, var(--color-fg) 8%, transparent)",
  bull: "var(--color-bull)",
  stress: "var(--color-stress)",
  neutral: "var(--color-neutral)",
};

export function downsample<T>(arr: T[], max = 420): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    const item = arr[Math.min(arr.length - 1, Math.floor(i * step))];
    if (item !== undefined) out.push(item);
  }
  const last = arr[arr.length - 1];
  if (last && out[out.length - 1] !== last) out.push(last);
  return out;
}

export function timeLabel(ts: number): string {
  const d = new Date(ts);
  const mo = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${mo}/${day}`;
}
