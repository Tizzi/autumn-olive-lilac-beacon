# Ke hoach nghien cuu toan dien: Oracle regime filter

- **Trang thai:** `planned`
- **Pham vi:** Oracle only; offline research. Khong thay doi dashboard, `src/lib/oracle/backtest.ts`, hay default params trong khi cac gate chua dat.
- **Muc tieu:** Xac minh rang regime filter tao gia tri ngoai mau thong qua cai thien chat luong giao dich va risk profile, khong chi bang cach loai bo nhieu signals.

## 1. Cau hoi can tra loi

1. Regime co on dinh, nhan qua va giai thich duoc cac trang thai thi truong khac nhau tren du lieu Oracle khong?
2. Oracle signals co phan phoi return, win rate, tail loss va drawdown khac biet co y nghia giua cac regime khong?
3. Filter co cai thien baseline o strategy-level sau khi tinh exits, max open trades, sizing va chi phi khong?
4. Cai thien do co lap lai qua train, validation va OOS; co ton tai khi tang chi phi va thay doi nhe tham so khong?
5. Filter co giam drawdown va concentration risk hay chi chon mot vai winner/hay cuoi dataset?

Khong co cau hoi nao duoc thay bang net PnL don le.

## 2. Bat bien va anti-bias

- Du lieu: Binance spot OHLC 15m, 10 cap `/USDT`, cac split immutable trong `src/lib/oracle/data/`.
- Timing: feature/regime/signal chi dung du lieu den close `t`; entry tai open `t+1`; khong dung current incomplete hour hay future candle.
- Baseline: Oracle default params voi `useRegimeFilter: false`; ghi lai full params va code commit trong moi artifact.
- Bai test strategy-level dung engine Oracle hien co; bao cao force exit (`end_of_data`) rieng voi closed trades.
- Khong tune policy tren validation/OOS. Moi thay doi sau khi xem mot split phai quay lai train va duoc ghi thanh experiment moi.
- Khong thay doi dashboard cho den Gate 4.

## 3. Taxonomy regime de kiem tra

Khong chon mot classifier duy nhat ngay tu dau. So sanh cac family co y nghia khac nhau, voi so luong policy da gioi han truoc:

| Family | Bien quan sat | Muc dich |
| --- | --- | --- |
| `oracle-composite` | Oracle 1h trend, volatility rank, momentum, drawdown | Kiem tra regime da ton tai trong engine. |
| `cross-pair-reference` | EMA breadth, cross-pair momentum, ATR%, RSI extremes | Baseline tham chieu tu `MultiPairRegimeStrategy` core regime. |
| `btc-reference` | BTC trend, BTC drawdown, BTC realized volatility | Kiem tra market proxy don gian va de giai thich. |
| `cross-sectional` | Breadth, dispersion va ty le trend cua 10 cap Oracle | Kiem tra regime toan universe thay vi mot pair. |

Moi family ban dau chi duoc phep co ba output action co dinh: `allow`, `reduce`, `block`. `reduce` chi duoc danh gia o strategy-level voi stake multiplier da dang ky truoc; khong duoc tu dong them tham so moi.

## 4. Giai doan va artifact

### Gate 0 - Data va implementation parity

**Muc tieu:** Chung minh regime implementation dung va nhan qua truoc khi doc PnL.

- Kiem tra timestamp alignment, warm-up, missing bars, synchronized universe va per-bar regime coverage.
- Test future-leak: mutate/append future candles khong duoc thay doi regime tai hay truoc `t`.
- Voi `cross-pair-reference`, so sanh bang tay cac thanh phan breadth/momentum/ATR/RSI voi `regime_analyzer.py` tren mot mau candle.
- Artifact: `reports/oracle-regime-filter/00-parity/`.

**Pass:** khong co future leak, regime coverage > 95% sau warm-up, va parity sample dat dung sai so lam tron.

### Gate 1 - Descriptive regime quality

**Muc tieu:** Regime phan tach duoc thi truong truoc khi gan vao signal.

- Bao cao occupancy, transition matrix, dwell time va frequency cua moi regime theo split.
- Tinh forward return 1h, 4h, 12h cua BTC va cross-sectional median sau moi regime; bao cao mean, median, dispersion, adverse tail.
- Kiem tra do ben theo pair va theo nam/quarter; khong chap nhan regime chi xuat hien o mot khoang ngan.
- Artifact: `reports/oracle-regime-filter/01-descriptive/<family>/`.

**Pass:** regime co coverage du, khong flapping bat thuong, va co phan biet forward distribution lap lai tren train/validation. Khong can phai duong; can on dinh va co y nghia mo ta.

### Gate 2 - Signal x regime attribution

**Muc tieu:** Xac dinh filter nao, signal nao, side nao co ly do de kiem tra strategy-level.

