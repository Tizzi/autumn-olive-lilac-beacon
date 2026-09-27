# Oracle Desk

Dashboard và workbench nghiên cứu định lượng cho thị trường crypto. Kết hợp backtest trong trình duyệt với dataset Binance 15 phút, walk-forward Train / Validation / OOS, và archive scanner regime × tín hiệu.

> Research-only. Không phải hệ thống giao dịch tự động và không phải khuyến nghị đầu tư.

## Tiếp tục phát triển

Bản này giữ engine gốc và bổ sung:

- Dataset **Sample** (4.800 nến) mặc định để Lab phản hồi nhanh; Train / Validation / OOS tải khi chọn.
- Phí round-trip (mặc định 8 bps notional) nằm trong PnL.
- Bảng universe 10 cặp, walk-forward 3 splits, archive scan, xuất CSV sổ lệnh.
- **Sensitivity sweep** trên Lab: quét một tham số, vẽ PF đóng và max drawdown.
- **Ablation**: tắt lần lượt từng tín hiệu / regime / ECS / exit và đo delta so với cấu hình hiện tại.
- **Lưới phí** 0–24 bps, gồm mức 16 bps dùng trong research futures.
- **Nhật ký thí nghiệm**: ghim snapshot tham số + metric trên máy, so sánh hai thí nghiệm, xuất/nhập JSON.

## Dataset

| Dataset | Khoảng thời gian | Dùng để |
| --- | --- | --- |
| Sample | ~50 ngày gần nhất, 4.800 nến | Chỉnh Lab, xem chart |
| Train | 2024 | Phát triển giả thuyết |
| Validation | 2025 | Kiểm tra trung gian |
| OOS | 2026 đến 2026-09-02 | Đánh giá cuối |

Universe: BTC, ETH, SOL, XRP, DOGE, AVAX, LINK, ADA, DOT, NEAR — cặp `/USDT`.

## Quy tắc

- Tín hiệu tại close `t`, fill tại open `t+1`. Regime 1h chỉ dùng giờ đã đóng.
- Tách PnL lệnh đóng tự nhiên và force-exit hết dữ liệu.
- Autotune, sweep và ablation đều là in-sample. Walk-forward mới là bài kiểm tra overfitting.
- Nhật ký chỉ lưu localStorage; không phải bằng chứng OOS.

Xem `docs/methodology.md` trước khi diễn giải kết quả.
