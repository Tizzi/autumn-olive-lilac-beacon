import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Panel, PanelTitle } from "@/components/desk/panel";
import { Button } from "@/components/ui/button";
import { useDesk } from "@/lib/desk-store";
import { formatNumber, formatPct, formatUsd, signedClass } from "@/lib/oracle/format";
import { MARKET_DATASETS } from "@/lib/oracle/market";
import {
  addJournalEntry,
  createJournalEntry,
  loadJournal,
  parseJournalDocument,
  removeJournalEntry,
  saveJournal,
  serializeJournalDocument,
  type JournalEntry,
} from "@/lib/oracle/journal";
import { snapshotMetrics } from "@/lib/oracle/robustness";
import type { BacktestResult } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md bg-subtle px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-accent)]";

export function JournalPanel({ result }: { result: BacktestResult | null }) {
  const params = useDesk((s) => s.params);
  const dataset = useDesk((s) => s.dataset);
  const scenario = useDesk((s) => s.scenario);
  const seed = useDesk((s) => s.seed);
  const applyLabConfig = useDesk((s) => s.applyLabConfig);
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadJournal());
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const importInput = useRef<HTMLInputElement>(null);

  const compared = useMemo(
    () => entries.filter((entry) => selected.includes(entry.id)).slice(0, 2),
    [entries, selected],
  );

  const pin = () => {
    if (!result) {
      setStatus("Chưa có kết quả backtest để ghim.");
      return;
    }
    try {
      const entry = createJournalEntry({
        name: name || `${MARKET_DATASETS[dataset].label} · ${new Date().toLocaleString("vi-VN")}`,
        notes,
        dataset,
        scenario,
        seed,
        params,
        metrics: snapshotMetrics(result.metrics),
      });
      setEntries(addJournalEntry(entry, entries));
      setName("");
      setNotes("");
      setStatus(`Đã ghim “${entry.name}”. Chỉ lưu trên máy này, không đồng bộ.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không ghim được.");
    }
  };

  const loadEntry = (entry: JournalEntry) => {
    applyLabConfig({
      params: entry.params,
      dataset: entry.dataset,
      scenario: entry.scenario,
      seed: entry.seed,
    });
    setStatus(`Đã nạp “${entry.name}” vào Lab. Dataset ${MARKET_DATASETS[entry.dataset].label}.`);
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      const next = [...current, id];
      return next.slice(-2);
    });
  };

  const exportJson = () => {
    const blob = new Blob([serializeJournalDocument(entries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `oracle-journal-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Đã export nhật ký JSON.");
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const document = parseJournalDocument(JSON.parse(await file.text()));
      const merged = [...document.entries, ...entries.filter((item) => !document.entries.some((incoming) => incoming.id === item.id))];
      setEntries(saveJournal(merged));
      setStatus(`Đã nhập ${document.entries.length} thí nghiệm.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "File nhật ký không hợp lệ.");
    }
  };

  return (
    <div className="space-y-4">
      <Panel>
        <PanelTitle
          kicker="Nhật ký"
          title="Ghim thí nghiệm"
          action={
            <div className="flex items-center gap-2">
              <input
                ref={importInput}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={importJson}
              />
              <Button variant="ghost" size="sm" onClick={() => importInput.current?.click()}>
                Nhập JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={exportJson} disabled={!entries.length}>
                Xuất JSON
              </Button>
              <Button size="sm" onClick={pin} disabled={!result}>
                Ghim kết quả
              </Button>
            </div>
          }
        />
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-dim">
          Lưu snapshot tham số + metric đóng lệnh trên trình duyệt. Không chứa API key, không phải
          bằng chứng OOS, không đồng bộ giữa thiết bị.
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
          <label className="text-sm">
            <span className="mb-1 block text-[11px] tracking-[0.12em] text-dim uppercase">Tên</span>
            <input
              className={fieldClass}
              value={name}
              maxLength={80}
              placeholder="Ví dụ: Sample · minVotes 2"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[11px] tracking-[0.12em] text-dim uppercase">Ghi chú</span>
            <input
              className={fieldClass}
              value={notes}
              maxLength={2000}
              placeholder="Giả thuyết, điều kiện, lý do bác bỏ…"
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>
        {status ? (
          <p className="mt-3 font-mono text-xs text-accent" aria-live="polite">
            {status}
          </p>
        ) : null}
      </Panel>

      {compared.length === 2 && compared[0] && compared[1] ? (
        <CompareCard left={compared[0]} right={compared[1]} />
      ) : null}

      <Panel>
        <PanelTitle kicker="Archive" title={`${entries.length} thí nghiệm`} />
        {entries.length === 0 ? (
          <p className="text-sm text-muted">Chưa có thí nghiệm. Chạy Lab rồi ghim kết quả hiện tại.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const on = selected.includes(entry.id);
              const m = entry.metrics;
              return (
                <li key={entry.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelect(entry.id)}
                        className={cn(
                          "rounded px-2 py-1 text-[11px] uppercase tracking-[0.12em]",
                          on ? "bg-accent text-accent-fg" : "bg-subtle text-muted",
                        )}
                      >
                        {on ? "Đang so" : "So sánh"}
                      </button>
                      <p className="truncate text-sm text-fg">{entry.name}</p>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-dim">
                      {MARKET_DATASETS[entry.dataset].label} · {new Date(entry.createdAt).toLocaleString("vi-VN")} ·{" "}
                      {entry.notes || "không ghi chú"}
                    </p>
                    <p className="mt-1 font-mono text-xs tabular text-muted">
                      <span className={signedClass(m.closedNetProfit)}>{formatUsd(m.closedNetProfit)}</span>
                      {" · "}
                      {m.closedTrades} lệnh · PF {formatNumber(m.closedProfitFactor, 2)} · DD{" "}
                      {formatPct(-Math.abs(m.maxDrawdownPct), 1)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" size="sm" onClick={() => loadEntry(entry)}>
                      Nạp Lab
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEntries(removeJournalEntry(entry.id, entries));
                        setSelected((current) => current.filter((id) => id !== entry.id));
                      }}
                    >
                      Xóa
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function CompareCard({ left, right }: { left: JournalEntry; right: JournalEntry }) {
  const rows: { label: string; a: string; b: string; delta: number }[] = [
    {
      label: "PnL đóng",
      a: formatUsd(left.metrics.closedNetProfit),
      b: formatUsd(right.metrics.closedNetProfit),
      delta: right.metrics.closedNetProfit - left.metrics.closedNetProfit,
    },
    {
      label: "PF đóng",
      a: formatNumber(left.metrics.closedProfitFactor, 2),
      b: formatNumber(right.metrics.closedProfitFactor, 2),
      delta: right.metrics.closedProfitFactor - left.metrics.closedProfitFactor,
    },
    {
      label: "Lệnh đóng",
      a: String(left.metrics.closedTrades),
      b: String(right.metrics.closedTrades),
      delta: right.metrics.closedTrades - left.metrics.closedTrades,
    },
    {
      label: "Max DD",
      a: formatPct(-Math.abs(left.metrics.maxDrawdownPct), 1),
      b: formatPct(-Math.abs(right.metrics.maxDrawdownPct), 1),
      delta: Math.abs(left.metrics.maxDrawdownPct) - Math.abs(right.metrics.maxDrawdownPct),
    },
  ];
  return (
    <Panel>
      <PanelTitle kicker="So sánh" title={`${left.name}  →  ${right.name}`} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-[11px] tracking-[0.1em] text-dim uppercase">
            <tr className="border-y border-border">
              <th className="py-2 pr-3 font-medium">Metric</th>
              <th className="px-2 py-2 font-medium">Trái</th>
              <th className="px-2 py-2 font-medium">Phải</th>
              <th className="py-2 pl-2 text-right font-medium">Δ phải − trái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border/80">
                <td className="py-2 pr-3 text-muted">{row.label}</td>
                <td className="px-2 py-2 font-mono text-xs tabular">{row.a}</td>
                <td className="px-2 py-2 font-mono text-xs tabular">{row.b}</td>
                <td className={cn("py-2 pl-2 text-right font-mono text-xs tabular", signedClass(row.delta))}>
                  {formatNumber(row.delta, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
