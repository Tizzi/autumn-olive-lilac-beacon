import type { Trade } from "./types.ts";

export type PerformancePeriod = "day" | "week";

export interface PerformanceRow {
  key: string;
  label: string;
  firstExitTime: number;
  lastExitTime: number;
  closedTrades: number;
  wins: number;
  losses: number;
  closedPnl: number;
  forcedTrades: number;
  forcedPnl: number;
}

function dayStart(time: number): number {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function weekStart(time: number): number {
  const date = new Date(dayStart(time));
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return date.getTime() - mondayOffset * 86_400_000;
}

function dayLabel(time: number): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(time);
}

function weekLabel(time: number): string {
  return `Tuần ${dayLabel(time)}`;
}

export function aggregatePerformance(trades: Trade[], period: PerformancePeriod): PerformanceRow[] {
  const buckets = new Map<number, PerformanceRow>();
  for (const trade of trades) {
    const start = period === "day" ? dayStart(trade.exitTime) : weekStart(trade.exitTime);
    const row = buckets.get(start) ?? {
      key: `${period}:${start}`,
      label: period === "day" ? dayLabel(start) : weekLabel(start),
      firstExitTime: trade.exitTime,
      lastExitTime: trade.exitTime,
      closedTrades: 0,
      wins: 0,
      losses: 0,
      closedPnl: 0,
      forcedTrades: 0,
      forcedPnl: 0,
    };
    row.firstExitTime = Math.min(row.firstExitTime, trade.exitTime);
    row.lastExitTime = Math.max(row.lastExitTime, trade.exitTime);
    if (trade.exitReason === "end_of_data") {
      row.forcedTrades += 1;
      row.forcedPnl += trade.profitAbs;
    } else {
      row.closedTrades += 1;
      row.closedPnl += trade.profitAbs;
      if (trade.profitAbs > 0) row.wins += 1;
      if (trade.profitAbs < 0) row.losses += 1;
    }
    buckets.set(start, row);
  }
  return [...buckets.entries()].sort(([left], [right]) => right - left).map(([, row]) => row);
}
