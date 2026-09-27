import { Panel, PanelTitle } from "@/components/desk/panel";
import { ECS_STYLE, EXIT_LABEL, barWidth, formatPct, formatUsd, signedClass } from "@/lib/oracle/format";
import type { Metrics } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

export function SplitCards({ metrics }: { metrics: Metrics }) {
  const exits = Object.entries(metrics.exitReasons).sort((a, b) => b[1] - a[1]);
  const maxExit = Math.max(1, ...exits.map(([, n]) => n));
  const ecs = (Object.keys(ECS_STYLE) as Array<keyof typeof ECS_STYLE>).map((k) => ({
    k,
    n: metrics.ecsAtEntry[k],
    ...ECS_STYLE[k],
  }));
  const ecsMax = Math.max(1, ...ecs.map((e) => e.n));

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel>
        <PanelTitle kicker="Phía" title="Long / Short" />
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Long · {metrics.longTrades}</span>
              <span className={cn("font-mono tabular", signedClass(metrics.longPnl))}>
                {formatUsd(metrics.longPnl)}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full bg-profit"
                style={{
                  width: barWidth(
                    Math.abs(metrics.longPnl) /
                      Math.max(1, Math.abs(metrics.longPnl) + Math.abs(metrics.shortPnl)),
                  ),
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Short · {metrics.shortTrades}</span>
              <span className={cn("font-mono tabular", signedClass(metrics.shortPnl))}>
                {formatUsd(metrics.shortPnl)}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full bg-loss"
                style={{
                  width: barWidth(
                    Math.abs(metrics.shortPnl) /
                      Math.max(1, Math.abs(metrics.longPnl) + Math.abs(metrics.shortPnl)),
                  ),
                }}
              />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div>
              <dt className="text-dim">Lệnh tốt nhất</dt>
              <dd className="mt-1 font-mono tabular text-profit">{formatUsd(metrics.bestTrade)}</dd>
            </div>
            <div>
              <dt className="text-dim">Lệnh tệ nhất</dt>
              <dd className="mt-1 font-mono tabular text-loss">{formatUsd(metrics.worstTrade)}</dd>
            </div>
            <div>
              <dt className="text-dim">Win trung bình</dt>
              <dd className="mt-1 font-mono tabular text-fg">{formatUsd(metrics.avgWin)}</dd>
            </div>
            <div>
              <dt className="text-dim">Loss trung bình</dt>
              <dd className="mt-1 font-mono tabular text-fg">{formatUsd(metrics.avgLoss)}</dd>
            </div>
          </dl>
        </div>
      </Panel>

      <Panel>
        <PanelTitle kicker="Thoát" title="Lý do đóng lệnh" />
        <ul className="space-y-2.5">
          {exits.map(([k, n]) => (
            <li key={k}>
              <div className="flex justify-between text-xs">
                <span className="text-muted">{EXIT_LABEL[k] ?? k}</span>
                <span className="font-mono tabular text-fg">{n}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-subtle">
                <div className="h-full bg-accent" style={{ width: barWidth(n / maxExit) }} />
              </div>
            </li>
          ))}
          {exits.length === 0 ? <p className="text-sm text-muted">Chưa có lệnh.</p> : null}
        </ul>
      </Panel>

      <Panel>
        <PanelTitle kicker="Sizing" title="ECS lúc vào lệnh" />
        <ul className="space-y-2.5">
          {ecs.map((e) => (
            <li key={e.k}>
              <div className="flex justify-between text-xs">
                <span className={e.className}>
                  {e.label} · {e.mult}
                </span>
                <span className="font-mono tabular text-fg">{e.n}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-subtle">
                <div className="h-full bg-accent" style={{ width: barWidth(e.n / ecsMax) }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-dim">
          Vốn gốc {formatUsd(metrics.startBalance)} · kết thúc {formatUsd(metrics.endBalance)} ·
          exposure {formatPct(metrics.exposurePct, 0)}.
        </p>
      </Panel>
    </div>
  );
}

export function StrategyBrief() {
  return (
    <Panel>
      <PanelTitle kicker="Cơ chế" title="Oracle chạy đồng thời 5 tín hiệu" />
      <div className="grid gap-4 text-sm leading-relaxed text-muted md:grid-cols-3">
        <p>
          Mỗi nến 15m, năm chiến lược con bỏ phiếu long/short. Vào lệnh khi phiếu thuận ≥ 1 và
          phiếu ngược ≤ 1 — không cần đồng thuận tuyệt đối.
        </p>
        <p>
          Regime 1h (trend 40, vol 30, momentum 20, drawdown 10) chặn long dưới Neutral và short
          trên Caution, cộng bộ đếm cặp xấu trên toàn universe.
        </p>
        <p>
          Thoát: stoploss 17% (đã nhân đòn bẩy), trailing sau +3%, crash dưới 15 phút, lệnh ngâm
          30–65 phút, và cắt khi regime gãy lúc đang lỗ. Phí round-trip mặc định 8 bps trên
          notional — cùng mức scanner dùng.
        </p>
      </div>
    </Panel>
  );
}
