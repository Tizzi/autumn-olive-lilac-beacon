export { runOracleBacktest, roundTripFeeRatio } from "./backtest.ts";
export { DEFAULT_PARAMS, SCENARIOS, SIGNAL_META } from "./params.ts";
export {
  formatDuration,
  formatNumber,
  formatPct,
  formatUsd,
  signedClass,
  ECS_STYLE,
  EXIT_LABEL,
  REGIME_STYLE,
} from "./format.ts";
export {
  ensureMarket,
  getCachedMarket,
  loadBinanceMarket,
  MARKET_DATASETS,
  PAIR_UNIVERSE,
  type MarketDatasetId,
} from "./market.ts";
export { runAblation, feeGrid, snapshotMetrics, sweepParam, SWEEP_SPECS } from "./robustness.ts";
export {
  addJournalEntry,
  createJournalEntry,
  loadJournal,
  parseJournalDocument,
  serializeJournalDocument,
} from "./journal.ts";
export type {
  AnalyzedBar,
  AnalyzedPair,
  BacktestResult,
  EcsRegime,
  EquityPoint,
  Metrics,
  PairStats,
  RegimeLabel,
  ScenarioId,
  SignalName,
  StrategyParams,
  Trade,
} from "./types.ts";
