import { runOracleBacktest } from "./backtest.ts";
import type { MarketBundle, MarketDatasetId } from "./market.ts";
import { SIGNAL_META } from "./params.ts";
import type {
  Metrics,
  ScenarioId,
  StrategyParams,
} from "./types.ts";

export interface SnapshotMetrics {
  trades: number;
  closedTrades: number;
  closedNetProfit: number;
  closedProfitFactor: number;
  winRate: number;
  maxDrawdownPct: number;
  sharpe: number;
  expectancy: number;
  feesPaid: number;
  netProfit: number;
  profitFactor: number;
}

export function snapshotMetrics(metrics: Metrics): SnapshotMetrics {
  return {
    trades: metrics.trades,
    closedTrades: metrics.closedTrades,
    closedNetProfit: metrics.closedNetProfit,
    closedProfitFactor: metrics.closedProfitFactor,
    winRate: metrics.winRate,
    maxDrawdownPct: metrics.maxDrawdownPct,
    sharpe: metrics.sharpe,
    expectancy: metrics.expectancy,
    feesPaid: metrics.feesPaid,
    netProfit: metrics.netProfit,
    profitFactor: metrics.profitFactor,
  };
}

export type SweepKey =
  | "minVotes"
  | "oversold"
  | "breakoutWindow"
  | "stoploss"
  | "feeBps"
  | "minRegimeForLong"
  | "maxOpenTrades"
  | "leverage";

export interface SweepSpec {
  key: SweepKey;
  label: string;
  hint: string;
  values: number[];
  format: (value: number) => string;
}

export const SWEEP_SPECS: SweepSpec[] = [
  {
    key: "minVotes",
    label: "Phiếu tối thiểu",
    hint: "Ngưỡng consensus. Tăng = ít lệnh hơn.",
    values: [1, 2, 3, 4, 5],
    format: (v) => `${v}/5`,
  },
  {
    key: "oversold",
    label: "RSI mean-revert",
    hint: "Oversold của RSI revert.",
    values: [25, 28, 30, 32, 35, 40],
    format: (v) => String(v),
  },
  {
    key: "breakoutWindow",
    label: "Cửa sổ breakout",
    hint: "Donchian lookback.",
    values: [10, 15, 20, 30, 40, 50],
    format: (v) => String(v),
  },
  {
    key: "stoploss",
    label: "Stoploss",
    hint: "Trên profit đã nhân đòn bẩy.",
    values: [-0.08, -0.12, -0.17, -0.22, -0.28],
    format: (v) => `${Math.round(Math.abs(v) * 100)}%`,
  },
  {
    key: "feeBps",
    label: "Phí round-trip",
    hint: "bps trên notional, chưa nhân đòn bẩy.",
    values: [0, 4, 8, 12, 16, 24],
    format: (v) => `${v} bps`,
  },
  {
    key: "minRegimeForLong",
    label: "Min score long",
    hint: "Chỉ long khi regime_score ≥ ngưỡng.",
    values: [35, 40, 45, 50, 55, 60],
    format: (v) => String(v),
  },
  {
    key: "maxOpenTrades",
    label: "Max lệnh mở",
    hint: "Capacity đồng thời.",
    values: [1, 2, 3, 5, 8],
    format: (v) => String(v),
  },
  {
    key: "leverage",
    label: "Đòn bẩy",
    hint: "Nhân PnL, phí và stoploss.",
    values: [1, 2, 3, 5, 8],
    format: (v) => `${v}×`,
  },
];

export interface SweepPoint {
  value: number;
  label: string;
  metrics: SnapshotMetrics;
}

export function sweepParam(
  params: StrategyParams,
  seed: number,
  scenario: ScenarioId,
  dataset: MarketDatasetId,
  market: MarketBundle,
  spec: SweepSpec,
): SweepPoint[] {
  return spec.values.map((value) => {
    const next = { ...params, [spec.key]: value };
    const result = runOracleBacktest(next, seed, scenario, dataset, market);
    return { value, label: spec.format(value), metrics: snapshotMetrics(result.metrics) };
  });
}

