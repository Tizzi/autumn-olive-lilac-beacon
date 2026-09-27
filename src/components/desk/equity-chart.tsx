import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { CHART, downsample, timeLabel } from "@/lib/oracle/chart";
import { formatUsd } from "@/lib/oracle/format";
import type { EquityPoint } from "@/lib/oracle/types";

export function EquityChart({ series }: { series: EquityPoint[] }) {
  const data = downsample(series).map((p) => ({
    t: p.time,
    equity: Math.round(p.equity * 100) / 100,
    dd: Math.round(p.drawdown * 100) / 100,
  }));
  const last = series[series.length - 1];
  const up = (last?.equity ?? 0) >= (series[0]?.equity ?? 0);
  const stroke = up ? CHART.profit : CHART.loss;

  return (
    <Panel className="desk-enter desk-enter-2 min-w-0">
      <PanelTitle kicker="Vốn" title="Đường equity" />
      <div className="h-56 w-full md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v: number) => formatUsd(v, true)}
              tick={{ fill: CHART.dim, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-subtle)",
                border: "1px solid color-mix(in oklab, var(--color-fg) 12%, transparent)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(v) => new Date(Number(v)).toUTCString().slice(0, 16)}
              formatter={(v: number, name: string) => [
                formatUsd(v),
                name === "equity" ? "Equity" : "Drawdown",
              ]}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke={stroke}
              fill="url(#eqFill)"
              strokeWidth={1.6}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function DrawdownChart({ series }: { series: EquityPoint[] }) {
  const data = downsample(series).map((p) => ({
    t: p.time,
    dd: -Math.round(p.drawdown * 100) / 100,
  }));
  return (
    <Panel className="desk-enter desk-enter-3 min-w-0">
      <PanelTitle kicker="Rủi ro" title="Underwater" />
      <div className="h-56 w-full md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ddFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={CHART.loss} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHART.loss} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v: number) => formatUsd(v, true)}
              tick={{ fill: CHART.dim, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-subtle)",
                border: "1px solid color-mix(in oklab, var(--color-fg) 12%, transparent)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [formatUsd(v), "Drawdown"]}
              labelFormatter={(v) => new Date(Number(v)).toUTCString().slice(0, 16)}
            />
            <Area
              type="monotone"
              dataKey="dd"
              stroke={CHART.loss}
              fill="url(#ddFill)"
              strokeWidth={1.4}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
