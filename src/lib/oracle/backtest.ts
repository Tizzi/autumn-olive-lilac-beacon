import { ema, rollingMax, rsiWilderRolling } from "./indicators.ts";
import { loadBinanceMarket, type MarketBundle, type MarketDatasetId } from "./market.ts";
import { DEFAULT_PARAMS, DIVERGENCE_LOOKBACK } from "./params.ts";
import {
  compositeScore,
  ffillHourlyOnto15m,
  finiteSeries,
  resampleTo1h,
  scoreToLabel,
} from "./regime.ts";
import { buildVotes } from "./signals.ts";
import type {
  AnalyzedBar,
  AnalyzedPair,
  BacktestResult,
  EcsRegime,
  EquityPoint,
  ExitReason,
  Metrics,
  PairStats,
  RegimeLabel,
  ScenarioId,
  SignalName,
  SignalVotes,
  StrategyParams,
  Trade,
} from "./types.ts";

const BAR_MIN = 15;
const resultCache = new Map<string, BacktestResult>();

function cacheKey(
  params: StrategyParams,
  seed: number,
  scenario: ScenarioId,
  dataset: MarketDatasetId,
): string {
  return `${dataset}|${seed}|${scenario}|${JSON.stringify(params)}`;
}

function ecsMultiplier(regime: EcsRegime): number {
  if (regime === "cold") return 0.15;
  if (regime === "cool") return 0.65;
  if (regime === "warm") return 1.25;
  if (regime === "hot") return 2;
  return 1;
}

class EquityCurveSizing {
  history: number[] = [];
  peak = 0;

  constructor(start: number) {
    this.update(start);
  }

  update(balance: number) {
    this.history.push(balance);
    this.peak = Math.max(this.peak, balance);
  }

  regime(): EcsRegime {
    if (this.history.length < 4) return "neutral";
    const last = this.history[this.history.length - 1] ?? 0;
    const dd = this.peak > 0 ? (this.peak - last) / this.peak : 0;
    const look = this.history.slice(-8);
    const first = look[0] ?? last;
    const slope = first !== 0 ? (last - first) / first : 0;
    if (dd > 0.12) return "cold";
    if (dd > 0.06) return "cool";
    if (dd < 0.02 && slope > 0.03) return "hot";
    if (slope > 0 && dd < 0.04) return "warm";
    if (slope < 0) return "cool";
    return "neutral";
  }
}

function cloneVotes(v: SignalVotes): SignalVotes {
  return { ...v };
}

