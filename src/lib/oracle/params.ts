import type { ScenarioId, StrategyParams } from "./types.ts";

export const DIVERGENCE_LOOKBACK = 20;

export const DEFAULT_PARAMS: StrategyParams = {
  wallet: 2000,
  maxOpenTrades: 5,
  leverage: 3,
  stoploss: -0.17,
  trailingStop: true,
  trailingStopPositive: 0.01,
  trailingStopPositiveOffset: 0.03,
  minimalRoi: 0.77,
  useRegimeFilter: true,
  minRegimeForLong: 50,
  maxRegimeForShort: 49,
  badRegimeCountLimit: 12,
  minVotes: 1,
  maxContraVotes: 1,
  fastEma: 9,
  slowEma: 21,
  trendEma: 50,
  rsiPeriod: 14,
  rsiOversold: 40,
  rsiOverbought: 60,
  rsiPeriod2: 14,
  oversold: 30,
  overbought: 70,
  breakoutWindow: 20,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  startupBars: 300,
  ecsEnabled: true,
  feeBps: 8,
  signals: {
    emaCross: true,
    emaTrendRsi: true,
    rsiMeanRevert: true,
    breakout: true,
    macd: true,
  },
  exitSignals: {
    bearishDivergence: true,
    fastCrashExit: true,
    stagnantTimeExit: true,
    tooManyBadRegimes: true,
  },
};

export const SCENARIOS: {
  id: ScenarioId;
  label: string;
  blurb: string;
}[] = [
  {
    id: "mixed",
    label: "Hỗn hợp 40 ngày",
    blurb: "Tăng → sập → hồi. Đủ bốn regime để xem bộ lọc làm việc.",
  },
  {
    id: "bull",
    label: "Bull run",
    blurb: "Xu hướng tăng kéo dài, điều chỉnh nông. Regime nghiêng BULLISH.",
  },
  {
    id: "stress",
    label: "Stress / sập",
    blurb: "Biến động cao, drawdown sâu. Kiểm tra cắt lỗ và ECS cold.",
  },
  {
    id: "range",
    label: "Sideways",
    blurb: "Dao động quanh mean. Mean-revert và breakout giả nhiều hơn.",
  },
];

export const SIGNAL_META: {
  key: "emaCross" | "emaTrendRsi" | "rsiMeanRevert" | "breakout" | "macd";
  name: string;
  code: string;
  hint: string;
}[] = [
  {
    key: "emaCross",
    name: "EMA Cross",
    code: "9 / 21",
    hint: "Cắt lên = long, cắt xuống = short. Tín hiệu xung động ngắn.",
  },
  {
    key: "emaTrendRsi",
    name: "Trend RSI",
    code: "EMA50 · RSI",
    hint: "Long khi giá trên EMA50 và RSI quá bán. Short đối xứng.",
  },
  {
    key: "rsiMeanRevert",
    name: "RSI revert",
    code: "30 / 70",
    hint: "Mua quá bán, bán quá mua — không cần xu hướng.",
  },
  {
    key: "breakout",
    name: "Breakout",
    code: "Donchian 20",
    hint: "Đóng cửa phá đỉnh/đáy 20 nến trước đó.",
  },
  {
    key: "macd",
    name: "MACD",
    code: "12 · 26 · 9",
    hint: "Histogram cắt 0. Xác nhận xung lượng.",
  },
];
