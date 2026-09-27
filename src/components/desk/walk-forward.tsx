import { useState } from "react";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { Button } from "@/components/ui/button";
import { useDesk } from "@/lib/desk-store";
import { runOracleBacktest } from "@/lib/oracle/backtest";
import { formatNumber, formatPct, formatUsd, signedClass } from "@/lib/oracle/format";
import {
  ensureMarket,
  MARKET_DATASETS,
  type MarketDatasetId,
} from "@/lib/oracle/market";
import type { Metrics } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

const SPLITS: MarketDatasetId[] = ["train", "validation", "oos"];

interface SplitRow {
  id: MarketDatasetId;
  metrics: Metrics;
  bars: number;
}

export function WalkForward() {
  const params = useDesk((s) => s.params);
  const seed = useDesk((s) => s.seed);
  const scenario = useDesk((s) => s.scenario);
  const [rows, setRows] = useState<SplitRow[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    setStatus("Đang tải Train / Validation / OOS…");
    window.setTimeout(async () => {
      try {
        const next: SplitRow[] = [];
        for (const id of SPLITS) {
          setStatus(`Đang chạy ${MARKET_DATASETS[id].label} (${MARKET_DATASETS[id].candles})…`);
          const market = await ensureMarket(id);
          const result = runOracleBacktest(params, seed, scenario, id, market);
          next.push({
            id,
            metrics: result.metrics,
            bars: result.pairs[0]?.bars.length ?? 0,
          });
        }
        setRows(next);
        setStatus("Xong. Đây là cùng một cấu hình Lab trên ba split thời gian — không phải tối ưu OOS.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Không chạy được walk-forward.");
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  return (
    <Panel>
      <PanelTitle
        kicker="Walk-forward"
        title="Train · Validation · OOS"
        action={
          <Button size="sm" onClick={run} disabled={busy}>
            {busy ? "Đang chạy…" : rows ? "Chạy lại" : "Chạy 3 splits"}
          </Button>
        }
      />
      <p className="mb-4 max-w-3xl text-xs leading-relaxed text-dim">
        Cùng một bộ tham số, không chỉnh giữa các split. OOS là vùng đánh giá — nếu Validation
        hoặc OOS gãy trong khi Train đẹp, cấu hình đang overfit. Lần chạy đầu tải ~42 MB dữ liệu.
      </p>
      {status ? (
        <p className="mb-3 font-mono text-xs text-accent" aria-live="polite">
          {status}
        </p>
      ) : null}
      {rows ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] tracking-[0.1em] text-dim uppercase">
              <tr className="border-y border-border">
                <th className="py-2 pr-3 font-medium">Split</th>
                <th className="px-2 py-2 font-medium text-right">PnL đóng</th>
                <th className="px-2 py-2 font-medium text-right">Lệnh</th>
                <th className="px-2 py-2 font-medium text-right">Win</th>
                <th className="px-2 py-2 font-medium text-right">PF</th>
                <th className="px-2 py-2 font-medium text-right">Max DD</th>
                <th className="px-2 py-2 font-medium text-right">Sharpe</th>
                <th className="py-2 pl-2 font-medium text-right">Kỳ vọng</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const m = row.metrics;
                const meta = MARKET_DATASETS[row.id];
                return (
                  <tr key={row.id} className="border-b border-border/80">
                    <td className="py-3 pr-3">
                      <p className="text-sm text-fg">{meta.label}</p>
                      <p className="font-mono text-[11px] text-dim">{meta.period}</p>
                    </td>
                    <td className={cn("px-2 py-3 text-right font-mono text-xs tabular", signedClass(m.closedNetProfit))}>
                      {formatUsd(m.closedNetProfit)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular text-muted">
                      {m.closedTrades}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular text-muted">
                      {formatPct(m.winRate, 0)}
                    </td>
                    <td className={cn("px-2 py-3 text-right font-mono text-xs tabular", m.closedProfitFactor >= 1 ? "text-profit" : "text-loss")}>
                      {formatNumber(m.closedProfitFactor, 2)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-xs tabular text-loss">
                      {formatPct(-Math.abs(m.maxDrawdownPct), 1)}
                    </td>
                    <td className={cn("px-2 py-3 text-right font-mono text-xs tabular", signedClass(m.sharpe))}>
                      {formatNumber(m.sharpe, 2)}
                    </td>
                    <td className={cn("py-3 pl-2 text-right font-mono text-xs tabular", signedClass(m.expectancy))}>
                      {formatUsd(m.expectancy)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Sample ở trên là để chỉnh Lab. Bấm chạy để xem cùng cấu hình trên dữ liệu đầy đủ.
        </p>
      )}
    </Panel>
  );
}