- Dung entry diagnostic nhan qua: signal/regime tai close `t`, fill open `t+1`, horizon 4h va them sensitivity 2h/8h.
- Phan tach theo signal, side, pair, regime, split; bao cao trades, coverage, expectancy, median, win rate, PF va bootstrap confidence interval cho expectancy.
- So sanh baseline voi cac policy da dang ky truoc. Bao cao delta va sample size, khong chi bang ranking.
- Khong chap nhan policy duong chi o mot split, chi mot signal, hay sau khi coverage giam manh ma khong co ly do.
- Artifact: `reports/oracle-regime-filter/02-signal-attribution/<family>/`.

**Pass:** co it nhat mot policy co expectation/PF tot hon baseline tren train va validation, sample du, va khong xau hon dang ke tren OOS. Ket qua phai giu huong khi horizon thay doi 2h -> 8h.

### Gate 3 - Strategy-level backtest

**Muc tieu:** Kiem tra gia tri sau khi co exits, capacity va equity path.

Chi cac candidate pass Gate 2 moi duoc chay. Chay cac variant da dang ky truoc:

| Variant | Entry | Position size | Exit |
| --- | --- | --- | --- |
| Baseline | Khong filter | Default Oracle | Default Oracle |
| Block | Chan entry theo regime | Default Oracle | Default Oracle |
| Reduce | Khong chan entry theo regime | Multiplier co dinh theo regime | Default Oracle |
| Block + reduce | Chan/reduce da dang ky truoc | Multiplier co dinh | Default Oracle |

- Dung mot candidate o mot thoi diem; khong grid-search thresholds trong engine.
- Bao cao all trades va closed-trades-only rieng; tach `end_of_data`, long/short, pair, exit reason va entry regime.
- Bao cao net PnL, PF, closed PF, max drawdown, ulcer/drawdown duration neu co, Sharpe, exposure, turnover, trade count, concentration top 5 trades/pairs/thang.
- Artifact: `reports/oracle-regime-filter/03-strategy-backtest/<candidate>/`.

**Pass:** closed PF va closed expectancy khong xau hon baseline tren train/validation/OOS; max drawdown giam co y nghia; ket qua khong phu thuoc vao `end_of_data` hay it trade.

### Gate 4 - Robustness va decision

**Muc tieu:** Thu nghiem co chiu duoc sai so thuc thi va thay doi nhe hay khong.

- Cost sensitivity: 8, 16, 24 bps round trip.
- Parameter sensitivity: threshold xung quanh gia tri da dang ky truoc, toi da +/- 10%; khong chon lai threshold dua tren OOS.
- Walk-forward: chon tren train, xac nhan validation, danh gia OOS; neu co du du lieu, dung rolling folds trong train+validation.
- Universe sensitivity: full 10 pair, BTC/ETH-only, va leave-one-pair-out; muc dich la phat hien concentration, khong chon universe dep nhat.
- Bootstrap theo trade blocks hoac time blocks de tranh xem cac trade overlap la doc lap.
- Artifact: `reports/oracle-regime-filter/04-robustness/<candidate>/`.

**Pass de xem xet implementation:** huong cai thien giu qua OOS va cost sensitivity, closed PF >= 1.05 tren OOS, drawdown khong tang, khong concentration bat thuong, va co ly do kinh te/market microstructure ro rang. Day chi la gate de mo mot implementation review, khong phai phe duyet live trading.

## 5. Thu tu thuc hien

1. Hoan thanh Gate 0 cho `oracle-composite` va `cross-pair-reference`.
2. Chay Gate 1 tren train/validation; neu quality khong on dinh thi dung family do.
3. Chay Gate 2 voi policy co dinh tren hai family con lai neu can.
4. Chon toi da mot candidate pass Gate 2 de vao Gate 3.
5. Chi chay Gate 4 neu Gate 3 pass tren ca ba split.
6. Chi sau Gate 4 moi viet proposal rieng de sua engine; dashboard van la buoc sau cung.

## 6. Quy tac dung va rejection

Dung ngay family/policy khi co mot trong cac dieu kien sau:

- Future leakage, alignment sai, warm-up khong du, hoac parity implementation fail.
- Expectancy/PF xau tren train va validation, hoac OOS dao chieu ro rang.
- Coverage qua thap de ket luan, hoac ket qua bi chi phoi boi mot pair/thang/vai trade.
- Cai thien chi xuat hien khi bo qua chi phi, `end_of_data`, hay khi dung compounding.
- Drawdown/xung dot capacity tang trong khi PnL cai thien nhe.

Ket qua reject la artifact hop le va phai duoc ghi vao `docs/research-log.md`.

## 7. Ket qua hien tai

`cross-pair-reference` da hoan thanh mot screening o Gate 2 voi policy don gian, va bi `rejected-for-dashboard`: baseline va cac policy deu khong cho edge OOS ben vung sau 8 bps chi phi. Ket qua nay khong loai bo toan bo research plan; no loai bo viec dua policy reference hien tai vao Oracle.
