# Oracle log

Chi muc nay luu cac thay doi va artifact quan trong cua Oracle. Khong co strategy cu nao dang duoc theo duoi va khong co research roadmap dang mo.

| Ngay | Pham vi | Trang thai | Ghi chu | Tai lieu / artifact |
| --- | --- | --- | --- | --- |
| 2026-09-16 | Oracle regime x signal scanner | `recorded` | Artifact nhan qua tren Binance 15m duoc luu de tai lap va tham chieu trong Oracle; khong phai strategy deployable. | `../reports/regime-signal-scan/` |
| 2026-09-16 | Oracle reference-style regime filter | `rejected-for-dashboard` | MultiPairRegimeStrategy regime core khong cai thien ben vung tren train/validation/OOS; khong thay doi dashboard hay engine. | `oracle-regime-filter-experiment.md`, `../reports/oracle-regime-filter/` |
| 2026-09-16 | Oracle comprehensive regime-filter plan | `planned` | Protocol 4 gate: parity, descriptive quality, signal attribution, strategy-level robustness. Dashboard/engine giu nguyen cho den Gate 4. | `oracle-regime-filter-research-plan.md` |
| 2026-09-16 | Oracle hierarchical slow/fast regime prototype | `rejected-for-current-proxy` | Slow context side bias va fast price-only 15m shock/cooldown khong cai thien expectancy/PF qua train, validation va OOS. Khong thay doi engine/dashboard. | `oracle-hierarchical-regime-research.md`, `../reports/oracle-hierarchical-regime/` |
| 2026-09-16 | Oracle Binance futures 5m core import | `imported` | Core-4 synchronized Binance USDT-margined futures OHLCV with volume, provenance and gap policy recorded. Data-only; no dashboard/engine change. | `oracle-futures-5m-core-import.md`, `../src/lib/oracle/data/binance-futures-5m-core.json` |
| 2026-09-16 | Oracle futures hierarchical controller | `rejected-for-implementation` | Frozen 15m slow context plus 5m volume-confirmed shock/cooldown did not hold edge across train, validation, OOS, horizons and cost grid. No engine/dashboard change. | `../reports/oracle-futures-hierarchical-regime/` |
| 2026-09-16 | Oracle futures 100-variant entry screen | `rejected-at-train-screen` | Predeclared 5 x 5 x 4 causal filter grid yielded 0/100 variants passing positive expectancy and PF > 1 at 16 bps on train; validation/OOS intentionally not read. No engine/dashboard change. | `../reports/oracle-futures-100-variants/` |
| 2026-09-16 | Oracle futures relative-strength paired screen | `rejected-at-train-screen` | Independent strongest-long/weakest-short 15m rank screen yielded 0/24 variants passing at 16 bps per leg; paired four-leg costs and non-overlap modeled; validation/OOS intentionally not read. No engine/dashboard change. | `../reports/oracle-futures-relative-strength/` |
| 2026-09-16 | Oracle futures auxiliary data import | `imported` | Binance public mark-price 5m and funding-rate history imported for synchronized core-4; mark timestamps exactly match 61,113 core bars per symbol. Open interest, liquidation history, and historical order-book remain unavailable in the public source. | `oracle-futures-auxiliary-import.md`, `../src/lib/oracle/data/binance-futures-auxiliary.json` |
| 2026-09-16 | Oracle futures funding-extreme reversion screen | `rejected-at-train-screen` | Causal post-publication funding-extreme reversal grid yielded 0/9 candidates at 16 bps; best adequately sampled variant remained negative. Validation/OOS intentionally not read. No engine/dashboard change. | `../reports/oracle-futures-funding-reversion/` |
| 2026-09-16 | Oracle futures mark-vs-last basis reversion screen | `rejected-at-train-screen` | Causal 5m mark-price basis convergence grid yielded 0/9 candidates at 16 bps; best high-sample variant remained negative. Validation/OOS intentionally not read. No engine/dashboard change. | `../reports/oracle-futures-basis-reversion/` |
| 2026-09-16 | Oracle futures forward-only shadow probe | `instrumentation-ready` | Append-only real-time observation protocol records completed 5m mark/last basis, funding snapshots, and hypothetical next-open fills/exits. It does not trade, backfill, tune variants, or promote a strategy. | `oracle-futures-shadow-probe.md`, `../scripts/probe-oracle-futures-shadow.py` |
| 2026-09-28 | Oracle Desk robustness + journal | `recorded` | Sensitivity sweep, signal/regime/ECS/exit ablation, lưới phí 0–24 bps, và nhật ký thí nghiệm localStorage. Không đổi default params, fill rule, hay kết luận research đã reject. | `../src/lib/oracle/robustness.ts`, `../src/lib/oracle/journal.ts` |

## Trang thai

Oracle la focus duy nhat hien tai. Xem `research-baseline.md` de biet ranh gioi pham vi va `methodology.md` de hieu cach dien giai cac artifact da luu.
