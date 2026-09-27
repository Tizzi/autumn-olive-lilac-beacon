import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { Badge } from "@/components/ui/badge";
import { useDesk } from "@/lib/desk-store";
import { CHART, downsample, timeLabel } from "@/lib/oracle/chart";
import { REGIME_STYLE, formatNumber } from "@/lib/oracle/format";
import type { AnalyzedPair, Trade } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

export function PriceChart({ pair, trades }: { pair: AnalyzedPair; trades: Trade[] }) {
  const setTrade = useDesk((s) => s.setSelectedTradeId);
  const selected = useDesk((s) => s.selectedTradeId);
  const live = pair.bars.slice(Math.max(0, pair.bars.length - 40 * 96));
  const data = downsample(live, 360).map((b) => ({
    t: b.time,
    close: b.close,
    emaFast: b.emaFast,
    emaSlow: b.emaSlow,
    regime: b.regimeScore,
  }));
  const mine = trades.filter((t) => t.pair === pair.spec.symbol);
  const last = pair.bars[pair.bars.length - 1];

  return (
    <Panel className="min-w-0">
      <PanelTitle
        kicker={pair.spec.name}
        title={pair.spec.symbol}
        action={
          last ? (
            <div className="flex items-center gap-2">
              <Badge className={REGIME_STYLE[last.regimeLabel].className}>
                {REGIME_STYLE[last.regimeLabel].label} · {Math.round(last.regimeScore)}
              </Badge>
              <span className="font-mono text-sm tabular text-fg">
                {formatNumber(last.close, last.close < 2 ? 4 : 2)}
              </span>
            </div>
          ) : null
        }
      />
      <div className="h-64 w-full md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={timeLabel}
              tick={{ fill: CHART.dim, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: CHART.dim, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={(v: number) => formatNumber(v, v < 2 ? 3 : 0)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-subtle)",
                border: "1px solid color-mix(in oklab, var(--color-fg) 12%, transparent)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(v) => new Date(Number(v)).toUTCString().slice(0, 17)}
            />
            <Line
              type="monotone"
              dataKey="emaSlow"
              stroke={CHART.dim}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="emaFast"
              stroke={CHART.accent}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={CHART.fg}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            {mine.map((t) => (
              <ReferenceDot
                key={`${t.id}-in`}
                x={t.entryTime}
                y={t.entryPrice}
                r={selected === t.id ? 5 : 3.5}
                fill={t.side === "long" ? CHART.profit : CHART.loss}
                stroke="var(--color-bg)"
                strokeWidth={1}
                onClick={() => setTrade(t.id)}
              />
            ))}
            {mine.map((t) => (
              <ReferenceDot
                key={`${t.id}-out`}
                x={t.exitTime}
                y={t.exitPrice}
                r={3}
                fill="transparent"
                stroke={t.profitAbs >= 0 ? CHART.profit : CHART.loss}
                strokeWidth={1.4}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <i className="inline-block size-2 rounded-full bg-fg" /> Giá đóng cửa
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block size-2 rounded-full bg-accent" /> EMA nhanh
        </span>
        <span className="flex items-center gap-1.5">
          <i className={cn("inline-block size-2 rounded-full bg-profit")} /> Vào long
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block size-2 rounded-full bg-loss" /> Vào short
        </span>
      </div>
    </Panel>
  );
}

export function PairSwitcher({ symbols }: { symbols: string[] }) {
  const pair = useDesk((s) => s.pair);
  const setPair = useDesk((s) => s.setPair);
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {symbols.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setPair(s)}
          className={cn(
            "h-10 shrink-0 rounded-md px-3 font-mono text-xs transition-[background-color,color] duration-150 ease-out",
            pair === s ? "bg-accent text-accent-fg" : "text-muted hover:bg-subtle hover:text-fg",
          )}
        >
          {s.replace("/USDT", "")}
        </button>
      ))}
    </div>
  );
}