function analyzePair(
  spec: AnalyzedPair["spec"],
  bars: { time: number; open: number; high: number; low: number; close: number }[],
  params: StrategyParams,
): { pair: AnalyzedPair; hourlyScore: number[] } {
  const n = bars.length;
  const close = bars.map((b) => b.close);
  const high = bars.map((b) => b.high);
  const low = bars.map((b) => b.low);
  const open = bars.map((b) => b.open);

  const h1 = resampleTo1h(open, high, low, close);
  const hourly = compositeScore(h1.close);
  const hScore = finiteSeries(hourly.score, 50);
  const hTrend = finiteSeries(hourly.trend, 50);
  const hVol = finiteSeries(hourly.vol, 50);
  const hMom = finiteSeries(hourly.mom, 50);
  const hDd = finiteSeries(hourly.dd, 50);

  const regimeScore = ffillHourlyOnto15m(hScore, n, 50);
  const trendScore = ffillHourlyOnto15m(hTrend, n, 50);
  const volScore = ffillHourlyOnto15m(hVol, n, 50);
  const momScore = ffillHourlyOnto15m(hMom, n, 50);
  const ddScore = ffillHourlyOnto15m(hDd, n, 50);

  const { votes, longVotes, shortVotes } = buildVotes(close, high, low, params);
  const emaFast = ema(close, params.fastEma);
  const emaSlow = ema(close, params.slowEma);
  const rsi = rsiWilderRolling(close, params.rsiPeriod);
  const rsi2 = rsiWilderRolling(close, params.rsiPeriod2);
  // Matches the reference strategy: compare this close/RSI with the preceding window only.
  const priorCloseMax = rollingMax(close, DIVERGENCE_LOOKBACK, 1);
  const priorRsiMax = rollingMax(
    rsi.map((value) => (Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY)),
    DIVERGENCE_LOOKBACK,
    1,
  );
  const macdFastE = ema(close, params.macdFast);
  const macdSlowE = ema(close, params.macdSlow);
  const macdLine = macdFastE.map((v, i) => v - (macdSlowE[i] ?? 0));
  const macdSig = ema(macdLine, params.macdSignal);
  const macdHist = macdLine.map((v, i) => v - (macdSig[i] ?? 0));
  const trendEma = ema(close, params.trendEma);

  const analyzed: AnalyzedBar[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const score = regimeScore[i] ?? 50;
    analyzed[i] = {
      time: bars[i]!.time,
      open: bars[i]!.open,
      high: bars[i]!.high,
      low: bars[i]!.low,
      close: bars[i]!.close,
      emaFast: emaFast[i] ?? bars[i]!.close,
      emaSlow: emaSlow[i] ?? bars[i]!.close,
      rsi: Number.isFinite(rsi[i]) ? (rsi[i] as number) : 50,
      rsi2: Number.isFinite(rsi2[i]) ? (rsi2[i] as number) : 50,
      macdHist: macdHist[i] ?? 0,
      trendEma: trendEma[i] ?? bars[i]!.close,
      bearishDivergence:
        (close[i] ?? 0) >= (priorCloseMax[i] ?? Number.POSITIVE_INFINITY) &&
        Number.isFinite(rsi[i]) &&
        (rsi[i] ?? Number.POSITIVE_INFINITY) < (priorRsiMax[i] ?? Number.NEGATIVE_INFINITY),
      votes: votes[i] ?? {
        emaCross: 0,
        emaTrendRsi: 0,
        rsiMeanRevert: 0,
        breakout: 0,
        macd: 0,
      },
      longVotes: longVotes[i] ?? 0,
      shortVotes: shortVotes[i] ?? 0,
      regimeScore: score,
      regimeLabel: scoreToLabel(score),
      trendScore: trendScore[i] ?? 50,
      volScore: volScore[i] ?? 50,
      momScore: momScore[i] ?? 50,
      ddScore: ddScore[i] ?? 50,
      badLong: 0,
      badShort: 0,
    };
  }

  return { pair: { spec, bars: analyzed }, hourlyScore: hScore };
}

function profitRatio(side: "long" | "short", entry: number, price: number, leverage: number): number {
  const raw = side === "long" ? (price - entry) / entry : (entry - price) / entry;
  return raw * leverage;
}

/** Round-trip fee as a fraction of stake (notional × bps). */
export function roundTripFeeRatio(leverage: number, feeBps: number): number {
  return (Math.max(0, feeBps) / 10_000) * leverage;
}

function stopPrice(side: "long" | "short", entry: number, leverage: number, stoploss: number): number {
  const move = Math.abs(stoploss) / leverage;
  return side === "long" ? entry * (1 - move) : entry * (1 + move);
}

interface OpenTrade {
  id: string;
  pair: string;
  side: "long" | "short";
  entryBar: number;
  entryTime: number;
  entryPrice: number;
  stake: number;
  leverage: number;
  votes: SignalVotes;
  longVotes: number;
  shortVotes: number;
  regimeScore: number;
  regimeLabel: RegimeLabel;
  ecsRegime: EcsRegime;
  highWater: number;
  trailActive: boolean;
}

type PendingTrade = OpenTrade;

function fillAtProtectiveLevel(
  side: "long" | "short",
  bar: AnalyzedBar,
  level: number,
): number | null {
  // A gap through a stop fills at the open; otherwise use the triggered stop level.
  if (side === "long") {
    if (bar.open <= level) return bar.open;
    return bar.low <= level ? level : null;
  }
  if (bar.open >= level) return bar.open;
  return bar.high >= level ? level : null;
}

function updateTrailingState(t: OpenTrade, bar: AnalyzedBar, params: StrategyParams): void {
  const candidateHighWater =
    t.side === "long" ? Math.max(t.highWater, bar.high) : Math.min(t.highWater, bar.low);
  const profit = profitRatio(t.side, t.entryPrice, candidateHighWater, t.leverage);
  t.highWater = candidateHighWater;
  if (params.trailingStop && profit >= params.trailingStopPositiveOffset) t.trailActive = true;
}

