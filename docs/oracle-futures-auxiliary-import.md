# Oracle Binance futures auxiliary import

- **Status:** `imported`.
- **Scope:** Research data only. No dashboard, Oracle engine, strategy default, or live-execution change.
- **Core alignment:** `src/lib/oracle/data/binance-futures-auxiliary.json` is cryptographically tied to `src/lib/oracle/data/binance-futures-5m-core.json` through `core_source_sha256`.

## Imported data

The importer retrieved public Binance USD-M Futures historical endpoints for the existing core-4 universe (BTC, ETH, SOL, XRP):

- `markPriceKlines` at 5m: OHLC mark-price candles.
- `fundingRate`: funding timestamp, rate, and reported mark price.

For every symbol, mark-price has exactly 61,113 rows and its timestamp sequence exactly equals the core OHLCV 5m sequence. Funding has 636 nonzero observations per symbol, from 2025-01-29 08:00 UTC through 2025-08-29 00:00 UTC. The core begins at 2025-01-29 01:35 UTC, so the first 6h25m has no funding observation; downstream research must use only already-published funding values and explicitly handle this initial gap.

## Provenance and integrity

- Importer: `scripts/import-oracle-binance-futures-auxiliary.py`.
- Output: `src/lib/oracle/data/binance-futures-auxiliary.json`.
- Output SHA-256 at import: `5d4cf6a1db5de66ce6418fd4cccc333b25e052d7a243e8b7292ce7b96ba6677a`.
- Binance public endpoints: `/fapi/v1/markPriceKlines` and `/fapi/v1/fundingRate`.
- The importer paginates requests, retries transient request failures, and rejects the output if every 5m mark timestamp does not exactly match core data.

## Deliberate exclusions

Open-interest history was not imported because Binance's public historical endpoint retention cannot cover the full core interval. Liquidation data was not imported because the public endpoint is a live stream rather than a complete historical archive. Order-book depth was not imported because the public endpoint provides snapshots, not historical depth.

This dataset supports causal research that maps a funding observation only after its funding timestamp and that executes on a later tradable candle. It does not itself model funding debits/credits, spread, latency, partial fills, liquidation, or capacity.
