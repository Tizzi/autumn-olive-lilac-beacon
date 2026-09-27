import { createFileRoute } from "@tanstack/react-router";
import { DrawdownChart, EquityChart } from "@/components/desk/equity-chart";
import { KpiStrip } from "@/components/desk/kpi-strip";
import { JournalPanel } from "@/components/desk/journal-panel";
import { LabPanel } from "@/components/desk/lab-panel";
import { SplitCards, StrategyBrief } from "@/components/desk/overview-extras";
import { PairSwitcher, PriceChart } from "@/components/desk/price-chart";
import { PerformancePanel } from "@/components/desk/performance-panel";
import { RegimeBoard } from "@/components/desk/regime-board";
import { ScanArchive } from "@/components/desk/scan-archive";
import { DeskHeader } from "@/components/desk/shell";
import { SignalBoard } from "@/components/desk/signal-board";
import { TradeTable } from "@/components/desk/trade-table";
import { UniverseBoard } from "@/components/desk/universe-board";
import { WalkForward } from "@/components/desk/walk-forward";
import { useOracle } from "@/lib/oracle/use-oracle";
import { MARKET_DATASETS } from "@/lib/oracle/market";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { tab, result, activePair, loading, error, dataset } = useOracle();
  const meta = MARKET_DATASETS[dataset];

  return (
    <div className="min-h-screen bg-bg text-fg">
      <DeskHeader />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 md:px-6 md:py-6">
        <p className="text-xs text-dim">
          Binance spot · 15m · regime 1h · {meta.label} · {meta.period} · {meta.candles} · fill tại
          open nến kế · research-only, không phải tín hiệu giao dịch.
        </p>

        {error ? (
          <p className="rounded-2xl bg-surface px-4 py-6 text-sm text-loss shadow-[var(--shadow-border)]">
            {error}
          </p>
        ) : null}

        {loading || !result || !activePair ? (
          <LoadingGrid />
        ) : (
          <>
            {tab === "overview" ? (
              <div className="space-y-4">
                <KpiStrip metrics={result.metrics} />
                <div className="grid gap-3 lg:grid-cols-2">
                  <EquityChart series={result.equity} />
                  <DrawdownChart series={result.equity} />
                </div>
                <UniverseBoard metrics={result.metrics} pairs={result.pairs} />
                <SplitCards metrics={result.metrics} />
                <WalkForward />
                <StrategyBrief />
              </div>
            ) : null}

            {tab === "market" ? (
              <div className="space-y-3">
                <PairSwitcher symbols={result.pairs.map((p) => p.spec.symbol)} />
                <PriceChart pair={activePair} trades={result.trades} />
                <TradeTable
                  trades={result.trades.filter((t) => t.pair === activePair.spec.symbol)}
                />
              </div>
            ) : null}

            {tab === "signals" ? (
              <SignalBoard metrics={result.metrics} trades={result.trades} />
            ) : null}

            {tab === "regime" ? <RegimeBoard result={result} pair={activePair} /> : null}

            {tab === "trades" ? <TradeTable trades={result.trades} /> : null}

            {tab === "performance" ? <PerformancePanel trades={result.trades} /> : null}

            {tab === "scan" ? <ScanArchive /> : null}

            {tab === "lab" ? (
              <div className="space-y-4">
                <KpiStrip metrics={result.metrics} />
                <LabPanel />
              </div>
            ) : null}

            {tab === "journal" ? <JournalPanel result={result} /> : null}
          </>
        )}
      </main>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface shadow-[var(--shadow-border)]" />
        ))}
      </div>
      <p className="text-sm text-muted">Đang tải dataset và chạy backtest…</p>
    </div>
  );
}
