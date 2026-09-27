import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregatePerformance } from "./performance.ts";
import type { Trade } from "./types.ts";

function trade(id: string, exitTime: string, profitAbs: number, endOfData = false): Trade {
  return {
    id,
    pair: "BTC/USDT",
    side: "long",
    entryBar: 1,
    exitBar: 2,
    entryTime: 0,
    exitTime: Date.parse(exitTime),
    entryPrice: 1,
    exitPrice: 1,
    stake: 100,
    leverage: 1,
    profitRatio: profitAbs / 100,
    profitAbs,
    feeAbs: 0,
    enterTag: "test",
    exitReason: endOfData ? "end_of_data" : "roi",
    votes: { emaCross: 1, emaTrendRsi: 0, rsiMeanRevert: 0, breakout: 0, macd: 0 },
    longVotes: 1,
    shortVotes: 0,
    regimeScore: 50,
    regimeLabel: "NEUTRAL",
    ecsRegime: "neutral",
    durationMin: 15,
  };
}

describe("performance aggregation", () => {
  it("uses UTC dates and separates force exits from natural closed PnL", () => {
    const rows = aggregatePerformance([
      trade("natural-win", "2026-01-05T01:00:00Z", 12),
      trade("natural-loss", "2026-01-05T18:00:00Z", -4),
      trade("forced", "2026-01-05T20:00:00Z", 30, true),
    ], "day");
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0] && {
      closedTrades: rows[0].closedTrades,
      wins: rows[0].wins,
      losses: rows[0].losses,
      closedPnl: rows[0].closedPnl,
      forcedTrades: rows[0].forcedTrades,
      forcedPnl: rows[0].forcedPnl,
    }, { closedTrades: 2, wins: 1, losses: 1, closedPnl: 8, forcedTrades: 1, forcedPnl: 30 });
  });

  it("groups Sunday and following Monday into separate Monday-start UTC weeks", () => {
    const rows = aggregatePerformance([
      trade("sun", "2026-01-11T23:59:00Z", 1),
      trade("mon", "2026-01-12T00:00:00Z", 2),
    ], "week");
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.label, "Tuần 12/01/2026");
    assert.equal(rows[1]?.label, "Tuần 05/01/2026");
  });
});
