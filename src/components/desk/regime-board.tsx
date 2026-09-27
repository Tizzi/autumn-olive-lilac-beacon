import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { useDesk } from "@/lib/desk-store";
import { CHART, downsample, timeLabel } from "@/lib/oracle/chart";
import { REGIME_STYLE } from "@/lib/oracle/format";
import type { AnalyzedPair, BacktestResult } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

export function RegimeBoard({ result, pair }: { result: BacktestResult; pair: AnalyzedPair }) {
  const setPair = useDesk((s) => s.setPair);
  const live = pair.bars.slice(Math.max(0, pair.bars.length - 40 * 96));
  const score = downsample(live, 360).map((b) => ({
    t: b.time,
    score: Math.round(b.regimeScore * 10) / 10,
    trend: b.trendScore,
    vol: b.volScore,
    mom: b.momScore,
    dd: b.ddScore,
    badLong: b.badLong,
  }));

  const lastByPair = result.pairs.map((p) => {
    const last = p.bars[p.bars.length - 1];
    return {
      symbol: p.spec.symbol,
      name: p.spec.name,
      score: last?.regimeScore ?? 0,
      label: last?.regimeLabel ?? "NEUTRAL",
    };
  });

  const limit = result.params.badRegimeCountLimit;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel className="min-w-0 lg:col-span-2">
        <PanelTitle kicker="Composite 1h → 15m" title="Regime score" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={score} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={timeLabel}
                tick={{ fill: CHART.dim, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis domain={[0, 100]} tick={{ fill: CHART.dim, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-subtle)",
                  border: "1px solid color-mix(in oklab, var(--color-fg) 12%, transparent)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={CHART.accent}
                fill={CHART.accent}
                fillOpacity={0.12}
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
          {[
            ["BULLISH", "≥ 70"],
            ["NEUTRAL", "50–69"],
            ["CAUTION", "35–49"],
            ["STRESS", "< 35"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-subtle px-2 py-2">
              <p className={REGIME_STYLE[k as keyof typeof REGIME_STYLE].className}>{k}</p>
              <p className="font-mono text-dim tabular">{v}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelTitle kicker="Trọng số" title="Bốn thành phần" />
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={score} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{
                  background: "var(--color-subtle)",
                  border: "1px solid color-mix(in oklab, var(--color-fg) 12%, transparent)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line dataKey="trend" stroke={CHART.profit} dot={false} strokeWidth={1.2} isAnimationActive={false} />
              <Line dataKey="vol" stroke={CHART.accent} dot={false} strokeWidth={1.2} isAnimationActive={false} />
              <Line dataKey="mom" stroke={CHART.caution} dot={false} strokeWidth={1.2} isAnimationActive={false} />
              <Line dataKey="dd" stroke={CHART.loss} dot={false} strokeWidth={1.2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs text-muted">
          <li className="flex justify-between">
            <span>Trend</span>
            <span className="font-mono tabular text-profit">40%</span>
          </li>
          <li className="flex justify-between">
            <span>Volatility rank</span>
            <span className="font-mono tabular text-accent">30%</span>
          </li>
          <li className="flex justify-between">
            <span>Momentum 7/30/90</span>
            <span className="font-mono tabular text-caution">20%</span>
          </li>
          <li className="flex justify-between">
            <span>Drawdown 60</span>
            <span className="font-mono tabular text-loss">10%</span>
          </li>
        </ul>
      </Panel>

      <Panel className="lg:col-span-2">
        <PanelTitle kicker="Universe" title="Regime 12 cặp" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {lastByPair.map((p) => (
            <button
              key={p.symbol}
              type="button"
              onClick={() => setPair(p.symbol)}
              className="rounded-lg bg-subtle p-3 text-left transition-[background-color] duration-150 ease-out hover:bg-subtle/80"
            >
              <p className="font-mono text-xs text-muted">{p.symbol.replace("/USDT", "")}</p>
              <p className={cn("mt-1 font-mono text-lg tabular", REGIME_STYLE[p.label].className)}>
                {Math.round(p.score)}
              </p>
              <p className="text-[11px] text-dim">{REGIME_STYLE[p.label].label}</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelTitle kicker="Bộ lọc chéo" title={`Bad regime ≤ ${limit}`} />
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Long bị chặn khi quá {limit} cặp có score dưới ngưỡng. Short đối xứng.
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={score}>
              <YAxis domain={[0, 12]} hide />
              <XAxis dataKey="t" hide />
              <Line
                dataKey="badLong"
                stroke={CHART.loss}
                dot={false}
                strokeWidth={1.4}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-dim">Số cặp bad-regime (long) theo thời gian</p>
      </Panel>
    </div>
  );
}
