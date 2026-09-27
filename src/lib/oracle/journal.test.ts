import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createJournalEntry, parseJournalDocument, serializeJournalDocument } from "./journal.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { snapshotMetrics } from "./robustness.ts";
import { runOracleBacktest } from "./backtest.ts";
import { loadBinanceMarket } from "./market.ts";

describe("Oracle journal", () => {
  it("round-trips a saved experiment", () => {
    const market = loadBinanceMarket("sample");
    const result = runOracleBacktest(DEFAULT_PARAMS, 11, "mixed", "sample", market);
    const entry = createJournalEntry({
      name: "Baseline sample",
      notes: "Default params",
      dataset: "sample",
      scenario: "mixed",
      seed: 11,
      params: DEFAULT_PARAMS,
      metrics: snapshotMetrics(result.metrics),
      createdAt: "2026-09-28T00:00:00.000Z",
      id: "exp_test",
    });
    const json = serializeJournalDocument([entry]);
    const parsed = parseJournalDocument(JSON.parse(json));
    assert.equal(parsed.entries.length, 1);
    assert.deepEqual(parsed.entries[0], entry);
  });

  it("rejects empty names and unknown payload fields", () => {
    const market = loadBinanceMarket("sample");
    const result = runOracleBacktest(DEFAULT_PARAMS, 11, "mixed", "sample", market);
    const metrics = snapshotMetrics(result.metrics);
    assert.throws(
      () =>
        createJournalEntry({
          name: "  ",
          dataset: "sample",
          scenario: "mixed",
          seed: 11,
          params: DEFAULT_PARAMS,
          metrics,
        }),
      /Tên thí nghiệm/,
    );
    const entry = createJournalEntry({
      name: "ok",
      dataset: "sample",
      scenario: "mixed",
      seed: 11,
      params: DEFAULT_PARAMS,
      metrics,
    });
    assert.throws(
      () => parseJournalDocument({ format: "oracle-journal", version: 1, entries: [{ ...entry, extra: true }] }),
      /Unrecognized key/,
    );
  });
});
