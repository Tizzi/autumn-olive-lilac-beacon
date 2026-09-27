import { useMemo, useState } from "react";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { formatNumber } from "@/lib/oracle/format";
import {
  SCAN_REPORTS,
  scanRegimeLabel,
  scanSignalLabel,
  type ScanBucket,
  type ScanReport,
} from "@/lib/oracle/scan";
import { cn } from "@/lib/utils";

export function ScanArchive() {
  const [reportId, setReportId] = useState(SCAN_REPORTS[0]?.id ?? "dashboard");
  const [side, setSide] = useState<"all" | "long" | "short">("all");
  const report = SCAN_REPORTS.find((r) => r.id === reportId) ?? SCAN_REPORTS[0]!;

  const buckets = useMemo(() => {
    return report.buckets
      .filter((b) => (side === "all" ? true : b.side === side))
      .slice()
      .sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.oos_profit_factor - a.oos_profit_factor);
  }, [report, side]);

  return (
    <div className="space-y-4">
      <Panel>
        <PanelTitle kicker="Entry diagnostic" title="Regime × tín hiệu đã lưu" />
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          {report.methodology} Chi phí round-trip {report.costBps} bps · horizon {report.horizonBars} nến
          (4 giờ). Đây là bảng sàng lọc giả thuyết, không phải backtest có exit và sizing.
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-caution">{report.warning}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SCAN_REPORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setReportId(item.id)}
              className={cn(
                "h-10 rounded-md px-3 text-xs font-medium transition-[background-color,color] duration-150",
                reportId === item.id ? "bg-accent text-accent-fg" : "bg-subtle text-muted hover:text-fg",
              )}
            >
              {item.label}
              <span className="ml-2 font-mono tabular">
                {item.recommendations.length} rec
              </span>
            </button>
          ))}
        </div>
      </Panel>

      <RecommendedList report={report} />

      <Panel className="overflow-hidden p-0">
        <div className="p-4 md:p-5">
          <PanelTitle
            kicker="Mọi bucket"
            title={`${buckets.length} ô`}
            action={
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
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-[11px] tracking-[0.1em] text-dim uppercase">
              <tr className="border-t border-border">
                <th className="px-4 py-2 font-medium">Tín hiệu</th>
                <th className="px-2 py-2 font-medium">Regime</th>
                <th className="px-2 py-2 font-medium">Phía</th>
                <th className="px-2 py-2 font-medium text-right">Train n</th>
                <th className="px-2 py-2 font-medium text-right">Train PF</th>
                <th className="px-2 py-2 font-medium text-right">OOS n</th>
                <th className="px-2 py-2 font-medium text-right">OOS PF</th>
                <th className="px-4 py-2 font-medium text-right">OOS E[r]</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <BucketRow key={`${b.signal}-${b.side}-${b.regime}`} bucket={b} />
              ))}
            </tbody>
          </table>
          {buckets.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">Không có bucket trên artifact này.</p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function RecommendedList({ report }: { report: ScanReport }) {
  if (!report.recommendations.length) {
    return (
      <Panel>
        <PanelTitle kicker="Sàng lọc" title="Không có bucket recommended" />
        <p className="text-sm text-muted">
          Artifact này không vượt ngưỡng số lệnh, expectancy dương và PF {'>'} 1.05 trên cả train lẫn OOS.
        </p>
      </Panel>
    );
  }
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {report.recommendations.map((b) => (
        <Panel key={`${b.signal}-${b.side}-${b.regime}`} className="p-4">
          <p className="text-[11px] font-medium tracking-[0.12em] text-dim uppercase">
            {scanSignalLabel(b.signal)} · {b.side}
          </p>
          <h3 className="mt-1 font-display text-lg text-fg">{scanRegimeLabel(b.regime)}</h3>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Stat k="Train PF" v={formatNumber(b.train_profit_factor, 2)} ok={b.train_profit_factor > 1} />
            <Stat k="OOS PF" v={formatNumber(b.oos_profit_factor, 2)} ok={b.oos_profit_factor > 1} />
            <Stat k="Train n" v={String(b.train_trades)} ok />
            <Stat k="OOS n" v={String(b.oos_trades)} ok />
          </dl>
        </Panel>
      ))}
    </div>
  );
}

function Stat({ k, v, ok }: { k: string; v: string; ok: boolean }) {
  return (
    <div>
      <dt className="text-dim">{k}</dt>
      <dd className={cn("mt-0.5 font-mono tabular", ok ? "text-fg" : "text-loss")}>{v}</dd>
    </div>
  );
}

function BucketRow({ bucket }: { bucket: ScanBucket }) {
  return (
    <tr className={cn("border-t border-border/80", bucket.recommended && "bg-subtle/60")}>
      <td className="px-4 py-2.5 text-sm text-fg">
        {scanSignalLabel(bucket.signal)}
        {bucket.recommended ? (
          <span className="ml-2 text-[10px] tracking-[0.12em] text-profit uppercase">Rec</span>
        ) : null}
      </td>
      <td className="px-2 py-2.5 text-xs text-muted">{scanRegimeLabel(bucket.regime)}</td>
      <td className={cn("px-2 py-2.5 font-mono text-xs", bucket.side === "long" ? "text-profit" : "text-loss")}>
        {bucket.side}
      </td>
      <td className="px-2 py-2.5 text-right font-mono text-xs tabular text-muted">{bucket.train_trades}</td>
      <td className={cn("px-2 py-2.5 text-right font-mono text-xs tabular", bucket.train_profit_factor >= 1 ? "text-fg" : "text-loss")}>
        {formatNumber(bucket.train_profit_factor, 2)}
      </td>
      <td className="px-2 py-2.5 text-right font-mono text-xs tabular text-muted">{bucket.oos_trades}</td>
      <td className={cn("px-2 py-2.5 text-right font-mono text-xs tabular", bucket.oos_profit_factor >= 1 ? "text-profit" : "text-loss")}>
        {formatNumber(bucket.oos_profit_factor, 2)}
      </td>
      <td className={cn("px-4 py-2.5 text-right font-mono text-xs tabular", bucket.oos_expectancy_pct >= 0 ? "text-profit" : "text-loss")}>
        {formatNumber(bucket.oos_expectancy_pct, 2)}%
      </td>
    </tr>
  );
}
