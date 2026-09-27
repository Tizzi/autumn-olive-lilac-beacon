# Oracle regime-filter experiment

- **Trang thai:** `rejected-for-dashboard`
- **Pham vi:** offline experiment; khong thay doi dashboard hay Oracle backtest engine.
- **Reference:** `C:\backup\VulcanTrader\user_data\strategies\MultiPairRegimeStrategy\custom_modules\regime_analyzer.py`.

## Muc tieu

Kiem tra xem cross-pair market regime theo reference co cai thien fixed-horizon entry diagnostic cua cac Oracle signals hay chi giam so luong tin hieu.

## Regime duoc tai tao

Phan regime core cua reference duoc tai tao tu Oracle synchronized OHLC 15m:

- Breadth: ty le cap co EMA20 > EMA100.
- Momentum: trung binh return 12 nen cua cac cap.
- Volatility: trung binh ATR(14) / close.
- RSI extreme: do lech ty le RSI < 25 va RSI > 75.
- Composite weights: breadth 0.25, momentum 0.45, volatility 0.15, RSI extreme 0.15.
- Classification: `bull >= 0.25`, `bear <= -0.25`, con lai `chop`.
- Guards: breadth, exhaustion va deterioration tu `regime_analyzer.py`.

Volume-dependent entry rules, custom exits, stoploss, position sizing, portfolio stress guard va DB/live regime cua strategy reference khong duoc copy vao Oracle experiment.

## Protocol da dong bang

- Oracle signals: `ema_cross`, `ema_trend_rsi`, `rsi_mean_revert`, `breakout`, `macd`.
- Signal va regime duoc quan sat tai close `t`.
- Fill tai open `t+1`; fixed-horizon exit tai close `t+16` (4 gio).
- Round-trip cost: 8 bps.
- Chay doc lap tren train, validation va OOS; khong tune policy sau khi xem validation/OOS.
- Ket qua la entry diagnostic co trade overlap, khong phai equity curve hay strategy backtest.

## Policies

| Policy | Long cho phep | Short cho phep |
| --- | --- | --- |
| `baseline` | bull, chop, bear | bull, chop, bear |
| `reference_entry_gate` | bull, chop | bear, chop |
| `bull_long_only` | bull | bull, chop, bear |
| `bear_short_only` | bull, chop, bear | bear |
| `trend_aligned_only` | bull | bear |
| `chop_only` | chop | chop |

## Tieu chuan dien giai

Mot policy chi duoc xem la ung vien de kiem tra strategy-level neu no co cai thien so voi baseline tren train va validation, khong suy giam bat thuong tren OOS, va coverage/sample size van du de co y nghia. Profit factor, expectancy, median return va coverage phai duoc doc cung nhau.

Artifact duoc luu tai `reports/oracle-regime-filter/{train,validation,oos}/`.

## Ket qua (2026-09-16)

| Policy | Train expectancy / PF | Validation expectancy / PF | OOS expectancy / PF | Ket luan |
| --- | --- | --- | --- | --- |
| `baseline` | -0.063% / 0.913 | -0.063% / 0.909 | -0.084% / 0.854 | Am tren ca ba split. |
| `reference_entry_gate` | -0.079% / 0.889 | -0.045% / 0.933 | -0.093% / 0.840 | Khong cai thien ben vung. |
| `bull_long_only` | -0.093% / 0.873 | -0.025% / 0.964 | -0.090% / 0.846 | Validation tot hon baseline, nhung fail train/OOS. |
| `bear_short_only` | -0.058% / 0.924 | -0.074% / 0.898 | -0.079% / 0.863 | Khong cai thien ben vung. |
| `trend_aligned_only` | -0.131% / 0.851 | +0.009% / 1.012 | -0.084% / 0.861 | Validation duong rat nhe nhung khong tai lap; coverage 16.9-19.7%. |
| `chop_only` | -0.063% / 0.905 | -0.061% / 0.905 | -0.096% / 0.834 | Khong cai thien. |

## Quyet dinh

Khong dua bat ky policy nao vao dashboard hay Oracle backtest engine. Reference-style cross-pair regime core khong tao ra cai thien OOS ben vung cho Oracle fixed-horizon signal diagnostic voi 8 bps round-trip cost. Artifact day du nam tai `reports/oracle-regime-filter/`.
