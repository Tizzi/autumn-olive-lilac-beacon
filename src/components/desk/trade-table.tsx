import { useMemo, useState } from "react";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDesk } from "@/lib/desk-store";
import {
  EXIT_LABEL,
  REGIME_STYLE,
  formatDuration,
  formatPct,
  formatUsd,
  signedClass,
} from "@/lib/oracle/format";
import type { Trade } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

function exportCsv(trades: Trade[]) {
  const header = [
    "id",
    "pair",
    "side",
    "entryTime",
    "exitTime",
    "entryPrice",
    "exitPrice",
    "pnl",
    "fee",
    "ratio",
    "exit",
    "regime",
    "longVotes",
    "shortVotes",
  ];
  const lines = trades.map((t) =>
    [
      t.id,
      t.pair,
      t.side,
      new Date(t.entryTime).toISOString(),
      new Date(t.exitTime).toISOString(),
      t.entryPrice,
      t.exitPrice,
      t.profitAbs.toFixed(4),
      t.feeAbs.toFixed(4),
      t.profitRatio.toFixed(6),
      t.exitReason,
      t.regimeLabel,
      t.longVotes,
      t.shortVotes,
    ].join(","),
  );
  const blob = new Blob([`${header.join(",")}\n${lines.join("\n")}\n`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `oracle-trades-${trades.length}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TradeTable({ trades }: { trades: Trade[] }) {
  const [q, setQ] = useState("");
  const [side, setSide] = useState<"all" | "long" | "short">("all");
  const selected = useDesk((s) => s.selectedTradeId);
  const setSelected = useDesk((s) => s.setSelectedTradeId);
  const setPair = useDesk((s) => s.setPair);
  const setTab = useDesk((s) => s.setTab);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...trades].reverse().filter((t) => {
      if (side !== "all" && t.side !== side) return false;
      if (!needle) return true;
      return (
        t.pair.toLowerCase().includes(needle) ||
        t.id.toLowerCase().includes(needle) ||
        t.exitReason.toLowerCase().includes(needle)
      );
    });
  }, [trades, q, side]);

  return (
    <Panel className="overflow-hidden p-0">
      <div className="p-4 md:p-5">
        <PanelTitle
          kicker="Sổ lệnh"
          title={`${rows.length} giao dịch`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cặp, mã, lý do thoát"
                className="h-10 w-40 rounded-md bg-subtle px-3 text-sm text-fg outline-none placeholder:text-dim shadow-[var(--shadow-border)] md:w-52"
              />
              <div className="flex rounded-md bg-subtle p-0.5">
                {(["all", "long", "short"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSide(k)}
                    className={cn(
                      "h-9 rounded px-3 text-xs capitalize transition-[background-color,color] duration-150",
                      side === k ? "bg-accent text-accent-fg" : "text-muted",
                    )}
                  >
                    {k === "all" ? "Tất cả" : k}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportCsv(rows)} disabled={!rows.length}>
                CSV
              </Button>
            </div>
          }
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[11px] tracking-[0.1em] text-dim uppercase">
            <tr className="border-t border-border">
              <th className="px-4 py-2 font-medium">Mã</th>
              <th className="px-2 py-2 font-medium">Cặp</th>
              <th className="px-2 py-2 font-medium">Phiếu</th>
              <th className="px-2 py-2 font-medium">Regime</th>
              <th className="px-2 py-2 font-medium">Thoát</th>
              <th className="px-2 py-2 font-medium">Thời gian</th>
              <th className="px-4 py-2 font-medium text-right">PnL</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 80).map((t) => (
              <tr
                key={t.id}
                onClick={() => {
                  setSelected(t.id);
                  setPair(t.pair);
                  setTab("market");
                }}
                className={cn(
                  "cursor-pointer border-t border-border/80 transition-[background-color] duration-150 ease-out hover:bg-subtle",
                  selected === t.id && "bg-subtle",
                )}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-muted">{t.id}</td>
                <td className="px-2 py-2.5">
                  <span className="font-mono text-xs">{t.pair.replace("/USDT", "")}</span>
                  <Badge
                    className={cn("ml-2", t.side === "long" ? "text-profit" : "text-loss")}
                  >
                    {t.side}
                  </Badge>
                </td>
                <td className="px-2 py-2.5 font-mono text-xs tabular text-muted">
                  {t.side === "long" ? t.longVotes : t.shortVotes}/5
                </td>
                <td className={cn("px-2 py-2.5 text-xs", REGIME_STYLE[t.regimeLabel].className)}>
                  {t.regimeLabel} {Math.round(t.regimeScore)}
                </td>
                <td className="px-2 py-2.5 text-xs text-muted">
                  {EXIT_LABEL[t.exitReason] ?? t.exitReason}
                </td>
                <td className="px-2 py-2.5 font-mono text-xs tabular text-dim">
                  {formatDuration(t.durationMin)}
                </td>
                <td className={cn("px-4 py-2.5 text-right font-mono text-xs tabular", signedClass(t.profitAbs))}>
                  {formatUsd(t.profitAbs)} · {formatPct(t.profitRatio)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">Không có lệnh khớp bộ lọc.</p>
        ) : null}
      </div>
    </Panel>
  );
}
