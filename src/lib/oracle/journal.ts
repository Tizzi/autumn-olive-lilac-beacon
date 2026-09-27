import { z } from "zod";
import { strategyParamsSchema } from "./lab-config.ts";
import type { MarketDatasetId } from "./market.ts";
import type { SnapshotMetrics } from "./robustness.ts";
import type { ScenarioId, StrategyParams } from "./types.ts";

export const JOURNAL_FORMAT = "oracle-journal";
export const JOURNAL_VERSION = 1;
export const JOURNAL_STORAGE_KEY = "oracle-desk-journal-v1";

const snapshotSchema = z.object({
  trades: z.number().finite(),
  closedTrades: z.number().finite(),
  closedNetProfit: z.number().finite(),
  closedProfitFactor: z.number().finite(),
  winRate: z.number().finite(),
  maxDrawdownPct: z.number().finite(),
  sharpe: z.number().finite(),
  expectancy: z.number().finite(),
  feesPaid: z.number().finite(),
  netProfit: z.number().finite(),
  profitFactor: z.number().finite(),
}).strict();

const entrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  notes: z.string().max(2000),
  createdAt: z.string().datetime(),
  dataset: z.enum(["sample", "train", "validation", "oos"]),
  scenario: z.enum(["mixed", "bull", "stress", "range"]),
  seed: z.number().int().nonnegative(),
  params: strategyParamsSchema,
  metrics: snapshotSchema,
}).strict();

const documentSchema = z.object({
  format: z.literal(JOURNAL_FORMAT),
  version: z.literal(JOURNAL_VERSION),
  entries: z.array(entrySchema),
}).strict();

export type JournalEntry = z.infer<typeof entrySchema>;
export type JournalDocument = z.infer<typeof documentSchema>;

export function createJournalEntry(input: {
  name: string;
  notes?: string;
  dataset: MarketDatasetId;
  scenario: ScenarioId;
  seed: number;
  params: StrategyParams;
  metrics: SnapshotMetrics;
  createdAt?: string;
  id?: string;
}): JournalEntry {
  const name = input.name.trim();
  if (!name) throw new Error("Tên thí nghiệm không được trống.");
  return entrySchema.parse({
    id: input.id ?? `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.slice(0, 80),
    notes: (input.notes ?? "").slice(0, 2000),
    createdAt: input.createdAt ?? new Date().toISOString(),
    dataset: input.dataset,
    scenario: input.scenario,
    seed: input.seed,
    params: input.params,
    metrics: input.metrics,
  });
}

export function parseJournalDocument(value: unknown): JournalDocument {
  return documentSchema.parse(value);
}

export function serializeJournalDocument(entries: JournalEntry[]): string {
  const document: JournalDocument = {
    format: JOURNAL_FORMAT,
    version: JOURNAL_VERSION,
    entries,
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadJournal(): JournalEntry[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
  if (!raw) return [];
  try {
    return parseJournalDocument(JSON.parse(raw)).entries;
  } catch {
    return [];
  }
}

export function saveJournal(entries: JournalEntry[]): JournalEntry[] {
  const document = parseJournalDocument({
    format: JOURNAL_FORMAT,
    version: JOURNAL_VERSION,
    entries,
  });
  if (canUseStorage()) {
    window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(document));
  }
  return document.entries;
}

export function addJournalEntry(entry: JournalEntry, current = loadJournal()): JournalEntry[] {
  return saveJournal([entry, ...current.filter((item) => item.id !== entry.id)]);
}

export function removeJournalEntry(id: string, current = loadJournal()): JournalEntry[] {
  return saveJournal(current.filter((item) => item.id !== id));
}
