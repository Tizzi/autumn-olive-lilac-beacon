import dashboardScan from "./data/scan-dashboard.json" with { type: "json" };
import splitScans from "./data/scan-splits.json" with { type: "json" };

export type ScanSide = "long" | "short";

export interface ScanBucket {
  signal: string;
  side: ScanSide;
  regime: string;
  recommended: boolean;
  train_trades: number;
  train_expectancy_pct: number;
  train_median_pct: number;
  train_win_rate_pct: number;
  train_profit_factor: number;
  oos_trades: number;
  oos_expectancy_pct: number;
  oos_median_pct: number;
  oos_win_rate_pct: number;
  oos_profit_factor: number;
}

export interface ScanReport {
  id: string;
  label: string;
  warning: string;
  methodology: string;
  horizonBars: number;
  costBps: number;
  recommendations: ScanBucket[];
  buckets: ScanBucket[];
}

type RawScan = {
  warning?: string;
  methodology?: string;
  horizon_bars?: number;
  roundtrip_cost_bps?: number;
  recommendations?: ScanBucket[];
  buckets?: ScanBucket[];
};

const SIGNAL_LABEL: Record<string, string> = {
  ema_cross: "EMA Cross",
  ema_trend_rsi: "Trend RSI",
  rsi_mean_revert: "RSI revert",
  breakout: "Breakout",
  macd: "MACD",
};

const REGIME_LABEL: Record<string, string> = {
  bull_trend_high_vol: "Bull · vol cao",
  bull_trend_low_vol: "Bull · vol thấp",
  bear_trend_high_vol: "Bear · vol cao",
  bear_trend_low_vol: "Bear · vol thấp",
  range_low_vol: "Range",
  stress: "Stress",
};

export function scanSignalLabel(id: string): string {
  return SIGNAL_LABEL[id] ?? id;
}

export function scanRegimeLabel(id: string): string {
  return REGIME_LABEL[id] ?? id;
}

function wrap(id: string, label: string, raw: RawScan): ScanReport {
  return {
    id,
    label,
    warning: raw.warning ?? "",
    methodology:
      raw.methodology ??
      "Tín hiệu tại close t, fill tại open t+1, đánh giá tại close t+horizon.",
    horizonBars: raw.horizon_bars ?? 16,
    costBps: raw.roundtrip_cost_bps ?? 8,
    recommendations: raw.recommendations ?? [],
    buckets: raw.buckets ?? raw.recommendations ?? [],
  };
}

const splits = splitScans as Record<string, RawScan>;

export const SCAN_REPORTS: ScanReport[] = [
  wrap("dashboard", "Sample 70/30", dashboardScan as RawScan),
  wrap("train", "Train 2024", splits.train ?? {}),
  wrap("validation", "Validation 2025", splits.validation ?? {}),
  wrap("oos", "OOS 2026", splits.oos ?? {}),
];
