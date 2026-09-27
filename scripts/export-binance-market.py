#!/usr/bin/env python3
"""Export a synchronized 15-minute Binance OHLC slice for the browser dashboard."""

import argparse
import json
from pathlib import Path

import pandas as pd

SYMBOLS = ("BTC", "ETH", "SOL", "XRP", "DOGE", "AVAX", "LINK", "ADA", "DOT", "NEAR")
DEFAULT_SOURCE = Path(
    "/mnt/c/Users/seller/Downloads/NostalgiaForInfinityData-main/"
    "NostalgiaForInfinityData-main/binance"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=Path("src/lib/oracle/data/binance-15m.json"))
    parser.add_argument("--bars", type=int, default=4800, help="Synchronized final bars to export")
    args = parser.parse_args()

    frames: dict[str, pd.DataFrame] = {}
    for symbol in SYMBOLS:
        path = args.source / f"{symbol}_USDT-15m.feather"
        frame = pd.read_feather(path, columns=["date", "open", "high", "low", "close"])
        # Feather stores this datetime column at millisecond precision; convert to Unix seconds.
        frame["time"] = (frame["date"].astype("int64") // 1_000).astype("int64")
        frames[symbol] = frame.set_index("time")[["open", "high", "low", "close"]]

    common_times = set.intersection(*(set(frame.index) for frame in frames.values()))
    times = sorted(common_times)[-args.bars :]
    if len(times) != args.bars:
        raise ValueError(f"Only {len(times)} synchronized bars available; expected {args.bars}")

    pairs = {
        f"{symbol}/USDT": [
            [
                int(time),
                float(row.open),
                float(row.high),
                float(row.low),
                float(row.close),
            ]
            for time, row in frames[symbol].loc[times].iterrows()
        ]
        for symbol in SYMBOLS
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"source": "Binance", "timeframe": "15m", "times": times, "pairs": pairs}, separators=(",", ":")))
    print(f"Exported {len(times)} synchronized 15m bars for {len(pairs)} pairs to {args.output}")


if __name__ == "__main__":
    main()
