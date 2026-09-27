import rawSampleMarket from "./data/binance-15m.json" with { type: "json" };
import type { OhlcvBar, PairSpec } from "./types.ts";

type MarketRow = [time: number, open: number, high: number, low: number, close: number];
type RawMarket = {
  meta?: { start?: string; end_exclusive?: string; timeframe?: string; candles_per_pair?: number };
  source?: string;
  timeframe?: string;
  times: number[];
  pairs: Record<string, MarketRow[]>;
};

export type MarketDatasetId = "sample" | "train" | "validation" | "oos";

export interface MarketMeta {
  label: string;
  period: string;
  blurb: string;
  candles: string;
  bundled: boolean;
  url?: string;
}

export const MARKET_DATASETS: Record<MarketDatasetId, MarketMeta> = {
  sample: {
    label: "Sample",
    period: "50 ngày gần nhất",
    blurb: "4.800 nến 15m đồng bộ — đủ nhanh để chỉnh Lab.",
    candles: "4,800 × 10",
    bundled: true,
  },
  train: {
    label: "Train",
    period: "2024-01-01 – 2025-01-01",
    blurb: "Phát triển giả thuyết. Không phải nơi tin kết quả cuối.",
    candles: "35,136 × 10",
    bundled: false,
    url: "/oracle-data/train.json",
  },
  validation: {
    label: "Validation",
    period: "2025-01-01 – 2026-01-01",
    blurb: "Kiểm tra trung gian. Không tune tham số tùy tiện.",
    candles: "35,040 × 10",
    bundled: false,
    url: "/oracle-data/validation.json",
  },
  oos: {
    label: "OOS",
    period: "2026-01-01 – 2026-09-02",
    blurb: "Đánh giá cuối. Không được nhìn khi tune.",
    candles: "23,430 × 10",
    bundled: false,
    url: "/oracle-data/oos.json",
  },
};

const PAIR_NAMES: Record<string, string> = {
  "BTC/USDT": "Bitcoin",
  "ETH/USDT": "Ethereum",
  "SOL/USDT": "Solana",
  "XRP/USDT": "XRP",
  "DOGE/USDT": "Dogecoin",
  "AVAX/USDT": "Avalanche",
  "LINK/USDT": "Chainlink",
  "ADA/USDT": "Cardano",
  "DOT/USDT": "Polkadot",
  "NEAR/USDT": "NEAR",
};

export const PAIR_UNIVERSE: PairSpec[] = Object.keys(PAIR_NAMES).map((symbol) => ({
  symbol,
  name: PAIR_NAMES[symbol] ?? symbol,
  startPrice: 0,
  beta: 1,
  idioVol: 0,
}));

export interface MarketBundle {
  id: MarketDatasetId;
  times: number[];
  pairs: { spec: PairSpec; bars: OhlcvBar[] }[];
}

const bundleCache = new Map<MarketDatasetId, MarketBundle>();
const inflight = new Map<MarketDatasetId, Promise<MarketBundle>>();

function toMs(time: number): number {
  return time < 1e12 ? time * 1000 : time;
}

function materialize(id: MarketDatasetId, raw: RawMarket): MarketBundle {
  const times = raw.times.map(toMs);
  return {
    id,
    times,
    pairs: PAIR_UNIVERSE.map((spec) => {
      const rows = raw.pairs[spec.symbol] ?? [];
      const bars = rows.map(([time, open, high, low, close]) => ({
        time: toMs(time),
        open,
        high,
        low,
        close,
      }));
      return {
        spec: { ...spec, startPrice: bars[0]?.open ?? 0 },
        bars,
      };
    }),
  };
}

function cache(id: MarketDatasetId, bundle: MarketBundle): MarketBundle {
  bundleCache.set(id, bundle);
  return bundle;
}

export function getCachedMarket(id: MarketDatasetId): MarketBundle | null {
  return bundleCache.get(id) ?? null;
}

export function loadBinanceMarket(dataset: MarketDatasetId = "sample"): MarketBundle {
  const hit = bundleCache.get(dataset);
  if (hit) return hit;
  if (dataset === "sample") {
    return cache("sample", materialize("sample", rawSampleMarket as unknown as RawMarket));
  }
  throw new Error(`Dataset ${dataset} chưa được tải. Gọi ensureMarket() trước.`);
}

export async function ensureMarket(dataset: MarketDatasetId): Promise<MarketBundle> {
  const hit = bundleCache.get(dataset);
  if (hit) return hit;
  if (dataset === "sample") return loadBinanceMarket("sample");

  const pending = inflight.get(dataset);
  if (pending) return pending;

  const meta = MARKET_DATASETS[dataset];
  const url = meta.url;
  if (!url) throw new Error(`Dataset ${dataset} không có URL.`);

  const task = (async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Không tải được ${dataset} (${response.status}).`);
    }
    const raw = (await response.json()) as RawMarket;
    return cache(dataset, materialize(dataset, raw));
  })();

  inflight.set(dataset, task);
  try {
    return await task;
  } finally {
    inflight.delete(dataset);
  }
}

export const MARKET_LIVE_START = 0;