function checkExit(
  t: OpenTrade,
  i: number,
  bar: AnalyzedBar,
  params: StrategyParams,
): { price: number; reason: ExitReason } | null {
  const lev = t.leverage;
  const profitAt = (price: number) => profitRatio(t.side, t.entryPrice, price, lev);
  const hardStop = stopPrice(t.side, t.entryPrice, lev, params.stoploss);
  let protectiveLevel = hardStop;
  let protectiveReason: ExitReason = "stoploss";

  // The current candle cannot arm and trigger a trail: its high/low ordering is unknown.
  if (t.trailActive) {
    const trailMove = params.trailingStopPositive / lev;
    const trail =
      t.side === "long" ? t.highWater * (1 - trailMove) : t.highWater * (1 + trailMove);
    const trailIsTighter = t.side === "long" ? trail > hardStop : trail < hardStop;
    if (trailIsTighter) {
      protectiveLevel = trail;
      protectiveReason = "trailing";
    }
  }

  const protectiveFill = fillAtProtectiveLevel(t.side, bar, protectiveLevel);
  if (protectiveFill !== null) return { price: protectiveFill, reason: protectiveReason };

  const closeP = profitAt(bar.close);
  // Reference MultiPairRegimeStrategy.py: close makes a 20-bar high while RSI fails its prior high.
  // Both values belong to the completed current bar, so the exit is causal at this close.
  if (
    params.exitSignals.bearishDivergence &&
    t.side === "long" &&
    i > t.entryBar &&
    bar.bearishDivergence
  ) {
    return { price: bar.close, reason: "bearish_divergence" };
  }
  if (closeP >= params.minimalRoi) return { price: bar.close, reason: "roi" };

  const duration = (i - t.entryBar) * BAR_MIN;
  if (params.exitSignals.fastCrashExit && duration < 15 && closeP < -0.09) {
    return { price: bar.close, reason: "fast_crash_exit" };
  }
  if (
    params.exitSignals.stagnantTimeExit &&
    duration > 30 &&
    duration < 65 &&
    closeP >= -0.001 &&
    closeP < 0.01
  ) {
    return { price: bar.close, reason: "stagnant_time_exit" };
  }
  if (params.exitSignals.tooManyBadRegimes && closeP < -0.12) {
    if (t.side === "short" && bar.badShort > params.badRegimeCountLimit) {
      return { price: bar.close, reason: "too_many_bad_regimes_short" };
    }
    if (t.side === "long" && bar.badLong > params.badRegimeCountLimit) {
      return { price: bar.close, reason: "too_many_bad_regimes_long" };
    }
  }
  if (closeP < -0.077 && params.useRegimeFilter) {
    if (t.side === "short" && bar.regimeScore > params.maxRegimeForShort) {
      return { price: bar.close, reason: "bad_regime_loss_short" };
    }
    if (t.side === "long" && bar.regimeScore < params.minRegimeForLong) {
      return { price: bar.close, reason: "bad_regime_loss_long" };
    }
  }
  return null;
}

function emptyMetrics(start: number): Metrics {
  const signalHits = {
    emaCross: { long: 0, short: 0, withWin: 0 },
    emaTrendRsi: { long: 0, short: 0, withWin: 0 },
    rsiMeanRevert: { long: 0, short: 0, withWin: 0 },
    breakout: { long: 0, short: 0, withWin: 0 },
    macd: { long: 0, short: 0, withWin: 0 },
  };
  return {
    startBalance: start,
    endBalance: start,
    netProfit: 0,
    netProfitPct: 0,
    trades: 0,
    closedTrades: 0,
    closedNetProfit: 0,
    closedProfitFactor: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    profitFactor: 0,
    avgWin: 0,
    avgLoss: 0,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    sharpe: 0,
    avgDurationMin: 0,
    longTrades: 0,
    shortTrades: 0,
    longPnl: 0,
    shortPnl: 0,
    exposurePct: 0,
    expectancy: 0,
    bestTrade: 0,
    worstTrade: 0,
    feesPaid: 0,
    exitReasons: {},
    signalHits,
    regimeAtEntry: { BULLISH: 0, NEUTRAL: 0, CAUTION: 0, STRESS: 0 },
    ecsAtEntry: { neutral: 0, cold: 0, cool: 0, warm: 0, hot: 0 },
    pairStats: [],
  };
}

