import { z } from "zod";
import { DEFAULT_PARAMS } from "./params.ts";
import type { ScenarioId, StrategyParams } from "./types.ts";
import type { MarketDatasetId } from "./market.ts";

export const LAB_CONFIG_FORMAT = "oracle-lab-config";
export const LAB_CONFIG_VERSION = 1;

const signalSettingsSchema = z.object({
  emaCross: z.boolean(),
  emaTrendRsi: z.boolean(),
  rsiMeanRevert: z.boolean(),
  breakout: z.boolean(),
  macd: z.boolean(),
}).strict();

const exitSignalSettingsSchema = z.object({
  bearishDivergence: z.boolean(),
  fastCrashExit: z.boolean(),
  stagnantTimeExit: z.boolean(),
  tooManyBadRegimes: z.boolean(),
}).strict();

export const strategyParamsSchema = z.object({
  wallet: z.number().finite().positive(),
  maxOpenTrades: z.number().int().min(1).max(8),
  leverage: z.number().int().min(1).max(10),
  stoploss: z.number().finite().min(-0.3).max(-0.05),
  trailingStop: z.boolean(),
  trailingStopPositive: z.number().finite().min(0.005).max(0.05),
  trailingStopPositiveOffset: z.number().finite().min(0.01).max(0.1),
  minimalRoi: z.number().finite().min(0).max(1),
  useRegimeFilter: z.boolean(),
  minRegimeForLong: z.number().int().min(35).max(70),
  maxRegimeForShort: z.number().int().min(0).max(49),
  badRegimeCountLimit: z.number().int().min(4).max(12),
  minVotes: z.number().int().min(1).max(5),
  maxContraVotes: z.number().int().min(0).max(3),
  fastEma: z.number().int().min(5).max(20),
  slowEma: z.number().int().min(15).max(40),
  trendEma: z.number().int().min(30).max(70),
  rsiPeriod: z.number().int().positive(),
  rsiOversold: z.number().int().min(30).max(45),
  rsiOverbought: z.number().int().min(55).max(70),
  rsiPeriod2: z.number().int().positive(),
  oversold: z.number().int().min(25).max(40),
  overbought: z.number().int().min(60).max(80),
  breakoutWindow: z.number().int().min(5).max(50),
  macdFast: z.number().int().min(5).max(20),
  macdSlow: z.number().int().min(15).max(40),
  macdSignal: z.number().int().positive(),
  startupBars: z.number().int().positive(),
  ecsEnabled: z.boolean(),
  feeBps: z.number().finite().min(0).max(40).default(8),
  signals: signalSettingsSchema,
  exitSignals: exitSignalSettingsSchema,
}).strict().superRefine((params, context) => {
  if (params.fastEma >= params.slowEma) {
    context.addIssue({ code: "custom", message: "EMA nhanh phải nhỏ hơn EMA chậm." });
  }
  if (params.macdFast >= params.macdSlow) {
    context.addIssue({ code: "custom", message: "MACD fast phải nhỏ hơn MACD slow." });
  }
  if (params.rsiOversold >= params.rsiOverbought || params.oversold >= params.overbought) {
    context.addIssue({ code: "custom", message: "Ngưỡng oversold phải nhỏ hơn overbought." });
  }
  if (params.trailingStopPositive > params.trailingStopPositiveOffset) {
    context.addIssue({ code: "custom", message: "Trailing gap không thể lớn hơn trailing offset." });
  }
});

export const tuningPolicySchema = z.object({
  minTrades: z.number().int().min(4).max(40),
  minProfitFactor: z.number().finite().min(1).max(3),
  maxDrawdown: z.number().int().min(5).max(60),
  profitWeight: z.number().finite().min(0).max(3),
  pfWeight: z.number().finite().min(0).max(30),
  drawdownWeight: z.number().finite().min(0).max(4),
}).strict();

export type TuningPolicy = z.infer<typeof tuningPolicySchema>;

export const DEFAULT_TUNING_POLICY: TuningPolicy = {
  minTrades: 12,
  minProfitFactor: 1.2,
  maxDrawdown: 25,
  profitWeight: 1,
  pfWeight: 12,
  drawdownWeight: 1.5,
};

const labConfigSchema = z.object({
  format: z.literal(LAB_CONFIG_FORMAT),
  version: z.literal(LAB_CONFIG_VERSION),
  exportedAt: z.string().datetime(),
  context: z.object({
    dataset: z.enum(["sample", "train", "validation", "oos"]),
    scenario: z.enum(["mixed", "bull", "stress", "range"]),
    seed: z.number().int().nonnegative(),
  }).strict(),
  params: strategyParamsSchema,
  tuningPolicy: tuningPolicySchema,
}).strict();

export type LabConfig = z.infer<typeof labConfigSchema>;

export function createLabConfig(input: {
  params: StrategyParams;
  dataset: MarketDatasetId;
  scenario: ScenarioId;
  seed: number;
  tuningPolicy: TuningPolicy;
}): LabConfig {
  return {
    format: LAB_CONFIG_FORMAT,
    version: LAB_CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    context: { dataset: input.dataset, scenario: input.scenario, seed: input.seed },
    params: input.params,
    tuningPolicy: input.tuningPolicy,
  };
}

export function parseLabConfig(value: unknown): LabConfig {
  return labConfigSchema.parse(value);
}

export function defaultLabConfig(): LabConfig {
  return createLabConfig({
    params: DEFAULT_PARAMS,
    dataset: "sample",
    scenario: "mixed",
    seed: 11,
    tuningPolicy: DEFAULT_TUNING_POLICY,
  });
}
