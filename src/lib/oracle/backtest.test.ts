import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roundTripFeeRatio, runOracleBacktest } from "./backtest.ts";
import { loadBinanceMarket } from "./market.ts";
import { DEFAULT_PARAMS } from "./params.ts";

describe("Oracle backtest", () => {
  it("treats round-trip fees as notional bps times leverage", () => {
    assert.ok(Math.abs(roundTripFeeRatio(3, 8) - 0.0024) < 1e-12);
    assert.equal(roundTripFeeRatio(1, 0), 0);
  });

  it("runs the bundled sample without looking into the future for fills", () => {
    const market = loadBinanceMarket("sample");
    const result = runOracleBacktest(DEFAULT_PARAMS, 11, "mixed", "sample", market);
    assert.ok(result.pairs.length === 10);
    assert.ok((result.pairs[0]?.bars.length ?? 0) >= 4000);
    assert.ok(result.metrics.pairStats.length <= 10);
    assert.ok(result.metrics.feesPaid >= 0);
    for (const trade of result.trades) {
      assert.ok(trade.exitBar >= trade.entryBar);
      assert.equal(trade.entryTime, market.pairs.find((p) => p.spec.symbol === trade.pair)?.bars[trade.entryBar]?.time);
    }
  });

  it("higher fees reduce net profit on the same sample", () => {
    const market = loadBinanceMarket("sample");
    const cheap = runOracleBacktest({ ...DEFAULT_PARAMS, feeBps: 0 }, 11, "mixed", "sample", market);
    const dear = runOracleBacktest({ ...DEFAULT_PARAMS, feeBps: 20 }, 11, "mixed", "sample", market);
    assert.ok(dear.metrics.netProfit <= cheap.metrics.netProfit);
    assert.ok(dear.metrics.feesPaid >= cheap.metrics.feesPaid);
  });
});