function pairStatsFrom(trades: Trade[]): PairStats[] {
  const map = new Map<
    string,
    { symbol: string; trades: number; wins: number; pnl: number; longPnl: number; shortPnl: number; durationMin: number }
  >();
  for (const t of trades) {
    const row = map.get(t.pair) ?? {
      symbol: t.pair,
      trades: 0,
      wins: 0,
      pnl: 0,
      longPnl: 0,
      shortPnl: 0,
      durationMin: 0,
    };
    row.trades += 1;
    row.pnl += t.profitAbs;
    row.durationMin += t.durationMin;
    if (t.profitAbs > 0) row.wins += 1;
    if (t.side === "long") row.longPnl += t.profitAbs;
    else row.shortPnl += t.profitAbs;
    map.set(t.pair, row);
  }
  return [...map.values()]
    .map((row) => ({
      symbol: row.symbol,
      trades: row.trades,
      wins: row.wins,
      pnl: row.pnl,
      winRate: row.trades ? row.wins / row.trades : 0,
      longPnl: row.longPnl,
      shortPnl: row.shortPnl,
      avgDurationMin: row.trades ? row.durationMin / row.trades : 0,
    }))
    .sort((a, b) => b.pnl - a.pnl);
}

function summarize(trades: Trade[], equity: EquityPoint[], start: number, end: number): Metrics {
  const m = emptyMetrics(start);
  m.endBalance = end;
  m.netProfit = end - start;
  m.netProfitPct = start !== 0 ? (end - start) / start : 0;
  m.trades = trades.length;
  let grossWin = 0;
  let grossLoss = 0;
  let dur = 0;
  let exposedBars = 0;
  for (const t of trades) {
    dur += t.durationMin;
    m.feesPaid += t.feeAbs;
    m.exitReasons[t.exitReason] = (m.exitReasons[t.exitReason] ?? 0) + 1;
    m.regimeAtEntry[t.regimeLabel] += 1;
    m.ecsAtEntry[t.ecsRegime] += 1;
    if (t.side === "long") {
      m.longTrades += 1;
      m.longPnl += t.profitAbs;
    } else {
      m.shortTrades += 1;
      m.shortPnl += t.profitAbs;
    }
    if (t.profitAbs >= 0) {
      m.wins += 1;
      grossWin += t.profitAbs;
    } else {
      m.losses += 1;
      grossLoss += -t.profitAbs;
    }
    m.bestTrade = m.trades === 1 ? t.profitAbs : Math.max(m.bestTrade, t.profitAbs);
    m.worstTrade = m.trades === 1 ? t.profitAbs : Math.min(m.worstTrade, t.profitAbs);
    const keys: SignalName[] = ["emaCross", "emaTrendRsi", "rsiMeanRevert", "breakout", "macd"];
    for (const k of keys) {
      const v = t.votes[k];
      if (v === 1) m.signalHits[k].long += 1;
      if (v === -1) m.signalHits[k].short += 1;
      if (v !== 0 && t.profitAbs > 0) m.signalHits[k].withWin += 1;
    }
  }
  m.winRate = m.trades ? m.wins / m.trades : 0;
  m.profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
  const closed = trades.filter((t) => t.exitReason !== "end_of_data");
  let closedWins = 0;
  let closedLosses = 0;
  for (const t of closed) {
    if (t.profitAbs >= 0) closedWins += t.profitAbs;
    else closedLosses += -t.profitAbs;
  }
  m.closedTrades = closed.length;
  m.closedNetProfit = closed.reduce((total, t) => total + t.profitAbs, 0);
  m.closedProfitFactor =
    closedLosses > 0 ? closedWins / closedLosses : closedWins > 0 ? 99 : 0;
  m.avgWin = m.wins ? grossWin / m.wins : 0;
  m.avgLoss = m.losses ? grossLoss / m.losses : 0;
  m.avgDurationMin = m.trades ? dur / m.trades : 0;
  m.expectancy = m.trades ? m.netProfit / m.trades : 0;
  m.pairStats = pairStatsFrom(trades);

  let maxDd = 0;
  let maxDdPct = 0;
  for (const p of equity) {
    if (p.drawdown > maxDd) maxDd = p.drawdown;
    if (p.drawdown / Math.max(1, start + p.equity - start) > maxDdPct) {
      maxDdPct = p.equity > 0 ? p.drawdown / (p.equity + p.drawdown) : 0;
    }
    if (p.openTrades > 0) exposedBars += 1;
  }
  m.maxDrawdown = maxDd;
  m.maxDrawdownPct = maxDdPct;
  m.exposurePct = equity.length ? exposedBars / equity.length : 0;

  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const a = equity[i - 1]?.equity ?? start;
    const b = equity[i]?.equity ?? a;
    if (a > 0) rets.push((b - a) / a);
  }
  if (rets.length > 10) {
    const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
    const varr = rets.reduce((s, x) => s + (x - mean) * (x - mean), 0) / rets.length;
    const std = Math.sqrt(varr);
    m.sharpe = std > 0 ? (mean / std) * Math.sqrt(365 * 96) : 0;
  }
  return m;
}

