# Nghien cuu hierarchical regime controller cho Oracle

- **Trang thai:** `explore`; offline only.
- **Pham vi hien tai:** Khong thay doi dashboard, `src/lib/oracle/backtest.ts`, default params, hay live execution.
- **Gia thuyet:** Slow regime chi xac dinh directional context/risk budget. Fast state chi quyet dinh timing entry va bao ve vi the. Fast shock luon co uu tien hon slow context.
- **Gioi han du lieu:** Oracle hien chi co Binance spot OHLCV 15m. Vi vay ket qua nay chi kiem chung prototype o 15m; khong la bang chung cho scalping 1m/3m/5m hoac futures leverage cao.

## 1. Kien truc va quyen han

| Lop | Du lieu/tan suat | Cau hoi | Action duoc phep |
| --- | --- | --- | --- |
| Slow context | Cross-pair, EMA20/EMA100, RSI, ATR, momentum; cap nhat moi 15m | Side nao co duoc uu tien? | `long-biased`, `short-biased`, `neutral/risk-off` |
| Fast entry state | Return, ATR va volume cua pair tai close 15m; sau nay 1m/3m | Co nen kich hoat lenh ke tiep? | `ready`, `shock`, `cooldown` |
| Fast position defense | Cung state fast, quan sat sau khi fill | Co duoc giu lenh? | `hold`, `emergency-exit`, `cooldown` |

Quy tac controller ban dau:

```text
long entry  = slow_context == long_biased  AND consensus_long  AND fast_state == ready
short entry = slow_context == short_biased AND consensus_short AND fast_state == ready

if open_position AND fast_state == shock_adverse_to_side:
    schedule emergency exit at next executable open
    begin cooldown
```

`neutral` va `risk-off` khong duoc coi la short bias. O version dau, chung block entry de tranh them mot mean-reversion branch chua duoc kiem chung. Slow context thay doi khong phai emergency exit; no chi chan re-entry va co the la ly do reduce risk trong mot protocol sau.

## 2. Timing causality va gia dinh thuc thi

- Feature slow va fast tai candle close `t` chi dung OHLCV den `t`.
- Signal Oracle, slow context va fast state duoc tinh tai close `t`; entry duoc fill tai open `t+1`.
- Fast shock sau khi da entry duoc doc tai close candle `u`; emergency exit duoc fill tai open `u+1`, khong phai close/high/low cua `u`.
- Khi khong con candle de fill emergency exit, trade duoc danh dau `end_of_window`, khong tinh nhu mot emergency exit thanh cong.
- OHLC khong cho thu tu gia ben trong candle. MAE dung low/high chi la risk diagnostic, khong phai gia exit co the thuc thi.
- Phai tru round-trip cost trong moi variant. Funding, spread, latency, partial fill va liquidation chua co trong spot data va la dieu kien bat buoc truoc futures/leverage deployment.

## 3. Specification dong bang cho screening dau tien

Day la specification duy nhat duoc phep chay o vong explore dau tien, khong grid search:

| Thanh phan | Dinh nghia |
| --- | --- |
| Slow long/short | `bull`/`bear` tu cross-pair reference regime da co; `chop` block ca hai side |
| Fast shock | Absolute 1-bar return >= 1.5 x ATR(14)% **va** volume >= 1.5 x rolling mean volume 20 bars |
| Fast entry | Block entry neu shock xay ra tai close signal; sau shock block them 2 candles (`cooldown`) |
| Fast exit | Neu shock xay ra theo huong bat loi vi the sau entry, schedule exit tai next open; sau do cooldown 2 candles |
| Evaluation window | 1, 2 va 4 candles 15m sau entry (15m, 30m, 60m) |
| Cost grid | 8, 16, 24 bps round trip |

Nguong tren la gia thuyet screening, khong phai tham so toi uu va khong duoc sua sau khi xem validation/OOS. Neu can thay doi, ghi experiment moi va quay lai train.

