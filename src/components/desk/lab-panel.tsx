import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDesk } from "@/lib/desk-store";
import { formatPct } from "@/lib/oracle/format";
import { SIGNAL_META } from "@/lib/oracle/params";
import {
  createLabConfig,
  DEFAULT_TUNING_POLICY,
  parseLabConfig,
  type TuningPolicy,
} from "@/lib/oracle/lab-config";
import { runOracleBacktest } from "@/lib/oracle/backtest";
import { getCachedMarket } from "@/lib/oracle/market";
import type { SignalName, StrategyParams } from "@/lib/oracle/types";
import { RobustnessPanel } from "@/components/desk/robustness-panel";

function Row({
  label,
  hint,
  value,
  children,
}: {
  label: string;
  hint?: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_140px] sm:items-center">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-fg">{label}</p>
          <p className="font-mono text-xs tabular text-accent">{value}</p>
        </div>
        {hint ? <p className="mt-0.5 text-[11px] text-dim">{hint}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function LabPanel() {
  const params = useDesk((s) => s.params);
  const patch = useDesk((s) => s.patchParams);
  const reset = useDesk((s) => s.resetParams);
  const scenario = useDesk((s) => s.scenario);
  const seed = useDesk((s) => s.seed);
  const dataset = useDesk((s) => s.dataset);
  const setSignalEnabled = useDesk((s) => s.setSignalEnabled);
  const setExitSignalEnabled = useDesk((s) => s.setExitSignalEnabled);
  const applyLabConfig = useDesk((s) => s.applyLabConfig);
  const [tuneStatus, setTuneStatus] = useState<string | null>(null);
  const [tuningPolicy, setTuningPolicy] = useState<TuningPolicy>(DEFAULT_TUNING_POLICY);
  const importInput = useRef<HTMLInputElement>(null);

  const set = (key: keyof StrategyParams, n: number) => patch({ [key]: n });
  const setPolicy = <K extends keyof TuningPolicy>(key: K, value: TuningPolicy[K]) =>
    setTuningPolicy((current) => ({ ...current, [key]: value }));

  const exportConfig = () => {
    const config = createLabConfig({ params, dataset, scenario, seed, tuningPolicy });
    const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `oracle-lab-config-v${config.version}-${config.exportedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setTuneStatus("Đã export snapshot cấu hình Lab. File không chứa kết quả backtest hoặc khóa API.");
  };

  const importConfig = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const config = parseLabConfig(JSON.parse(await file.text()));
      applyLabConfig({ params: config.params, ...config.context });
      setTuningPolicy(config.tuningPolicy);
      setTuneStatus(`Đã load cấu hình v${config.version} export lúc ${new Date(config.exportedAt).toLocaleString("vi-VN")}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Lỗi không xác định";
      setTuneStatus(`Không load file: ${detail}`);
    }
  };

  const autotune = () => {
    setTuneStatus("Đang kiểm định 108 cấu hình...");
    window.setTimeout(() => {
      const market = getCachedMarket(dataset);
      if (!market) {
        setTuneStatus("Dataset chưa tải xong.");
        return;
      }
      const candidates = [1, 2, 3].flatMap((minVotes) =>
        [35, 40, 45].flatMap((oversold) =>
          [15, 20].flatMap((breakoutWindow) =>
            [-0.1, -0.15, -0.2].map((stoploss) => ({ minVotes, oversold, breakoutWindow, stoploss })),
          ),
        ),
      );
      let best: { patch: Partial<StrategyParams>; score: number; trades: number } | null = null;
      for (const patch of candidates) {
        const result = runOracleBacktest({ ...params, ...patch }, seed, scenario, dataset, market);
        const m = result.metrics;
        if (
          m.closedTrades < tuningPolicy.minTrades ||
          m.closedProfitFactor < tuningPolicy.minProfitFactor ||
          m.maxDrawdownPct > tuningPolicy.maxDrawdown ||
          !Number.isFinite(m.profitFactor)
        ) continue;
        const score =
          (m.closedNetProfit / params.wallet) * 100 * tuningPolicy.profitWeight +
          Math.min(m.closedProfitFactor, 4) * tuningPolicy.pfWeight -
          m.maxDrawdownPct * tuningPolicy.drawdownWeight;
        if (!best || score > best.score) best = { patch, score, trades: m.closedTrades };
      }
      if (!best) {
        setTuneStatus("Không có cấu hình vượt qua ngưỡng số lệnh, PF và drawdown đã đặt.");
        return;
      }
      patch(best.patch);
      setTuneStatus(`Đã áp dụng cấu hình tốt nhất: ${best.trades} lệnh đóng tự nhiên · điểm ${best.score.toFixed(1)}.`);
    }, 0);
  };

  return (
    <div className="space-y-3">
      <Panel>
        <PanelTitle
          kicker="Signal control"
          title="Bộ tín hiệu & Autotune"
          action={
            <div className="flex items-center gap-2">
              <input ref={importInput} type="file" accept="application/json,.json" className="sr-only" onChange={importConfig} />
              <Button variant="ghost" size="sm" onClick={() => importInput.current?.click()}>Load JSON</Button>
              <Button variant="ghost" size="sm" onClick={exportConfig}>Export JSON</Button>
              <Button size="sm" onClick={autotune}>Autotune</Button>
            </div>
          }
        />
        <p className="mb-2 text-xs text-dim">
          Autotune thử min votes, RSI oversold, cửa sổ breakout và stoploss trên dataset hiện tại.
          Kết quả chỉ là in-sample — chạy Walk-forward trên Tổng quan trước khi tin.
        </p>
        <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
          <Row label="Số lệnh tối thiểu" hint="Loại mẫu quá nhỏ" value={String(tuningPolicy.minTrades)}>
            <Slider min={4} max={40} step={1} value={[tuningPolicy.minTrades]} onValueChange={([v]) => v !== undefined && setPolicy("minTrades", v)} />
          </Row>
          <Row label="Profit Factor tối thiểu" hint="Bộ lọc trước khi xếp hạng" value={tuningPolicy.minProfitFactor.toFixed(1)}>
            <Slider min={1} max={3} step={0.1} value={[tuningPolicy.minProfitFactor]} onValueChange={([v]) => v !== undefined && setPolicy("minProfitFactor", v)} />
          </Row>
          <Row label="Drawdown tối đa" hint="Loại cấu hình vượt ngưỡng" value={`${tuningPolicy.maxDrawdown}%`}>
            <Slider min={5} max={60} step={1} value={[tuningPolicy.maxDrawdown]} onValueChange={([v]) => v !== undefined && setPolicy("maxDrawdown", v)} />
          </Row>
          <Row label="Trọng số lợi nhuận" value={`${tuningPolicy.profitWeight.toFixed(1)}×`}>
            <Slider min={0} max={3} step={0.25} value={[tuningPolicy.profitWeight]} onValueChange={([v]) => v !== undefined && setPolicy("profitWeight", v)} />
          </Row>
          <Row label="Trọng số PF" value={tuningPolicy.pfWeight.toFixed(0)}>
            <Slider min={0} max={30} step={1} value={[tuningPolicy.pfWeight]} onValueChange={([v]) => v !== undefined && setPolicy("pfWeight", v)} />
          </Row>
          <Row label="Phạt drawdown" value={tuningPolicy.drawdownWeight.toFixed(1)}>
            <Slider min={0} max={4} step={0.25} value={[tuningPolicy.drawdownWeight]} onValueChange={([v]) => v !== undefined && setPolicy("drawdownWeight", v)} />
          </Row>
        </div>
        <div className="mt-3 border-t border-border pt-1">
          <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
            {SIGNAL_META.map((signal) => (
              <Row key={signal.key} label={signal.name} hint={signal.code} value={params.signals[signal.key] ? "Bật" : "Tắt"}>
                <Switch checked={params.signals[signal.key]} onCheckedChange={(enabled) => setSignalEnabled(signal.key as SignalName, enabled)} />
              </Row>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-1">
            <p className="pt-2 text-xs font-medium text-fg">Tín hiệu exit</p>
            <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
              <Row
                label="Bearish divergence (long)"
                hint="Close tạo đỉnh 20 nến, RSI không tạo đỉnh mới. Chỉ đóng long."
                value={params.exitSignals.bearishDivergence ? "Bật" : "Tắt"}
              >
                <Switch
                  checked={params.exitSignals.bearishDivergence}
                  onCheckedChange={(enabled) => setExitSignalEnabled("bearishDivergence", enabled)}
                />
              </Row>
              <Row
                label="Fast crash exit"
                hint="Thoát khi lỗ quá 9% trong 15 phút đầu. Áp dụng long và short."
                value={params.exitSignals.fastCrashExit ? "Bật" : "Tắt"}
              >
                <Switch
                  checked={params.exitSignals.fastCrashExit}
                  onCheckedChange={(enabled) => setExitSignalEnabled("fastCrashExit", enabled)}
                />
              </Row>
              <Row
                label="Stagnant time exit"
                hint="Thoát vị thế gần hòa vốn sau 30–65 phút. Áp dụng long và short."
                value={params.exitSignals.stagnantTimeExit ? "Bật" : "Tắt"}
              >
                <Switch
                  checked={params.exitSignals.stagnantTimeExit}
                  onCheckedChange={(enabled) => setExitSignalEnabled("stagnantTimeExit", enabled)}
                />
              </Row>
              <Row
                label="Too many bad regimes"
                hint="Thoát khi lỗ quá 12% và số regime xấu vượt ngưỡng. Áp dụng long và short."
                value={params.exitSignals.tooManyBadRegimes ? "Bật" : "Tắt"}
              >
                <Switch
                  checked={params.exitSignals.tooManyBadRegimes}
                  onCheckedChange={(enabled) => setExitSignalEnabled("tooManyBadRegimes", enabled)}
                />
              </Row>
            </div>
          </div>
        </div>
        {tuneStatus ? <p className="mt-2 font-mono text-xs text-accent" aria-live="polite">{tuneStatus}</p> : null}
      </Panel>
      <div className="grid gap-3 lg:grid-cols-2">
      <Panel>
        <PanelTitle
          kicker="Oracle defaults"
          title="Regime & phiếu"
          action={
            <Button variant="ghost" size="sm" onClick={reset}>
              Khôi phục
            </Button>
          }
        />
        <Row label="Lọc regime" value={params.useRegimeFilter ? "Bật" : "Tắt"}>
          <Switch
            checked={params.useRegimeFilter}
            onCheckedChange={(v) => patch({ useRegimeFilter: v })}
          />
        </Row>
        <Row
          label="Min score long"
          hint="Chỉ long khi regime_score ≥ ngưỡng"
          value={String(params.minRegimeForLong)}
        >
          <Slider
            min={35}
            max={70}
            step={1}
            value={[params.minRegimeForLong]}
            onValueChange={([v]) => v !== undefined && set("minRegimeForLong", v)}
          />
        </Row>
        <Row
          label="Max score short"
          hint="Chỉ short khi regime_score ≤ ngưỡng"
          value={String(params.maxRegimeForShort)}
        >
          <Slider
            min={0}
            max={49}
            step={1}
            value={[params.maxRegimeForShort]}
            onValueChange={([v]) => v !== undefined && set("maxRegimeForShort", v)}
          />
        </Row>
        <Row
          label="Trần bad-regime"
          hint="Code gốc: ≤ 12 cặp xấu vẫn được vào"
          value={String(params.badRegimeCountLimit)}
        >
          <Slider
            min={4}
            max={12}
            step={1}
            value={[params.badRegimeCountLimit]}
            onValueChange={([v]) => v !== undefined && set("badRegimeCountLimit", v)}
          />
        </Row>
        <Row label="Phiếu tối thiểu" hint="Gốc: ≥ 1 / 5" value={`${params.minVotes}/5`}>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[params.minVotes]}
            onValueChange={([v]) => v !== undefined && set("minVotes", v)}
          />
        </Row>
        <Row
          label="Phiếu ngược tối đa"
          hint="Gốc: short_votes ≤ 1 khi vào long"
          value={String(params.maxContraVotes)}
        >
          <Slider
            min={0}
            max={3}
            step={1}
            value={[params.maxContraVotes]}
            onValueChange={([v]) => v !== undefined && set("maxContraVotes", v)}
          />
        </Row>
      </Panel>

      <Panel>
        <PanelTitle kicker="Vốn" title="Rủi ro & ECS" />
        <Row label="Đòn bẩy" value={`${params.leverage}×`}>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[params.leverage]}
            onValueChange={([v]) => v !== undefined && set("leverage", v)}
          />
        </Row>
        <Row
          label="Stoploss"
          hint="Trên profit đã nhân đòn bẩy"
          value={formatPct(params.stoploss, 0)}
        >
          <Slider
            min={5}
            max={30}
            step={1}
            value={[Math.round(Math.abs(params.stoploss) * 100)]}
            onValueChange={([v]) => v !== undefined && set("stoploss", -v / 100)}
          />
        </Row>
        <Row
          label="Trailing offset"
          hint="Kích hoạt khi lãi ≥ offset"
          value={formatPct(params.trailingStopPositiveOffset)}
        >
          <Slider
            min={1}
            max={10}
            step={1}
            value={[Math.round(params.trailingStopPositiveOffset * 100)]}
            onValueChange={([v]) =>
              v !== undefined && set("trailingStopPositiveOffset", v / 100)
            }
          />
        </Row>
        <Row label="Trailing gap" value={formatPct(params.trailingStopPositive)}>
          <Slider
            min={0.5}
            max={5}
            step={0.5}
            value={[params.trailingStopPositive * 100]}
            onValueChange={([v]) => v !== undefined && set("trailingStopPositive", v / 100)}
          />
        </Row>
        <Row label="Max lệnh mở" value={String(params.maxOpenTrades)}>
          <Slider
            min={1}
            max={8}
            step={1}
            value={[params.maxOpenTrades]}
            onValueChange={([v]) => v !== undefined && set("maxOpenTrades", v)}
          />
        </Row>
        <Row
          label="Phí round-trip"
          hint="Basis point trên notional; 8 bps × đòn bẩy 3× = 24 bps vốn"
          value={`${params.feeBps} bps`}
        >
          <Slider
            min={0}
            max={20}
            step={1}
            value={[params.feeBps]}
            onValueChange={([v]) => v !== undefined && set("feeBps", v)}
          />
        </Row>
        <Row
          label="Equity curve sizing"
          hint="cold 0.15× · cool 0.65× · warm 1.25× · hot 2×"
          value={params.ecsEnabled ? "Bật" : "Tắt"}
        >
          <Switch checked={params.ecsEnabled} onCheckedChange={(v) => patch({ ecsEnabled: v })} />
        </Row>
        <Row label="Trailing stop" value={params.trailingStop ? "Bật" : "Tắt"}>
          <Switch
            checked={params.trailingStop}
            onCheckedChange={(v) => patch({ trailingStop: v })}
          />
        </Row>
      </Panel>

      <Panel>
        <PanelTitle kicker="Tín hiệu" title="EMA · RSI · Breakout · MACD" />
        <Row label="EMA nhanh" value={String(params.fastEma)}>
          <Slider
            min={5}
            max={20}
            value={[params.fastEma]}
            onValueChange={([v]) => v !== undefined && set("fastEma", v)}
          />
        </Row>
        <Row label="EMA chậm" value={String(params.slowEma)}>
          <Slider
            min={15}
            max={40}
            value={[params.slowEma]}
            onValueChange={([v]) => v !== undefined && set("slowEma", v)}
          />
        </Row>
        <Row label="Trend EMA" value={String(params.trendEma)}>
          <Slider
            min={30}
            max={70}
            value={[params.trendEma]}
            onValueChange={([v]) => v !== undefined && set("trendEma", v)}
          />
        </Row>
        <Row label="RSI oversold (trend)" value={String(params.rsiOversold)}>
          <Slider
            min={30}
            max={45}
            value={[params.rsiOversold]}
            onValueChange={([v]) => v !== undefined && set("rsiOversold", v)}
          />
        </Row>
        <Row label="RSI overbought (trend)" value={String(params.rsiOverbought)}>
          <Slider
            min={55}
            max={70}
            value={[params.rsiOverbought]}
            onValueChange={([v]) => v !== undefined && set("rsiOverbought", v)}
          />
        </Row>
      </Panel>

      <Panel>
        <PanelTitle kicker="Tín hiệu" title="Mean revert · Breakout · MACD" />
        <Row label="RSI oversold" value={String(params.oversold)}>
          <Slider
            min={25}
            max={40}
            value={[params.oversold]}
            onValueChange={([v]) => v !== undefined && set("oversold", v)}
          />
        </Row>
        <Row label="RSI overbought" value={String(params.overbought)}>
          <Slider
            min={60}
            max={80}
            value={[params.overbought]}
            onValueChange={([v]) => v !== undefined && set("overbought", v)}
          />
        </Row>
        <Row label="Cửa sổ breakout" value={String(params.breakoutWindow)}>
          <Slider
            min={5}
            max={50}
            value={[params.breakoutWindow]}
            onValueChange={([v]) => v !== undefined && set("breakoutWindow", v)}
          />
        </Row>
        <Row label="MACD fast" value={String(params.macdFast)}>
          <Slider
            min={5}
            max={30}
            value={[params.macdFast]}
            onValueChange={([v]) => v !== undefined && set("macdFast", v)}
          />
        </Row>
        <Row label="MACD slow" value={String(params.macdSlow)}>
          <Slider
            min={20}
            max={35}
            value={[params.macdSlow]}
            onValueChange={([v]) => v !== undefined && set("macdSlow", v)}
          />
        </Row>
        <Row label="MACD signal" value={String(params.macdSignal)}>
          <Slider
            min={6}
            max={15}
            value={[params.macdSignal]}
            onValueChange={([v]) => v !== undefined && set("macdSignal", v)}
          />
        </Row>
      </Panel>
      </div>
      <RobustnessPanel />
    </div>
  );
}
