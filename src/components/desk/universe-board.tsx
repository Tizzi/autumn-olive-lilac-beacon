import { Panel, PanelTitle } from "@/components/desk/panel";
import { useDesk } from "@/lib/desk-store";
import { barWidth, formatPct, formatUsd, REGIME_STYLE, signedClass } from "@/lib/oracle/format";
import type { AnalyzedPair, Metrics } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

export function UniverseBoard({
  metrics,
  pairs,
}: {
  metrics: Metrics;
  pairs: AnalyzedPair[];
}) {
  const setPair = useDesk((s) => s.setPair);
  const lastBySymbol = new Map(
    pairs.map((p) => {
      const last = p.bars[p.bars.length - 1];
      return [p.spec.symbol, last] as const;
    }),
  );
  const rows = pairs.map((p) => {
    const stats = metrics.pairStats.find((s) => s.symbol === p.spec.symbol);
    const last = lastBySymbol.get(p.spec.symbol);
    return {
      symbol: p.spec.symbol,
      name: p.spec.name,
      stats,
      last,
    };
  });
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.stats?.pnl ?? 0)));

  return (
    <Panel>
      <PanelTitle
        kicker="Universe"
        title="10 cặp spot"
        action={
          <span className="text-xs text-muted">
            Bấm một cặp để mở biểu đồ
          </span>
        }
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map((row) => {
          const pnl = row.stats?.pnl ?? 0;
          const label = row.last?.regimeLabel ?? "NEUTRAL";
          return (
            <button
              key={row.symbol}
              type="button"
              onClick={() => setPair(row.symbol)}
              className="rounded-lg bg-subtle p-3 text-left transition-[background-color] duration-150 ease-out hover:bg-subtle/80"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-xs text-fg">{row.symbol.replace("/USDT", "")}</p>
                <p className={cn("text-[11px]", REGIME_STYLE[label].className)}>
                  {REGIME_STYLE[label].label}
                </p>
              </div>
              <p className={cn("mt-2 font-mono text-lg tabular leading-none", signedClass(pnl))}>
                {formatUsd(pnl)}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg">
                <div
                  className={cn("h-full rounded-full", pnl >= 0 ? "bg-profit" : "bg-loss")}
                  style={{ width: barWidth(Math.abs(pnl) / maxAbs) }}
                />
              </div>
              <p className="mt-2 font-mono text-[11px] tabular text-dim">
                {row.stats?.trades ?? 0} lệnh · {formatPct(row.stats?.winRate ?? 0, 0)} win
              </p>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
