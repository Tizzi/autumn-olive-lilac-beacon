#!/usr/bin/env python3
"""Causal regime x entry-signal scanner for the bundled Binance 15m sample.

The signal is observed at candle close t, filled at open t+1, and evaluated at
close t+horizon. It is a fixed-horizon entry diagnostic, not a full backtest:
no exit optimization, compounding, or force-exit PnL is included.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean, median

SIGNALS = ("ema_cross", "ema_trend_rsi", "rsi_mean_revert", "breakout", "macd")
SIDES = ("long", "short")


def ema(values: list[float], span: int) -> list[float]:
    alpha = 2 / (span + 1)
    output = [values[0]]
    for value in values[1:]:
        output.append(alpha * value + (1 - alpha) * output[-1])
    return output


def rolling_mean(values: list[float], window: int) -> list[float | None]:
    output: list[float | None] = [None] * len(values)
    total = 0.0
    for index, value in enumerate(values):
        total += value
        if index >= window:
            total -= values[index - window]
        if index >= window - 1:
            output[index] = total / window
    return output


def rsi(close: list[float], period: int = 14) -> list[float | None]:
    gains = [0.0] * len(close)
    losses = [0.0] * len(close)
    for index in range(1, len(close)):
        delta = close[index] - close[index - 1]
        gains[index] = max(delta, 0)
        losses[index] = max(-delta, 0)
    gain_mean = rolling_mean(gains, period)
    loss_mean = rolling_mean(losses, period)
    output: list[float | None] = [None] * len(close)
    for index, (gain, loss) in enumerate(zip(gain_mean, loss_mean)):
        if gain is None or loss is None:
            continue
        output[index] = 100.0 if loss == 0 and gain > 0 else 50.0 if loss == 0 else 100 - 100 / (1 + gain / loss)
    return output


def rolling_std(values: list[float], window: int) -> list[float | None]:
    output: list[float | None] = [None] * len(values)
    for index in range(window - 1, len(values)):
        sample = values[index - window + 1 : index + 1]
        avg = mean(sample)
        output[index] = math.sqrt(sum((value - avg) ** 2 for value in sample) / len(sample))
    return output


def prior_extreme(values: list[float], index: int, window: int, find_max: bool) -> float | None:
    if index < window:
        return None
    sample = values[index - window : index]
    return max(sample) if find_max else min(sample)


def classify_regime(close: list[float]) -> list[str | None]:
    e20, e50, e200 = ema(close, 20), ema(close, 50), ema(close, 200)
    returns = [0.0] + [close[i] / close[i - 1] - 1 for i in range(1, len(close))]
    volatility = rolling_std(returns, 30)
    labels: list[str | None] = [None] * len(close)
    for index in range(len(close)):
        vol = volatility[index]
        if index < 251 or vol is None:
            continue
        current_vol = float(vol)
        history = [value for value in volatility[index - 251 : index + 1] if value is not None]
        if len(history) < 252:
            continue
        finite_history = [float(value) for value in history]
        vol_high = sum(value <= current_vol for value in finite_history) / len(finite_history) >= 0.75
        peak = max(close[index - 59 : index + 1])
        drawdown = close[index] / peak - 1
        bullish = close[index] > e200[index] and e20[index] > e50[index] and e50[index] > e200[index]
        bearish = close[index] < e200[index] and e20[index] < e50[index] and e50[index] < e200[index]
        if drawdown <= -0.08 or (vol_high and not bullish and not bearish):
            labels[index] = "stress"
        elif bullish:
            labels[index] = "bull_trend_high_vol" if vol_high else "bull_trend_low_vol"
        elif bearish:
            labels[index] = "bear_trend_high_vol" if vol_high else "bear_trend_low_vol"
        else:
            labels[index] = "range_high_vol" if vol_high else "range_low_vol"
    return labels


def signal_values(high: list[float], low: list[float], close: list[float]) -> dict[str, list[int]]:
    n = len(close)
    output = {name: [0] * n for name in SIGNALS}
    fast, slow, trend = ema(close, 9), ema(close, 21), ema(close, 50)
    r = rsi(close)
    macd_fast, macd_slow = ema(close, 12), ema(close, 26)
    macd_line = [a - b for a, b in zip(macd_fast, macd_slow)]
    macd_hist = [a - b for a, b in zip(macd_line, ema(macd_line, 9))]
    for index in range(1, n):
        if fast[index] > slow[index] and fast[index - 1] <= slow[index - 1]:
            output["ema_cross"][index] = 1
        elif fast[index] < slow[index] and fast[index - 1] >= slow[index - 1]:
            output["ema_cross"][index] = -1
        rsi_value = r[index]
        if rsi_value is not None:
            if close[index] > trend[index] and rsi_value < 40:
                output["ema_trend_rsi"][index] = 1
            elif close[index] < trend[index] and rsi_value > 60:
                output["ema_trend_rsi"][index] = -1
            if rsi_value < 30:
                output["rsi_mean_revert"][index] = 1
            elif rsi_value > 70:
                output["rsi_mean_revert"][index] = -1
        high_20 = prior_extreme(high, index, 20, True)
        low_20 = prior_extreme(low, index, 20, False)
        if high_20 is not None:
            if close[index] > high_20:
                output["breakout"][index] = 1
            elif close[index] < low_20:
                output["breakout"][index] = -1
        if macd_hist[index] > 0 and macd_hist[index - 1] <= 0:
            output["macd"][index] = 1
        elif macd_hist[index] < 0 and macd_hist[index - 1] >= 0:
            output["macd"][index] = -1
    return output


def metrics(returns: list[float]) -> dict[str, float | int]:
    gross_win = sum(value for value in returns if value > 0)
    gross_loss = -sum(value for value in returns if value < 0)
    return {
        "trades": len(returns),
        "expectancy_pct": mean(returns) * 100 if returns else 0.0,
        "median_pct": median(returns) * 100 if returns else 0.0,
        "win_rate_pct": sum(value > 0 for value in returns) / len(returns) * 100 if returns else 0.0,
        "profit_factor": gross_win / gross_loss if gross_loss else (99.0 if gross_win else 0.0),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan causal regime x signal entry diagnostics.")
    parser.add_argument("--input", type=Path, default=Path("src/lib/oracle/data/binance-15m.json"))
    parser.add_argument("--output-dir", type=Path, default=Path("reports/regime-signal-scan"))
    parser.add_argument("--horizon-bars", type=int, default=16, help="Forward holding horizon in 15m bars.")
    parser.add_argument("--roundtrip-cost-bps", type=float, default=8.0, help="Fees and slippage deducted once per trade.")
    parser.add_argument("--train-fraction", type=float, default=0.70)
    parser.add_argument("--min-trades", type=int, default=12)
    args = parser.parse_args()
    if args.horizon_bars < 1 or not 0.5 <= args.train_fraction < 1 or args.min_trades < 1:
        raise SystemExit("Invalid horizon, train fraction, or minimum trades.")

    raw = json.loads(args.input.read_text())
    pairs: dict[str, list[list[float]]] = raw["pairs"]
    bucket: dict[tuple[str, str, str, str], list[float]] = defaultdict(list)
    split_note = "Split is chronological per pair: first train fraction is train, remainder is OOS."
    cost = args.roundtrip_cost_bps / 10_000
    observations = 0
    for symbol, rows in pairs.items():
        high, low, close = [row[2] for row in rows], [row[3] for row in rows], [row[4] for row in rows]
        opens = [row[1] for row in rows]
        regimes = classify_regime(close)
        signals = signal_values(high, low, close)
        split = int(len(rows) * args.train_fraction)
        for index in range(len(rows) - args.horizon_bars - 1):
            regime = regimes[index]
            if regime is None:
                continue
            entry = opens[index + 1]
            exit_price = close[index + args.horizon_bars]
            for signal, values in signals.items():
                direction = values[index]
                if not direction:
                    continue
                side = "long" if direction > 0 else "short"
                raw_return = exit_price / entry - 1 if side == "long" else entry / exit_price - 1
                sample = "train" if index < split else "oos"
                bucket[(signal, side, regime, sample)].append(raw_return - cost)
                observations += 1

    rows_out = []
    recommendations = []
    keys = sorted({key[:3] for key in bucket})
    for signal, side, regime in keys:
        train = metrics(bucket[(signal, side, regime, "train")])
        oos = metrics(bucket[(signal, side, regime, "oos")])
        recommended = (
            train["trades"] >= args.min_trades
            and oos["trades"] >= args.min_trades
            and train["expectancy_pct"] > 0
            and oos["expectancy_pct"] > 0
            and train["profit_factor"] > 1.05
            and oos["profit_factor"] > 1.05
        )
        row = {"signal": signal, "side": side, "regime": regime, "recommended": recommended, **{f"train_{k}": v for k, v in train.items()}, **{f"oos_{k}": v for k, v in oos.items()}}
        rows_out.append(row)
        if recommended:
            recommendations.append(row)
    rows_out.sort(key=lambda row: (not row["recommended"], -float(row["oos_expectancy_pct"]), -int(row["oos_trades"])))

    args.output_dir.mkdir(parents=True, exist_ok=True)
    metadata = {
        "input": str(args.input),
        "pairs": sorted(pairs),
        "horizon_bars": args.horizon_bars,
        "roundtrip_cost_bps": args.roundtrip_cost_bps,
        "train_fraction": args.train_fraction,
        "minimum_trades_per_split": args.min_trades,
        "methodology": "Causal signal at close t, fill at open t+1, fixed-horizon exit at close t+horizon. " + split_note,
        "warning": "This report is an entry diagnostic, not a deployable strategy backtest. It does not optimize exits or model overlapping positions.",
        "recommendations": recommendations,
        "buckets": rows_out,
    }
    (args.output_dir / "report.json").write_text(json.dumps(metadata, indent=2) + "\n")
    with (args.output_dir / "buckets.csv").open("w", newline="\n") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows_out[0]) if rows_out else ["signal"])
        writer.writeheader()
        writer.writerows(rows_out)
    print(f"Scanned {len(pairs)} pairs and {observations} causal signal occurrences.")
    print(f"Wrote {args.output_dir / 'report.json'} and {args.output_dir / 'buckets.csv'}.")
    print(f"Recommended buckets: {len(recommendations)} (gated by train and OOS results).")


if __name__ == "__main__":
    main()