export function runOracleBacktest(
  params: StrategyParams = DEFAULT_PARAMS,
  seed = 7,
  scenario: ScenarioId = "mixed",
  dataset: MarketDatasetId = "sample",
  marketBundle?: MarketBundle,
): BacktestResult {
  const key = cacheKey(params, seed, scenario, dataset);
  const cached = resultCache.get(key);
  if (cached) return cached;
  const market = marketBundle ?? loadBinanceMarket(dataset);
  const analyzedPairs: AnalyzedPair[] = [];
  const hourlyScores: number[][] = [];

  for (const p of market.pairs) {
    const { pair, hourlyScore } = analyzePair(p.spec, p.bars, params);
    analyzedPairs.push(pair);
    hourlyScores.push(hourlyScore);
  }

  const n = analyzedPairs[0]?.bars.length ?? 0;
  const pairCount = analyzedPairs.length;
  for (let i = 0; i < n; i++) {
    const h = Math.floor(i / 4);
    let badLong = 0;
    let badShort = 0;
    for (let p = 0; p < pairCount; p++) {
      const s = hourlyScores[p]?.[h] ?? 50;
      if (s < params.minRegimeForLong) badLong += 1;
      if (s > params.maxRegimeForShort) badShort += 1;
    }
    for (const pair of analyzedPairs) {
      const bar = pair.bars[i];
      if (bar) {
        bar.badLong = badLong;
        bar.badShort = badShort;
      }
    }
  }

  const pairBySymbol = new Map(analyzedPairs.map((p) => [p.spec.symbol, p]));

  let balance = params.wallet;
  const ecs = new EquityCurveSizing(balance);
  const open = new Map<string, OpenTrade>();
  const pending = new Map<string, PendingTrade>();
  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  let peak = balance;
  let tradeSeq = 0;
  const startIdx = Math.min(params.startupBars, Math.max(0, n - 2));
  const feeRatio = roundTripFeeRatio(params.leverage, params.feeBps);

  const mark = (i: number) => {
    let mtm = balance;
    for (const t of open.values()) {
      const bar = pairBySymbol.get(t.pair)?.bars[i];
      if (!bar) continue;
      mtm += t.stake * (profitRatio(t.side, t.entryPrice, bar.close, t.leverage) - feeRatio);
    }
    return mtm;
  };

  const closeTrade = (t: OpenTrade, i: number, price: number, reason: ExitReason) => {
    const gross = profitRatio(t.side, t.entryPrice, price, t.leverage);
    const pr = gross - feeRatio;
    const pnl = t.stake * pr;
    const feeAbs = t.stake * feeRatio;
    balance += pnl;
    ecs.update(balance);
    const bar = pairBySymbol.get(t.pair)?.bars[i];
    trades.push({
      id: t.id,
      pair: t.pair,
      side: t.side,
      entryBar: t.entryBar,
      exitBar: i,
      entryTime: t.entryTime,
      exitTime: bar?.time ?? t.entryTime,
      entryPrice: t.entryPrice,
      exitPrice: price,
      stake: t.stake,
      leverage: t.leverage,
      profitRatio: pr,
      profitAbs: pnl,
      feeAbs,
      enterTag: t.side === "long" ? "strong_long_consensus" : "strong_short_consensus",
      exitReason: reason,
      votes: t.votes,
      longVotes: t.longVotes,
      shortVotes: t.shortVotes,
      regimeScore: t.regimeScore,
      regimeLabel: t.regimeLabel,
      ecsRegime: t.ecsRegime,
      durationMin: (i - t.entryBar) * BAR_MIN,
    });
    open.delete(t.pair);
  };

  for (let i = startIdx; i < n; i++) {
    // Signals are known at the prior close; positions become live only at this bar's open.
    for (const [symbol, t] of pending) {
      if (t.entryBar === i) {
        open.set(symbol, t);
        pending.delete(symbol);
      }
    }

    for (const t of [...open.values()]) {
      const pair = pairBySymbol.get(t.pair);
      const bar = pair?.bars[i];
      if (!bar) continue;
      const hit = checkExit(t, i, bar, params);
      if (hit) closeTrade(t, i, hit.price, hit.reason);
      else updateTrailingState(t, bar, params);
    }

    // Mark only positions that were live during this bar, before scheduling next-open entries.
    const mtm = mark(i);
    peak = Math.max(peak, mtm);
    const bar0 = analyzedPairs[0]?.bars[i];
    equity.push({
      time: bar0?.time ?? 0,
      equity: mtm,
      drawdown: peak - mtm,
      ecs: params.ecsEnabled ? ecs.regime() : "neutral",
      openTrades: open.size,
    });

    if (i >= n - 1) continue;

    const ecsReg = params.ecsEnabled ? ecs.regime() : "neutral";
    const mult = params.ecsEnabled ? ecsMultiplier(ecsReg) : 1;
    const proposed = (balance * 0.99) / params.maxOpenTrades;
    const minStake = 10;

    for (const pair of analyzedPairs) {
      if (open.size + pending.size >= params.maxOpenTrades) break;
      if (open.has(pair.spec.symbol) || pending.has(pair.spec.symbol)) continue;
      const bar = pair.bars[i];
      if (!bar) continue;

      const regimeLongOk = params.useRegimeFilter
        ? bar.regimeScore >= params.minRegimeForLong && bar.badLong <= params.badRegimeCountLimit
        : true;
      const regimeShortOk = params.useRegimeFilter
        ? bar.regimeScore <= params.maxRegimeForShort && bar.badShort <= params.badRegimeCountLimit
        : true;
      const longOk =
        bar.longVotes >= params.minVotes &&
        bar.shortVotes <= params.maxContraVotes &&
        regimeLongOk;
      const shortOk =
        bar.shortVotes >= params.minVotes &&
        bar.longVotes <= params.maxContraVotes &&
        regimeShortOk;
      if (longOk === shortOk) continue;

      const next = pair.bars[i + 1];
      if (!next) continue;
      const stake = Math.max(minStake, Math.min(proposed * mult, balance * 0.4));
      if (stake > balance * 0.95) continue;

      const side = longOk ? "long" : "short";
      tradeSeq += 1;
      pending.set(pair.spec.symbol, {
        id: `T${tradeSeq}`,
        pair: pair.spec.symbol,
        side,
        entryBar: i + 1,
        entryTime: next.time,
        entryPrice: next.open,
        stake,
        leverage: params.leverage,
        votes: cloneVotes(bar.votes),
        longVotes: bar.longVotes,
        shortVotes: bar.shortVotes,
        regimeScore: bar.regimeScore,
        regimeLabel: bar.regimeLabel,
        ecsRegime: ecsReg,
        highWater: next.open,
        trailActive: false,
      });
    }
  }

  const last = n - 1;
  // No position is created after the final bar; pending orders are intentionally discarded.
  pending.clear();
  for (const t of [...open.values()]) {
    const pair = pairBySymbol.get(t.pair);
    const bar = pair?.bars[last];
    if (bar) closeTrade(t, last, bar.close, "end_of_data");
  }
  if (equity.length) {
    const lastEq = equity[equity.length - 1];
    if (lastEq) {
      lastEq.equity = balance;
      lastEq.openTrades = 0;
    }
  }

  const result: BacktestResult = {
    scenario,
    seed,
    params,
    pairs: analyzedPairs,
    trades,
    equity,
    metrics: summarize(trades, equity, params.wallet, balance),
  };
  if (resultCache.size > 6) {
    const first = resultCache.keys().next().value;
    if (first) resultCache.delete(first);
  }
  resultCache.set(key, result);
  return result;
}
