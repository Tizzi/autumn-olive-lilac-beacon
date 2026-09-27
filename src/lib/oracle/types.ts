export type Side = "long" | "short";

export type RegimeLabel = "BULLISH" | "NEUTRAL" | "CAUTION" | "STRESS";

export type EcsRegime = "neutral" | "cold" | "cool" | "warm" | "hot";

export type ScenarioId = "mixed" | "bull" | "stress" | "range";

export type SignalName =
  | "emaCross"
  | "emaTrendRsi"
  | "rsiMeanRevert"
  | "breakout"
  | "macd";

export type ExitReason =
  | "stoploss"
  | "trailing"
  | "roi"
  | "fast_crash_exit"
  | "stagnant_time_exit"
  | "too_many_bad_regimes_long"
  | "too_many_bad_regimes_short"
  | "bad_regime_loss_long"
  | "bad_regime_loss_short"
  | "bearish_divergence"
  | "end_of_data";

export type SignalSettings = Record<SignalName, boolean>;

export type ExitSignalName =
  | "bearishDivergence"
  | "fastCrashExit"
  | "stagnantTimeExit"
  | "tooManyBadRegimes";

export type ExitSignalSettings = Record<ExitSignalName, boolean>;

export interface StrategyParams {
  wallet: number;
  maxOpenTrades: number;
  leverage: number;
  stoploss: number;
  trailingStop: boolean;
  trailingStopPositive: number;
  trailingStopPositiveOffset: number;
  minimalRoi: number;
  useRegimeFilter: boolean;
  minRegimeForLong: number;
  maxRegimeForShort: number;
  badRegimeCountLimit: number;
  minVotes: number;
  maxContraVotes: number;
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
  startupBars: number;
  ecsEnabled: boolean;
  /** Round-trip cost in basis points of notional (entry + exit). */
  feeBps: number;
  signals: SignalSettings;
  exitSignals: ExitSignalSettings;
}

export interface OhlcvBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PairSpec {
  symbol: string;
  name: string;
  startPrice: number;
  beta: number;
  idioVol: number;
}

export interface SignalVotes {
  emaCross: number;
  emaTrendRsi: number;
  rsiMeanRevert: number;
  breakout: number;
  macd: number;
}

export interface AnalyzedBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  emaFast: number;
  emaSlow: number;
  rsi: number;
  rsi2: number;
  macdHist: number;
  trendEma: number;
  bearishDivergence: boolean;
  votes: SignalVotes;
  longVotes: number;
  shortVotes: number;
  regimeScore: number;
  regimeLabel: RegimeLabel;
  trendScore: number;
  volScore: number;
  momScore: number;
  ddScore: number;
  badLong: number;
  badShort: number;
}

export interface AnalyzedPair {
  spec: PairSpec;
  bars: AnalyzedBar[];
}

export interface Trade {
  id: string;
  pair: string;
  side: Side;
  entryBar: number;
  exitBar: number;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  stake: number;
  leverage: number;
  profitRatio: number;
  profitAbs: number;
  feeAbs: number;
  enterTag: string;
  exitReason: ExitReason;
  votes: SignalVotes;
  longVotes: number;
  shortVotes: number;
  regimeScore: number;
  regimeLabel: RegimeLabel;
  ecsRegime: EcsRegime;
  durationMin: number;
}

export interface EquityPoint {
  time: number;
  equity: number;
  drawdown: number;
  ecs: EcsRegime;
  openTrades: number;
}

export interface PairStats {
  symbol: string;
  trades: number;
  wins: number;
  pnl: number;
  winRate: number;
  longPnl: number;
  shortPnl: number;
  avgDurationMin: number;
}

export interface Metrics {
  startBalance: number;
  endBalance: number;
  netProfit: number;
  netProfitPct: number;
  trades: number;
  closedTrades: number;
  closedNetProfit: number;
  closedProfitFactor: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpe: number;
  avgDurationMin: number;
  longTrades: number;
  shortTrades: number;
  longPnl: number;
  shortPnl: number;
  exposurePct: number;
  expectancy: number;
  bestTrade: number;
  worstTrade: number;
  feesPaid: number;
  exitReasons: Record<string, number>;
  signalHits: Record<SignalName, { long: number; short: number; withWin: number }>;
  regimeAtEntry: Record<RegimeLabel, number>;
  ecsAtEntry: Record<EcsRegime, number>;
  pairStats: PairStats[];
}

export interface BacktestResult {
  scenario: ScenarioId;
  seed: number;
  params: StrategyParams;
  pairs: AnalyzedPair[];
  trades: Trade[];
  equity: EquityPoint[];
  metrics: Metrics;
}
