import { useMemo, useState } from "react";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { barWidth, formatPct, formatUsd, signedClass } from "@/lib/oracle/format";
import { aggregatePerformance, type PerformancePeriod } from "@/lib/oracle/performance";
import type { Trade } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

export function PerformancePanel({ trades }: { trades: Trade[] }) {
  const [period, setPeriod] = useState<PerformancePeriod>("week");
  const rows = useMemo(() => aggregatePerformance(trades, period), [period, trades]);
  const naturalPnl = rows.reduce((sum, row) => sum + row.closedPnl, 0);
  const forcedPnl = rows.reduce((sum, row) => sum + row.forcedPnl, 0);
  const maxAbsPnl = Math.max(1, ...rows.map((row) => Math.abs(row.closedPnl)));
  const totalClosed = rows.reduce((sum, row) => sum + row.closedTrades, 0);
  const totalForced = rows.reduce((sum, row) => sum + row.forcedTrades, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="PnL đóng tự nhiên" value={formatUsd(naturalPnl)} tone={signedClass(naturalPnl)} />
        <Metric label="Lệnh đóng tự nhiên" value={String(totalClosed)} tone="text-fg" />
        <Metric label="Force exit / hết dữ liệu" value={formatUsd(forcedPnl)} tone={signedClass(forcedPnl)} />
        <Metric label="Lệnh force exit" value={String(totalForced)} tone="text-muted" />
      </div>
      <Panel className="overflow-hidden p-0">
        <div className="p-4 md:p-5">
          <PanelTitle
            kicker="Closed-trade attribution"
            title="Hiệu suất theo thời gian"
            action={
              <div className="flex rounded-md bg-subtle p-0.5" aria-label="Chọn khoảng thời gian">
                {(["day", "week"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPeriod(value)}
                    className={cn(
                      "h-9 rounded px-3 text-xs font-medium transition-[background-color,color] duration-150",
                      period === value ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {value === "day" ? "Theo ngày" : "Theo tuần"}
                  </button>
                ))}
              </div>
            }
          />
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-dim">
            PnL chính chỉ tính lệnh đóng tự nhiên. `Hết dữ liệu` được tách riêng để không làm đẹp kết quả bằng force-exit cuối mẫu.
            Tuần dùng ranh giới Thứ Hai, mọi timestamp là UTC.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-y border-border text-[11px] tracking-[0.1em] text-dim uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">{period === "day" ? "Ngày" : "Tuần bắt đầu"}</th>
                <th className="px-2 py-2 font-medium text-right">Lệnh đóng</th>
                <th className="px-2 py-2 font-medium text-right">Thắng / thua</th>
                <th className="px-2 py-2 font-medium text-right">Win rate</th>
                <th className="px-2 py-2 font-medium">PnL đóng tự nhiên</th>
                <th className="px-2 py-2 font-medium text-right">Force exit</th>
                <th className="px-4 py-2 font-medium text-right">PnL force exit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const winRate = row.closedTrades ? row.wins / row.closedTrades : 0;
                return (
                  <tr key={row.key} className="border-b border-border/80">
                    <td className="px-4 py-3 font-mono text-xs tabular text-fg">{row.label}</td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular text-muted">{row.closedTrades}</td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular text-muted">{row.wins}W · {row.losses}L</td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular text-muted">{row.closedTrades ? formatPct(winRate, 0) : "—"}</td>
                    <td className="min-w-56 px-2 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-subtle">
                          <div className={cn("h-full rounded-full", row.closedPnl >= 0 ? "bg-profit" : "bg-loss")} style={{ width: barWidth(Math.abs(row.closedPnl) / maxAbsPnl) }} />
                        </div>
                        <span className={cn("font-mono text-xs tabular", signedClass(row.closedPnl))}>{formatUsd(row.closedPnl)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular text-muted">{row.forcedTrades || "—"}</td>
                    <td className={cn("px-4 py-3 text-right font-mono text-xs tabular", signedClass(row.forcedPnl))}>{row.forcedTrades ? formatUsd(row.forcedPnl) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length ? <p className="px-4 py-10 text-center text-sm text-muted">Chưa có lệnh để phân tích.</p> : null}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Panel className="p-3 md:p-4">
      <p className="text-[11px] font-medium tracking-[0.12em] text-dim uppercase">{label}</p>
      <p className={cn("mt-2 font-mono text-lg tabular leading-none md:text-xl", tone)}>{value}</p>
    </Panel>
  );
}
