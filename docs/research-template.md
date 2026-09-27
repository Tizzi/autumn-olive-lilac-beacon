# [Study ID] - [Ten nghien cuu]

- **Ngay tao:** YYYY-MM-DD
- **Nguoi phu trach:**
- **Trang thai:** `explore`
- **Code version / commit:**
- **Artifact:** `reports/[study-id]/`

## 1. Gia thuyet

Mo ta mot phat bieu co the bi bac bo. Neu gia thuyet dung, metric nao se cai thien, o dieu kien nao, va tai sao co the ton tai co che kinh te/thi truong nay?

## 2. Protocol da dang ky truoc

| Hang muc | Gia tri |
| --- | --- |
| Exchange va market type | |
| Universe | |
| Timeframe / timezone | |
| Dataset va khoang thoi gian | |
| Train / validation / OOS split | |
| Signal timestamp | |
| Fill rule | |
| Exit rule / holding horizon | |
| Fees, spread, slippage, funding | |
| Position sizing / leverage | |
| Metrics chinh | |
| Nguong thanh cong | |
| Stop rule | |

## 3. Kiem tra data

- [ ] Nguon, symbol mapping va market type da xac minh.
- [ ] Kiem tra gap, duplicate va timezone da hoan thanh.
- [ ] Khong co future leakage trong feature, regime, fill hay label.
- [ ] Dataset version/hash da ghi lai.

## 4. Thuc thi

```bash
# Ghi lenh chay day du tai day.
```

- **Inputs:**
- **Outputs:**
- **Tham so dong bang truoc OOS:**

## 5. Ket qua

### Train

| Metric | Ket qua |
| --- | --- |
| Trades | |
| Expectancy | |
| Profit factor | |
| Max drawdown | |
| Net PnL | |

### Validation

| Metric | Ket qua |
| --- | --- |
| Trades | |
| Expectancy | |
| Profit factor | |
| Max drawdown | |
| Net PnL | |

### OOS

| Metric | Ket qua |
| --- | --- |
| Trades | |
| Expectancy | |
| Profit factor | |
| Max drawdown | |
| Net PnL | |

## 6. Robustness va failure modes

- Phan tich theo pair, side, regime va thoi ky:
- Sensitivity cua tham so:
- Anh huong fees/slippage cao hon:
- Closed trades so voi end-of-data/force exit:
- Concentration: top trades, top symbols, top months:
- Rui ro thanh khoan, funding, latency va capacity:

## 7. Ket luan

- **Quyet dinh:** `reject` | `explore` | `validation` | `oos-passed` | `not-deployable`
- **Bang chung chinh:**
- **Gioi han:**
- **Buoc tiep theo:**

## 8. Nhat ky thay doi

| Ngay | Thay doi | Ly do | Tac dong den bang chung |
| --- | --- | --- | --- |
| YYYY-MM-DD | | | |