Dataset Oracle hien tai chi luu time, open, high, low, close; khong co volume. Vi vay screening dau tien phai ghi ro fast shock la price-only proxy `abs return >= 1.5 x ATR(14)%`, khong duoc im lang bo qua volume condition. Volume-confirmed shock van la specification can kiem chung khi co data phu hop.

## 4. Variants va metric

So sanh tren cung cac Oracle signal hit; moi hit la diagnostic doc lap mot cach co dieu kien, khong phai portfolio backtest:

| Variant | Slow side context | Fast entry | Fast defense |
| --- | --- | --- | --- |
| `baseline` | Khong | Khong | Fixed-window exit |
| `slow_context` | Co | Khong | Fixed-window exit |
| `slow_fast_entry` | Co | Co | Fixed-window exit |
| `slow_fast_defense` | Co | Co | Adverse shock exit next open |

Bao cao theo split, side, pair, signal, horizon va cost:

- Candidate count, retained trades, coverage, expectancy net, median, win rate va PF.
- MAE gross cua moi trade: median, p95 va p99; `tail_loss_rate` tai muc -1%, -2%, -5% gross.
- Emergency exit count, exit rate, time-to-exit, post-exit return (de do premature exit), cooldown blocks va re-entry churn proxy.
- Delta voi baseline cho closed window trades; khong ket luan tu net PnL don le hay overlapping return.

## 5. Gates

### Gate H0 - Data capability va causality

Kiem tra split sync, missing bar, warm-up 100 bars slow / 20 bars fast, va future mutation: them/sua future candle khong duoc thay doi state den `t`. Xac minh fast state tai close `t` va exit tai open `t+1`.

**Pass:** khong leakage, coverage co y nghia, artifacts tai lap. Dataset 15m chi pass cho prototype 15m, khong pass cho claim 1m/3m.

### Gate H1 - Slow context attribution

Kiem chung rieng `bull -> long` va `bear -> short`: expectancy, PF, MAE/tail va sample count so voi baseline. `chop` la reference blocked state, khong phai bang chung cho short.

**Pass:** huong expectation/tail lap lai train va validation, OOS khong dao chieu ro rang; khong phu thuoc mot pair hay mot signal.

### Gate H2 - Fast entry timing

Kiem tra `shock` va `cooldown` co loai bo entry co MAE/tail xau hon baseline hay chi loai winner. Dung horizons 15m/30m/60m va cost grid.

**Pass:** MAE p95/p99 hoac tail-loss rate cai thien tren validation ma expectancy net khong xau di dang ke; OOS chi la evaluation dong bang.

### Gate H3 - Fast position defense

Kiem tra emergency exit next-open voi full window. Phan biet: exit dung, premature exit, gap after shock va `end_of_window`. Khong dung low/high de gia lap exit trong candle.

**Pass:** giam tail loss va drawdown o strategy-level sau nay, khong tao churn phi cao, va closed expectancy sau chi phi khong xau hon baseline.

### Gate H4 - Strategy backtest va robustness

Chi candidate qua H1-H3 moi duoc de xuat implementation offline trong engine. Chay baseline/slow/fast variants bang Oracle engine, bao cao closed trades tach rieng `end_of_data`, exposure, capacity, sizing, DD, concentration va cost sensitivity. Sau do walk-forward, threshold +/-10%, leave-one-pair-out va time-block bootstrap.

**Pass implementation review:** ket qua OOS co closed PF >= 1.05, DD khong tang, tail metrics cai thien, khong concentration bat thuong va mo hinh execution futures duoc thay bang gia dinh thuc te. Pass khong dong nghia live deployment.

## 6. Stop rules va cac dieu khong duoc suy dien

Dung/reject policy neu coverage qua thap, OOS dao chieu, ket qua chi dep o mot pair/thang, improvement bien mat tai 16/24 bps, hoac emergency exit tang churn ma khong giam tail risk.

Khong duoc suy dien tu screening 15m rang controller phu hop scalping leverage cao. Truoc khi dua vao engine, can data 1m/3m (tot nhat futures), spread/slippage, fees/funding, latency va liquidation buffer. Khong dua bat ky bien/setting nao len dashboard truoc Gate H4.
