# Oracle futures 5m core import

- **Status:** `imported`; data-only change. No dashboard or Oracle engine change.
- **Purpose:** Provide volume-bearing futures OHLCV suitable for the next fast-state research gate.
- **Output:** `src/lib/oracle/data/binance-futures-5m-core.json`.

## Provenance

| Field | Value |
| --- | --- |
| Exchange / market | Binance USDT-margined futures |
| Source format | Local Freqtrade Feather futures cache |
| Source location | `picassodesk-freqtrade-work/picassodesk-freqtrade/user_data/data/binance/futures/` |
| Universe | `BTC/USDT:USDT`, `ETH/USDT:USDT`, `SOL/USDT:USDT`, `XRP/USDT:USDT` |
| Timeframe | 5m, UTC |
| Fields | Open time, open, high, low, close, volume |
| Imported interval | 2025-01-29 01:35 UTC through 2025-08-29 06:15 UTC |
| Bars | 61,113 per pair, synchronized and contiguous |
| Source SHA-256 | `c4b61e7542530bc8361024901274205a362be14dccfe22018b136e802972e390` |

## Validation and exclusion policy

The importer validates source columns, monotonically increasing unique timestamps, positive OHLCV, exact 5m continuity, and equal aligned length across the universe.

Each source had five zero-volume flat bars at the same timestamps. These are treated as feed gaps, not tradable candles. The importer removes invalid rows and retains the longest common contiguous segment; it does not forward-fill or manufacture candles. The selected core-4 universe has materially longer shared coverage than the other Oracle pairs, whose 5m history starts much later.

## Research use and limits

This import enables volume-confirmed fast-shock features and 5m execution diagnostics. It does not provide order-book spread, trades, mark-price 5m, funding aligned to every candle, latency, partial fills, or liquidation mechanics. It is not a deployment-ready execution dataset.

Before testing, this immutable interval must be partitioned chronologically into fresh train/validation/OOS splits. The earlier 15m spot OOS remains unrelated and must not be reused to tune this dataset's thresholds.
