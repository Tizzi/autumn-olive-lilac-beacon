# Oracle futures shadow probe

## Muc dich

Collector nay ghi nhan forward-only cac quan sat Binance USD-M futures cho core universe `BTC`, `ETH`, `SOL`, `XRP`. Day la paper-research instrumentation, khong dat lenh, khong gui lenh, khong tao khuyen nghi giao dich va khong dung de thay the mot backtest.

No theo doi cung hypothesis da bi reject tren historical train: mark-price basis so voi last-price close. Muc tieu khong phai tim lai threshold tot hon; muc tieu la tao nhat ky thoi gian thuc co the audit de danh gia forward-only sau khi da du mau.

## Protocol khoa

- Universe: Binance USD-M perpetual `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `XRPUSDT`.
- Candle: 5 phut; chi dung candle da dong. Candle cuoi cung trong response Binance bi bo qua.
- Signal: absolute mark-versus-last close basis >= `3`, `5`, hoac `8` bps.
- Direction: mark cao hon last -> hypothetical short; mark thap hon last -> hypothetical long.
- Fill gia dinh: open cua candle ke tiep.
- Exit gia dinh: last-price close sau `3`, `6`, hoac `12` bars.
- Net return proxy: gross return tru fixed `16 bps` round trip. Funding snapshot duoc ghi lai, nhung chua duoc cong vao PnL.
- Khong non-overlap/sizing/capacity: day la event-level measurement, khong phai portfolio simulation.

## Bao dam forward-only

- Script tao signal chi tren candle completed moi nhat ma chinh run do quan sat; khong quet candle cu de backfill.
- Signal duoc append vao JSONL ngay luc duoc quan sat. Fill va exit chi duoc ghi khi candle tuong lai da dong o cac run sau.
- State va event log la append-only trong van hanh binh thuong. Event co deterministic ID de retry khong tao duplicate.
- Moi signal luu timestamp observation, input basis, mark/last/volume, funding snapshot va threshold/horizon chinh xac.

## Van hanh

Chay mot lan sau moi close 5 phut (vi du minute `01, 06, 11, ...` UTC de co buffer API):

```bash
python3 scripts/probe-oracle-futures-shadow.py \
  --state reports/oracle-futures-shadow-probe/state.json \
  --events reports/oracle-futures-shadow-probe/events.jsonl
```

Khong xoa hay sua `events.jsonl` trong luc thu thap. Snapshot dau tien chi co the tao signal; exits can cac run sau. Neu collector bi dung qua lau, cac signal pending khong duoc tu dong backfill; do la chu y de bao toan forward-only integrity va phai duoc ghi nhan nhu mot data gap.

## Tieu chuan danh gia sau thu thap

Khong mo validation/OOS hay tune lai grid dua tren log. Sau mot cua so forward da predeclare (toi thieu 90 ngay va >= 100 evaluated observations cho tung variant neu attainable), danh gia frozen variants theo net return 16 bps, sample count, directional imbalance, funding exposure, latency/gap log va concentration theo pair/time. Ket qua van chi la research evidence; can mo hinh fill, spread, funding payment, capacity va portfolio risk rieng truoc bat ky paper-execution nao.
