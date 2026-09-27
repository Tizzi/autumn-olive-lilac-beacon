import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { Button } from "@/components/ui/button";
import { useDesk } from "@/lib/desk-store";
import { CHART } from "@/lib/oracle/chart";
import { formatNumber, formatPct, formatUsd, signedClass } from "@/lib/oracle/format";
import { getCachedMarket } from "@/lib/oracle/market";
import {
  feeGrid,
  runAblation,
  SWEEP_SPECS,
  sweepParam,
  type AblationRow,
  type SweepPoint,
  type SweepSpec,
} from "@/lib/oracle/robustness";
import { cn } from "@/lib/utils";

type Probe = "sweep" | "ablation" | "fees";

export function RobustnessPanel() {
  const params = useDesk((s) => s.params);
  const seed = useDesk((s) => s.seed);
  const scenario = useDesk((s) => s.scenario);
  const dataset = useDesk((s) => s.dataset);
  const [probe, setProbe] = useState<Probe>("sweep");
  const [specKey, setSpecKey] = useState<SweepSpec["key"]>("minVotes");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState<SweepPoint[] | null>(null);
  const [ablation, setAblation] = useState<AblationRow[] | null>(null);
  const [fees, setFees] = useState<SweepPoint[] | null>(null);

  const spec = SWEEP_SPECS.find((item) => item.key === specKey) ?? SWEEP_SPECS[0];

  const run = (task: () => void, message: string) => {
    const market = getCachedMarket(dataset);
    if (!market) {
      setStatus("Dataset chưa tải xong.");
      return;
    }
    setBusy(true);
    setStatus(message);
    window.setTimeout(() => {
      try {
        task();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Không chạy được probe.");
      } finally {
        setBusy(false);
      }
    }, 20);
  };

  return (
    <Panel>
      <PanelTitle kicker="Robustness" title="Sweep · Ablation · Phí" />
      <p className="mb-3 max-w-3xl text-xs leading-relaxed text-dim">
        Probe in-sample trên dataset đang chọn. Không phải validation. Walk-forward trên Tổng quan
        mới là bài kiểm tra overfitting.
      </p>
      <div className="mb-4 flex flex-wrap gap-1 rounded-md bg-subtle p-1 shadow-[var(--shadow-border)]">
        {(
          [
            ["sweep", "Sensitivity"],
            ["ablation", "Ablation"],
            ["fees", "Lưới phí"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setProbe(id)}
            className={cn(
              "h-10 rounded px-3 text-sm",
              probe === id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {probe === "sweep" && spec ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-40 flex-1 text-sm">
              <span className="mb-1 block text-[11px] tracking-[0.12em] text-dim uppercase">Tham số</span>
              <select
                className="h-10 w-full rounded-md bg-subtle px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none"
                value={spec.key}
                onChange={(event) => setSpecKey(event.target.value as SweepSpec["key"])}
              >
                {SWEEP_SPECS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run(() => {
                  const market = getCachedMarket(dataset);
                  if (!market) return;
                  const next = sweepParam(params, seed, scenario, dataset, market, spec);
                  setPoints(next);
                  setStatus(`Đã quét ${spec.label} · ${next.length} điểm trên ${dataset}.`);
                }, `Đang quét ${spec.label}…`)
              }
            >
              {busy ? "Đang chạy…" : "Chạy sweep"}
            </Button>
          </div>
          <p className="text-xs text-dim">{spec.hint}</p>
          {points ? <SweepChart points={points} /> : null}
          {points ? <SweepTable points={points} /> : null}
        </div>
      ) : null}

      {probe === "ablation" ? (
        <div className="space-y-3">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              run(() => {
                const market = getCachedMarket(dataset);
                if (!market) return;
                const rows = runAblation(params, seed, scenario, dataset, market);
                setAblation(rows);
                setStatus(`Đã tắt lần lượt tín hiệu, regime, ECS và exit trên ${dataset}.`);
              }, "Đang ablation…")
            }
          >
            {busy ? "Đang chạy…" : "Chạy ablation"}
          </Button>
          {ablation ? <AblationTable rows={ablation} /> : null}
        </div>
      ) : null}

      {probe === "fees" ? (
        <div className="space-y-3">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              run(() => {
                const market = getCachedMarket(dataset);
                if (!market) return;
                const next = feeGrid(params, seed, scenario, dataset, market);
                setFees(next);
                setStatus("Lưới 0–24 bps. 16 bps là mức research futures trong tài liệu.");
              }, "Đang chạy lưới phí…")
            }
          >
            {busy ? "Đang chạy…" : "Chạy lưới phí"}
          </Button>
          {fees ? <SweepChart points={fees} /> : null}
          {fees ? <SweepTable points={fees} /> : null}
        </div>
      ) : null}

      {status ? (
        <p className="mt-3 font-mono text-xs text-accent" aria-live="polite">
          {status}
        </p>
      ) : null}
    </Panel>
  );
}

function SweepChart({ points }: { points: SweepPoint[] }) {
  const data = points.map((point) => ({
    label: point.label,
    pf: Number.isFinite(point.metrics.closedProfitFactor)
      ? Math.round(point.metrics.closedProfitFactor * 100) / 100
      : 0,
    dd: Math.round(Math.abs(point.metrics.maxDrawdownPct) * 1000) / 10,
  }));
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: CHART.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="pf" tick={{ fill: CHART.dim, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <YAxis
            yAxisId="dd"
            orientation="right"
            tick={{ fill: CHART.dim, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-subtle)",
              border: "1px solid color-mix(in oklab, var(--color-fg) 12%, transparent)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend />
          <Line yAxisId="pf" type="monotone" dataKey="pf" name="PF đóng" stroke={CHART.profit} strokeWidth={1.6} dot isAnimationActive={false} />
          <Line yAxisId="dd" type="monotone" dataKey="dd" name="Max DD %" stroke={CHART.loss} strokeWidth={1.6} dot isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SweepTable({ points }: { points: SweepPoint[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-[11px] tracking-[0.1em] text-dim uppercase">
          <tr className="border-y border-border">
            <th className="py-2 pr-3 font-medium">Giá trị</th>
            <th className="px-2 py-2 text-right font-medium">PnL đóng</th>
            <th className="px-2 py-2 text-right font-medium">Lệnh</th>
            <th className="px-2 py-2 text-right font-medium">PF</th>
            <th className="px-2 py-2 text-right font-medium">Max DD</th>
            <th className="py-2 pl-2 text-right font-medium">Kỳ vọng</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => {
            const m = point.metrics;
            return (
              <tr key={point.label} className="border-b border-border/80">
                <td className="py-2 pr-3 font-mono text-xs text-fg">{point.label}</td>
                <td className={cn("px-2 py-2 text-right font-mono text-xs tabular", signedClass(m.closedNetProfit))}>
                  {formatUsd(m.closedNetProfit)}
                </td>
                <td className="px-2 py-2 text-right font-mono text-xs tabular text-muted">{m.closedTrades}</td>
                <td className={cn("px-2 py-2 text-right font-mono text-xs tabular", m.closedProfitFactor >= 1 ? "text-profit" : "text-loss")}>
                  {formatNumber(m.closedProfitFactor, 2)}
                </td>
                <td className="px-2 py-2 text-right font-mono text-xs tabular text-loss">
                  {formatPct(-Math.abs(m.maxDrawdownPct), 1)}
                </td>
                <td className={cn("py-2 pl-2 text-right font-mono text-xs tabular", signedClass(m.expectancy))}>
                  {formatUsd(m.expectancy)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AblationTable({ rows }: { rows: AblationRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-[11px] tracking-[0.1em] text-dim uppercase">
          <tr className="border-y border-border">
            <th className="py-2 pr-3 font-medium">Biến thể</th>
            <th className="px-2 py-2 text-right font-medium">PnL đóng</th>
            <th className="px-2 py-2 text-right font-medium">Δ PnL</th>
            <th className="px-2 py-2 text-right font-medium">Lệnh</th>
            <th className="px-2 py-2 text-right font-medium">PF</th>
            <th className="py-2 pl-2 text-right font-medium">Δ PF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const m = row.metrics;
            return (
              <tr key={row.id} className="border-b border-border/80">
                <td className="py-2 pr-3 text-sm text-fg">{row.label}</td>
                <td className={cn("px-2 py-2 text-right font-mono text-xs tabular", signedClass(m.closedNetProfit))}>
                  {formatUsd(m.closedNetProfit)}
                </td>
                <td className={cn("px-2 py-2 text-right font-mono text-xs tabular", signedClass(row.deltaProfit))}>
                  {row.id === "baseline" ? "—" : formatUsd(row.deltaProfit)}
                </td>
                <td className="px-2 py-2 text-right font-mono text-xs tabular text-muted">
                  {m.closedTrades}
                  {row.id !== "baseline" ? (
                    <span className="text-dim"> ({row.deltaTrades >= 0 ? "+" : ""}{row.deltaTrades})</span>
                  ) : null}
                </td>
                <td className={cn("px-2 py-2 text-right font-mono text-xs tabular", m.closedProfitFactor >= 1 ? "text-profit" : "text-loss")}>
                  {formatNumber(m.closedProfitFactor, 2)}
                </td>
                <td className={cn("py-2 pl-2 text-right font-mono text-xs tabular", signedClass(row.deltaPf))}>
                  {row.id === "baseline" ? "—" : formatNumber(row.deltaPf, 2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
