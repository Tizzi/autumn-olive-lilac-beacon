import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadBinanceMarket } from "./market.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { feeGrid, runAblation, SWEEP_SPECS, sweepParam } from "./robustness.ts";

describe("Oracle robustness probes", () => {
  it("fee sweep pays more as bps increase", () => {
    const market = loadBinanceMarket("sample");
    const spec = SWEEP_SPECS.find((item) => item.key === "feeBps");
    assert.ok(spec);
    const points = sweepParam(DEFAULT_PARAMS, 11, "mixed", "sample", market, spec);
    assert.equal(points.length, spec.values.length);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const next = points[i];
      assert.ok(prev && next);
      assert.ok(next.metrics.feesPaid >= prev.metrics.feesPaid);
    }
  });

  it("ablation baseline matches the live config and disabling a signal is scored", () => {
    const market = loadBinanceMarket("sample");
    const rows = runAblation(DEFAULT_PARAMS, 11, "mixed", "sample", market);
    const baseline = rows.find((row) => row.id === "baseline");
    const emaOff = rows.find((row) => row.id === "emaCross");
    assert.ok(baseline);
    assert.equal(baseline.deltaPf, 0);
    assert.ok(emaOff);
    assert.notEqual(emaOff.metrics.closedTrades, Number.NaN);
    assert.ok(rows.some((row) => row.id === "regime-off"));
    assert.ok(rows.some((row) => row.id === "ecs-off"));
  });

  it("fee grid includes the 16 bps research cost", () => {
    const market = loadBinanceMarket("sample");
    const grid = feeGrid(DEFAULT_PARAMS, 11, "mixed", "sample", market);
    assert.deepEqual(
      grid.map((point) => point.value),
      [0, 4, 8, 16, 24],
    );
  });
});
