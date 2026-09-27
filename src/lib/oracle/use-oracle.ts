import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useDesk } from "@/lib/desk-store";
import { runOracleBacktest } from "@/lib/oracle/backtest";
import { ensureMarket, getCachedMarket, loadBinanceMarket } from "@/lib/oracle/market";
import type { BacktestResult } from "@/lib/oracle/types";

export function useOracle() {
  const tab = useDesk((s) => s.tab);
  const pair = useDesk((s) => s.pair);
  const params = useDesk((s) => s.params);
  const seed = useDesk((s) => s.seed);
  const scenario = useDesk((s) => s.scenario);
  const dataset = useDesk((s) => s.dataset);
  const deferredParams = useDeferredValue(params);

  const [bundleId, setBundleId] = useState(dataset);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !getCachedMarket(dataset) && dataset !== "sample");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedMarket(dataset);
    if (cached) {
      setBundleId(dataset);
      setLoading(false);
      setError(null);
      setTick((n) => n + 1);
      return;
    }
    setLoading(true);
    setError(null);
    ensureMarket(dataset)
      .then(() => {
        if (cancelled) return;
        setBundleId(dataset);
        setLoading(false);
        setTick((n) => n + 1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không tải được dataset.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataset]);

  const result = useMemo<BacktestResult | null>(() => {
    const bundle =
      getCachedMarket(bundleId) ?? (bundleId === "sample" ? loadBinanceMarket("sample") : null);
    if (!bundle) return null;
    return runOracleBacktest(deferredParams, seed, scenario, bundleId, bundle);
  }, [bundleId, deferredParams, seed, scenario, tick]);

  const activePair = result?.pairs.find((p) => p.spec.symbol === pair) ?? result?.pairs[0] ?? null;

  return { tab, result, activePair, loading, error, dataset };
}
