#!/usr/bin/env python3
"""Import NFI Binance spot 15m Feather data into three immutable Oracle datasets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

PAIR_SYMBOLS = ("BTC", "ETH", "SOL", "XRP", "DOGE", "AVAX", "LINK", "ADA", "DOT", "NEAR")
DATASETS = (
    ("train", "2024-01-01T00:00:00Z", "2025-01-01T00:00:00Z"),
    ("validation", "2025-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
    ("oos", "2026-01-01T00:00:00Z", "2026-09-02T01:30:00Z"),
)


def rows_for_period(path: Path, start: pd.Timestamp, end: pd.Timestamp) -> list[list[float | int]]:
    frame = pd.read_feather(path, columns=["date", "open", "high", "low", "close"])
    frame["date"] = pd.to_datetime(frame["date"], utc=True)
    frame = frame[(frame["date"] >= start) & (frame["date"] < end)].sort_values("date")
    if frame.empty:
        raise ValueError(f"No data in requested period: {path}")
    delta = frame["date"].diff().dropna()
    if not delta.eq(pd.Timedelta(minutes=15)).all():
        raise ValueError(f"15m gaps found in requested period: {path}")
    return [
        [int(row.date.timestamp() * 1000), float(row.open), float(row.high), float(row.low), float(row.close)]
        for row in frame.itertuples(index=False)
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Import NFI Binance 15m spot data for Oracle research.")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("/mnt/c/Users/seller/Downloads/NostalgiaForInfinityData-main/NostalgiaForInfinityData-main/binance"),
    )
    parser.add_argument("--output-dir", type=Path, default=Path("src/lib/oracle/data"))
    args = parser.parse_args()

    source = args.source.resolve()
    if not source.is_dir():
        raise SystemExit(f"Source directory does not exist: {source}")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, start_text, end_text in DATASETS:
        start, end = pd.Timestamp(start_text), pd.Timestamp(end_text)
        pairs: dict[str, list[list[float | int]]] = {}
        for symbol in PAIR_SYMBOLS:
            path = source / f"{symbol}_USDT-15m.feather"
            if not path.is_file():
                raise SystemExit(f"Missing required input: {path}")
            pairs[f"{symbol}/USDT"] = rows_for_period(path, start, end)
        lengths = {len(rows) for rows in pairs.values()}
        if len(lengths) != 1:
            raise RuntimeError(f"Mismatched candle count for {name}: {lengths}")
        common_times = [row[0] for row in next(iter(pairs.values()))]
        output = {
            "meta": {
                "source": "NostalgiaForInfinityData Binance spot 15m",
                "dataset": name,
                "start": start_text,
                "end_exclusive": end_text,
                "timeframe": "15m",
                "pairs": list(pairs),
                "candles_per_pair": len(common_times),
                "gap_check": "passed",
            },
            "times": common_times,
            "pairs": pairs,
        }
        destination = args.output_dir / f"binance-15m-{name}.json"
        destination.write_text(json.dumps(output, separators=(",", ":")) + "\n")
        print(f"{name}: {len(pairs)} pairs x {len(common_times)} candles -> {destination}")


if __name__ == "__main__":
    main()
