import { Panel } from "@/components/desk/panel";
import { formatNumber, formatPct, formatUsd, signedClass } from "@/lib/oracle/format";
import type { Metrics } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

const items = (m: Metrics) => [
  {
    k: "Lợi nhuận",
    v: formatUsd(m.netProfit),
    s: `${formatPct(m.netProfitPct)} · phí ${formatUsd(m.feesPaid)}`,
    tone: signedClass(m.netProfit),
  },
  {
    k: "Tỷ lệ thắng",
    v: formatPct(m.winRate, 0),
    s: `${m.wins}W · ${m.losses}L`,
    tone: "text-fg",
  },
  {
    k: "Max drawdown",
    v: formatPct(-Math.abs(m.maxDrawdownPct), 1),
    s: formatUsd(-Math.abs(m.maxDrawdown)),
    tone: "text-loss",
  },
  {
    k: "Sharpe",
    v: formatNumber(m.sharpe, 2),
    s: "ann. 15m",
    tone: signedClass(m.sharpe),
  },
  {
    k: "Profit factor",
    v: formatNumber(m.profitFactor, 2),
    s: `${m.trades} lệnh`,
    tone: m.profitFactor >= 1 ? "text-profit" : "text-loss",
  },
  {
    k: "Kỳ vọng / lệnh",
    v: formatUsd(m.expectancy),
    s: `Long ${m.longTrades} · Short ${m.shortTrades}`,
    tone: signedClass(m.expectancy),
  },
];

export function KpiStrip({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      {items(metrics).map((it, i) => (
        <Panel key={it.k} className={cn("desk-enter p-3 md:p-4", `desk-enter-${i + 1}`)}>
          <p className="text-[11px] font-medium tracking-[0.12em] text-dim uppercase">{it.k}</p>
          <p className={cn("mt-2 font-mono text-xl tabular leading-none md:text-2xl", it.tone)}>
            {it.v}
          </p>
          <p className="mt-1.5 font-mono text-[11px] text-muted tabular">{it.s}</p>
        </Panel>
      ))}
    </div>
  );
}
