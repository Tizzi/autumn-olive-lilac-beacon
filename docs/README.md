# Tai lieu Oracle

Thu muc nay luu tai lieu va artifact tham chieu cho Oracle, la pham vi duy nhat hien tai cua repository.

## Muc dich

- Mo ta cach Oracle xu ly du lieu, regime, signal, backtest va reports.
- Giu cac artifact co the tai lap va boi canh can thiet de dien giai chung dung cach.
- Ghi nhan thay doi hay ket qua Oracle khi can, khong tao roadmap cho strategy cu hay nghien cuu khac.

## Danh muc

| Tai lieu | Noi dung |
| --- | --- |
| `methodology.md` | Quy tac nhan qua, data splits, chi phi, metrics va tieu chuan dien giai artifact. |
| `research-baseline.md` | Ranh gioi pham vi: Oracle la focus duy nhat; strategy cu da dong. |
| `research-log.md` | Chi muc artifact va thay doi cua Oracle. |
| `research-template.md` | Mau luu tru cho mot thay doi/ket qua Oracle neu can ghi nhan trong tuong lai. |
| `oracle-regime-filter-research-plan.md` | Ke hoach research 4 gate cho regime filter, truoc moi thay doi engine/dashboard. |
| `oracle-hierarchical-regime-research.md` | Protocol slow context cho side bias va fast state cho entry/exit; khong thay doi engine/dashboard. |
| `oracle-futures-5m-core-import.md` | Provenance va validation cho data Binance futures 5m core-4 co volume. |
| `../reports/regime-signal-scan/` | Artifact cua scan regime x signal Oracle hien tai. |
| `../src/lib/oracle/robustness.ts` | Probe in-sample: sweep một tham số, ablation tín hiệu/regime/ECS/exit, lưới phí. |
| `../src/lib/oracle/journal.ts` | Snapshot thí nghiệm trên máy (localStorage); không phải artifact OOS. |
| `../reports/oracle-hierarchical-regime/` | Screening 15m cua hierarchical controller; current price-only proxy bi reject. |
| `../reports/oracle-futures-hierarchical-regime/` | Screening futures 5m voi volume-confirmed fast shock; cac variants hien tai bi reject. |

## Quy uoc luu tru

- Artifact phai nam trong `reports/<artifact-id>/` va duoc lien ket tu `research-log.md` khi co gia tri tham chieu lau dai.
- Commit document, source code va artifact tong hop nho (JSON, CSV) cung nhau khi chung thuoc cung mot thay doi Oracle.
- Khong commit credential, API key, raw exchange export nhay cam, cache, build output hay file qua lon ma khong co ly do va quy trinh versioning ro rang.
- Bao cao phai noi ro du lieu, timeframe, timezone, universe, fees/slippage, quy tac fill va version code.

## Ranh gioi pham vi

Khong co strategy cu dang duoc theo duoi va khong co research roadmap dang mo. Oracle la cong cu nghien cuu va quan sat; artifact cua no khong phai khuyen nghi dau tu hay tin hieu giao dich.
