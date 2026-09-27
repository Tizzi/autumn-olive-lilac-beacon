import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  FlaskConical,
  LayoutGrid,
  List,
  Radar,
  Shield,
} from "lucide-react";
import { useDesk, type DeskTab } from "@/lib/desk-store";
import { MARKET_DATASETS, type MarketDatasetId } from "@/lib/oracle/market";
import { cn } from "@/lib/utils";

const TABS: { id: DeskTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Tổng quan", icon: LayoutGrid },
  { id: "market", label: "Thị trường", icon: Activity },
  { id: "signals", label: "Tín hiệu", icon: BarChart3 },
  { id: "regime", label: "Regime", icon: Shield },
  { id: "trades", label: "Sổ lệnh", icon: List },
  { id: "performance", label: "Hiệu suất", icon: CalendarDays },
  { id: "scan", label: "Scan", icon: Radar },
  { id: "lab", label: "Lab", icon: FlaskConical },
  { id: "journal", label: "Nhật ký", icon: BookOpen },
];

const DATASET_ORDER: MarketDatasetId[] = ["sample", "train", "validation", "oos"];

export function DeskHeader() {
  const tab = useDesk((s) => s.tab);
  const setTab = useDesk((s) => s.setTab);
  const dataset = useDesk((s) => s.dataset);
  const setDataset = useDesk((s) => s.setDataset);

  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-dim uppercase">
              Research desk · research-only
            </p>
            <h1 className="mt-1 font-display text-3xl leading-none text-fg md:text-4xl">
              Oracle Desk
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Workbench backtest nhân quả: 5 tín hiệu consensus, regime 1h, ECS, phí round-trip và
              walk-forward Train / Validation / OOS.
            </p>
          </div>
          <div className="rounded-md bg-subtle p-1 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-center gap-1" aria-label="Chọn bộ dữ liệu">
              {DATASET_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDataset(id)}
                  title={`${MARKET_DATASETS[id].period} · ${MARKET_DATASETS[id].blurb}`}
                  className={cn(
                    "rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                    dataset === id ? "bg-accent text-accent-fg" : "text-muted hover:bg-bg hover:text-fg",
                  )}
                >
                  {MARKET_DATASETS[id].label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm transition-[background-color,color] duration-150 ease-out",
                  on ? "bg-accent text-accent-fg" : "text-muted hover:bg-subtle hover:text-fg",
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
