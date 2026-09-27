import type { EcsRegime, RegimeLabel } from "./types.ts";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatUsd(n: number, compact = false): string {
  if (!Number.isFinite(n)) return "—";
  return compact ? usdCompact.format(n) : usd.format(n);
}

export function formatPct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
}

export function formatNumber(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} phút`;
  const h = min / 60;
  if (h < 48) return `${h.toFixed(1)} giờ`;
  return `${(h / 24).toFixed(1)} ngày`;
}

export function barWidth(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "0%";
  return `${Math.min(100, ratio * 100).toFixed(1)}%`;
}

export function signedClass(n: number): string {
  if (n > 0) return "text-profit";
  if (n < 0) return "text-loss";
  return "text-muted";
}

export const REGIME_STYLE: Record<
  RegimeLabel,
  { label: string; className: string; bar: string }
> = {
  BULLISH: { label: "Bullish", className: "text-bull", bar: "bg-bull" },
  NEUTRAL: { label: "Neutral", className: "text-neutral", bar: "bg-neutral" },
  CAUTION: { label: "Caution", className: "text-caution", bar: "bg-caution" },
  STRESS: { label: "Stress", className: "text-stress", bar: "bg-stress" },
};

export const ECS_STYLE: Record<EcsRegime, { label: string; className: string; mult: string }> =
  {
    hot: { label: "Hot", className: "text-profit", mult: "2.00×" },
    warm: { label: "Warm", className: "text-bull", mult: "1.25×" },
    neutral: { label: "Neutral", className: "text-muted", mult: "1.00×" },
    cool: { label: "Cool", className: "text-caution", mult: "0.65×" },
    cold: { label: "Cold", className: "text-loss", mult: "0.15×" },
  };

export const EXIT_LABEL: Record<string, string> = {
  stoploss: "Stoploss",
  trailing: "Trailing stop",
  roi: "Take profit",
  fast_crash_exit: "Crash < 15 phút",
  stagnant_time_exit: "Lệnh ngâm",
  too_many_bad_regimes_long: "Bad regime (long)",
  too_many_bad_regimes_short: "Bad regime (short)",
  bad_regime_loss_long: "Regime gãy + lỗ",
  bad_regime_loss_short: "Regime gãy + lỗ short",
  bearish_divergence: "Bearish divergence (long)",
  end_of_data: "Hết dữ liệu",
};
