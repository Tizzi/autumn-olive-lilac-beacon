import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { CHART } from "@/lib/oracle/chart";
import { formatPct, barWidth } from "@/lib/oracle/format";
import { SIGNAL_META } from "@/lib/oracle/params";
import type { Metrics, Trade } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

export function SignalBoard({ metrics, trades }: { metrics: Metrics; trades: Trade[] }) {
  const rows = SIGNAL_META.map((s) => {
    const h = metrics.signalHits[s.key];
    const total = h.long + h.short;
    const winShare = total ? h.withWin / total : 0;
    return { ...s, ...h, total, winShare };
  });

  const voteHist = [1, 2, 3, 4, 5].map((n) => ({
    n: `${n} phiếu`,
    long: trades.filter((t) => t.side === "long" && t.longVotes === n).length,
    short: trades.filter((t) => t.side === "short" && t.shortVotes === n).length,
  }));

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {rows.map((s) => (
        <Panel key={s.key} className="p-4">
          <p className="text-[11px] font-medium tracking-[0.12em] text-dim uppercase">{s.code}</p>
          <h3 className="mt-1 font-display text-lg text-fg">{s.name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted">{s.hint}</p>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="font-mono text-xl tabular text-fg">{s.total}</p>
              <p className="text-[11px] text-dim">lần góp phiếu</p>
            </div>
            <p className={cn("font-mono text-sm tabular", s.winShare >= 0.5 ? "text-profit" : "text-muted")}>
              {formatPct(s.winShare, 0)} win
            </p>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-subtle">
            <div className="h-full bg-accent" style={{ width: barWidth(s.winShare) }} />
          </div>
          <p className="mt-2 font-mono text-[11px] text-dim tabular">
            L {s.long} · S {s.short}
          </p>
        </Panel>
      ))}
      <Panel className="lg:col-span-5">
        <PanelTitle
          kicker="Consensus"
          title="Độ mạnh phiếu khi vào lệnh"
          action={<span className="text-xs text-muted">Mặc định vào lệnh từ 1 phiếu</span>}
        />
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={voteHist} barCategoryGap="28%">
              <XAxis dataKey="n" tick={{ fill: CHART.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART.dim, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-subtle)",
                  border: "1px solid color-mix(in oklab, var(--color-fg) 12%, transparent)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="long" fill={CHART.profit} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="short" fill={CHART.loss} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
