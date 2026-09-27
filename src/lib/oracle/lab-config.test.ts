import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLabConfig, DEFAULT_TUNING_POLICY, parseLabConfig } from "./lab-config.ts";
import { DEFAULT_PARAMS } from "./params.ts";

describe("Oracle Lab configuration", () => {
  it("round-trips a versioned Lab snapshot", () => {
    const config = createLabConfig({
      params: DEFAULT_PARAMS,
      dataset: "train",
      scenario: "mixed",
      seed: 11,
      tuningPolicy: DEFAULT_TUNING_POLICY,
    });
    assert.deepEqual(parseLabConfig(JSON.parse(JSON.stringify(config))), config);
  });

  it("rejects invalid indicator relationships", () => {
    const config = createLabConfig({
      params: { ...DEFAULT_PARAMS, fastEma: DEFAULT_PARAMS.slowEma },
      dataset: "train",
      scenario: "mixed",
      seed: 11,
      tuningPolicy: DEFAULT_TUNING_POLICY,
    });
    assert.throws(() => parseLabConfig(config), /EMA nhanh/);
  });

  it("rejects unversioned or unknown payload fields", () => {
    const config = createLabConfig({
      params: DEFAULT_PARAMS,
      dataset: "train",
      scenario: "mixed",
      seed: 11,
      tuningPolicy: DEFAULT_TUNING_POLICY,
    });
    assert.throws(() => parseLabConfig({ ...config, version: 2 }), /Invalid input/);
    assert.throws(() => parseLabConfig({ ...config, extra: true }), /Unrecognized key/);
  });
});
