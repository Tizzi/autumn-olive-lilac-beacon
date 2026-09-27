# Phuong phap nghien cuu

## Nguyen tac

Oracle phan biet ba lop bang chung:

1. **Entry diagnostic**: do return sau mot horizon co dinh sau khi signal xuat hien.
2. **Strategy backtest**: them exit, sizing, gioi han vi the, chi phi va equity path.
3. **Deployability assessment**: them do ben qua split, thanh khoan, latency, operational risk va gioi han drawdown.

Ket qua o lop 1 khong du de ket luan lop 2 hoac 3.

## Tinh nhan qua va thoi diem thuc thi

Moi quan sat phai co timeline ro rang. Chuan hien tai cua `scan-regime-signals.py` la:

- Signal va regime chi dung OHLC duoc biet tai close cua nen `t`.
- Lenh duoc fill tai open cua nen `t+1`.
- Return duoc do tai close cua nen `t + horizon`.
- Chi phi round-trip duoc tru mot lan vao return cua moi giao dich.

Khong duoc dung high, low, close hay indicator cua nen tuong lai de quyet dinh signal, regime, gia fill hoac tham so. Neu data co timestamp khac, phai ghi ro quy uoc timestamp va thoi diem du lieu co san.

## Data governance

- Ghi ro exchange, spot/futures, symbol convention, timeframe, timezone va nguon data.
- Xac minh nen tang lien tuc, duplicate, missing bar va corporate/exchange event co lien quan.
- Giua nguyen raw dataset va tao dataset da xu ly bang script co the tai lap.
- Neu universe duoc chon dua tren hieu nang qua khu, danh dau selection bias va kiem tra universe rong hon.

Dataset trong repo hien tai la Binance spot OHLC 15m cua 10 cap `/USDT`; chi duoc dung trong pham vi mo ta tai `README.md`.

## Train, validation va OOS

Chia du lieu theo thoi gian, khong random shuffle:

- **Train**: xay dung gia thuyet va chon khong gian tham so.
- **Validation**: chon mot cau hinh da duoc gioi han truoc; moi lan thay doi sau khi xem validation phai duoc ghi la mot lan tune moi.
- **OOS**: danh gia cuoi. Dong bang code, universe, tham so va metric truoc khi xem OOS.

Neu OOS bi dung de sua tham so, no khong con la OOS. Tao mot holdout moi hoac ha cap bang chung xuong validation/exploration.

## Chi phi va thuc thi

Moi strategy backtest phai ghi:

- Fee maker/taker, slippage, spread va funding (neu futures).
- Gia fill: next open, VWAP, limit fill hay quy tac khac.
- Latency, partial fill, liquidity/capacity va gioi han so vi the.
- Leverage, liquidation buffer, position sizing va cross/isolated margin.

Gia dinh 8 bps trong scanner chi la gia dinh nghien cuu ban dau, khong thay the mo hinh thuc thi cho mot exchange cu the.

## Metrics va tieu chuan

Bao cao toi thieu:

- So luong giao dich, expectancy, median return, win rate, profit factor.
- Net PnL, max drawdown, exposure, duration, long/short breakdown.
- Closed-trades-only metrics rieng voi cac lenh `end_of_data`/force exit.
- Ket qua theo split, pair, side, regime va giai doan thi truong.

Muc tieu huong dan hien tai la Profit Factor > 1.5 va max drawdown < 20%, nhung khong phai quy tac deploy tu dong. Can danh gia them sample size, do ben, chi phi va rui ro tail.

## Chong overfitting

- Dinh nghia gia thuyet va stop rule truoc khi chay.
- Giu so tham so va so lan thu nghiem thap; ghi lai toan bo trials quan trong.
- Uu tien sensitivity analysis, walk-forward va nhieu regime hon la toi uu mot PnL duy nhat.
- Kiem tra su phu thuoc vao mot vai trade, symbol, thang, force exit hay compounding.
- Bao cao ket qua am tinh va ket qua khong on dinh.

## Trang thai quyet dinh

| Trang thai | Y nghia |
| --- | --- |
| `explore` | Gia thuyet moi, chua du bang chung. |
| `reject` | Khong dat tieu chuan; luu nguyen nhan. |
| `validation` | Qua sang loc train, dang kiem tra validation. |
| `oos-passed` | Da qua OOS theo protocol da dong bang; chua dong nghia deployable. |
| `not-deployable` | Co the co edge, nhung chua dat yeu cau rui ro/thuc thi. |