export interface AblationRow {
  id: string;
  label: string;
  kind: "baseline" | "signal-off" | "exit-off" | "filter-off";
  metrics: SnapshotMetrics;
  deltaPf: number;
  deltaTrades: number;
  deltaProfit: number;
}

function withDelta(row: Omit<AblationRow, "deltaPf" | "deltaTrades" | "deltaProfit">, baseline: SnapshotMetrics): AblationRow {
  return {
    ...row,
    deltaPf: row.metrics.closedProfitFactor - baseline.closedProfitFactor,
    deltaTrades: row.metrics.closedTrades - baseline.closedTrades,
    deltaProfit: row.metrics.closedNetProfit - baseline.closedNetProfit,
  };
}

export function runAblation(
  params: StrategyParams,
  seed: number,
  scenario: ScenarioId,
  dataset: MarketDatasetId,
  market: MarketBundle,
): AblationRow[] {
  const baselineResult = runOracleBacktest(params, seed, scenario, dataset, market);
  const baseline = snapshotMetrics(baselineResult.metrics);
  const rows: AblationRow[] = [
    withDelta(
      { id: "baseline", label: "Cấu hình hiện tại", kind: "baseline", metrics: baseline },
      baseline,
    ),
  ];

  for (const signal of SIGNAL_META) {
    const next: StrategyParams = {
      ...params,
      signals: { ...params.signals, [signal.key]: false },
    };
    const result = runOracleBacktest(next, seed, scenario, dataset, market);
    rows.push(
      withDelta(
        {
          id: signal.key,
          label: `Tắt ${signal.name}`,
          kind: "signal-off",
          metrics: snapshotMetrics(result.metrics),
        },
        baseline,
      ),
    );
  }

  const noRegime: StrategyParams = { ...params, useRegimeFilter: false };
  rows.push(
    withDelta(
      {
        id: "regime-off",
        label: "Tắt lọc regime",
        kind: "filter-off",
        metrics: snapshotMetrics(runOracleBacktest(noRegime, seed, scenario, dataset, market).metrics),
      },
      baseline,
    ),
  );

  const noEcs: StrategyParams = { ...params, ecsEnabled: false };
  rows.push(
    withDelta(
      {
        id: "ecs-off",
        label: "Tắt ECS",
        kind: "filter-off",
        metrics: snapshotMetrics(runOracleBacktest(noEcs, seed, scenario, dataset, market).metrics),
      },
      baseline,
    ),
  );

  const exitToggles: { id: string; label: string; patch: Partial<StrategyParams> }[] = [
    {
      id: "exit-divergence",
      label: "Tắt bearish divergence",
      patch: { exitSignals: { ...params.exitSignals, bearishDivergence: false } },
    },
    {
      id: "exit-crash",
      label: "Tắt fast crash",
      patch: { exitSignals: { ...params.exitSignals, fastCrashExit: false } },
    },
    {
      id: "exit-stagnant",
      label: "Tắt stagnant time",
      patch: { exitSignals: { ...params.exitSignals, stagnantTimeExit: false } },
    },
    {
      id: "exit-bad-regime",
      label: "Tắt too-many-bad-regimes",
      patch: { exitSignals: { ...params.exitSignals, tooManyBadRegimes: false } },
    },
  ];

  for (const toggle of exitToggles) {
    const next = { ...params, ...toggle.patch };
    const result = runOracleBacktest(next, seed, scenario, dataset, market);
    rows.push(
      withDelta(
        {
          id: toggle.id,
          label: toggle.label,
          kind: "exit-off",
          metrics: snapshotMetrics(result.metrics),
        },
        baseline,
      ),
    );
  }

  return rows;
}

export function feeGrid(
  params: StrategyParams,
  seed: number,
  scenario: ScenarioId,
  dataset: MarketDatasetId,
  market: MarketBundle,
  fees: number[] = [0, 4, 8, 16, 24],
): SweepPoint[] {
  const spec: SweepSpec = {
    key: "feeBps",
    label: "Phí",
    hint: "",
    values: fees,
    format: (v) => `${v} bps`,
  };
  return sweepParam(params, seed, scenario, dataset, market, spec);
}
