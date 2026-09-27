import { create } from "zustand";
import { DEFAULT_PARAMS } from "@/lib/oracle/params";
import type { MarketDatasetId } from "@/lib/oracle/market";
import type { ExitSignalName, ScenarioId, SignalName, StrategyParams } from "@/lib/oracle/types";

export type DeskTab =
  | "overview"
  | "market"
  | "signals"
  | "regime"
  | "trades"
  | "performance"
  | "scan"
  | "lab"
  | "journal";

interface DeskState {
  tab: DeskTab;
  setTab: (tab: DeskTab) => void;
  pair: string;
  setPair: (pair: string) => void;
  params: StrategyParams;
  patchParams: (patch: Partial<StrategyParams>) => void;
  resetParams: () => void;
  applyLabConfig: (config: {
    params: StrategyParams;
    dataset: MarketDatasetId;
    scenario: ScenarioId;
    seed: number;
  }) => void;
  setSignalEnabled: (signal: SignalName, enabled: boolean) => void;
  setExitSignalEnabled: (signal: ExitSignalName, enabled: boolean) => void;
  seed: number;
  reshuffle: () => void;
  scenario: ScenarioId;
  setScenario: (s: ScenarioId) => void;
  dataset: MarketDatasetId;
  setDataset: (dataset: MarketDatasetId) => void;
  selectedTradeId: string | null;
  setSelectedTradeId: (id: string | null) => void;
}

export const useDesk = create<DeskState>((set) => ({
  tab: "overview",
  setTab: (tab) => set({ tab }),
  pair: "BTC/USDT",
  setPair: (pair) => set({ pair, tab: "market" }),
  params: { ...DEFAULT_PARAMS },
  patchParams: (patch) => set((s) => ({ params: { ...s.params, ...patch } })),
  resetParams: () => set({ params: { ...DEFAULT_PARAMS } }),
  applyLabConfig: ({ params, dataset, scenario, seed }) =>
    set({ params, dataset, scenario, seed, selectedTradeId: null, tab: "lab" }),
  setSignalEnabled: (signal, enabled) =>
    set((s) => ({ params: { ...s.params, signals: { ...s.params.signals, [signal]: enabled } } })),
  setExitSignalEnabled: (signal, enabled) =>
    set((s) => ({
      params: { ...s.params, exitSignals: { ...s.params.exitSignals, [signal]: enabled } },
    })),
  seed: 11,
  reshuffle: () => set((s) => ({ seed: s.seed + 1 })),
  scenario: "mixed",
  setScenario: (scenario) => set({ scenario }),
  dataset: "sample",
  setDataset: (dataset) => set({ dataset }),
  selectedTradeId: null,
  setSelectedTradeId: (selectedTradeId) => set({ selectedTradeId }),
}));
