# 健保降血脂藥品查詢

醫師診間用的健保降血脂藥品與給付規定查詢工具。線上位置:<https://nhi.uic-ai.com/>

一個靜態網站,掛在 Cloudflare Pages。沒有伺服器、沒有 API、沒有資料庫、沒有帳號。所有資料編譯進前端,查詢全部在瀏覽器裡完成——輸入的內容不會送到任何地方,也不會被記錄。

## 可以查什麼

- **藥品**:以健保代碼、中文品名、英文品名或成分查主檔 607 筆品項,含支付價與完整價格沿革(4,048 個價格區間)。
- **2026-09-01 公告異動**:該次公告異動的 187 筆品項,含原支付價與初核價格對照;未列於公告者會明白標示。
- **給付規定原文**:2.6.1–2.6.3 的官方逐字轉錄,共 67 個單元。條文中出現的健保代碼會自動比對主檔,補上藥品辨識資訊。

## 資料來源

| 資料集 | 來源 |
| --- | --- |
| `nhi-drug-items-2026-08-07-r2` | 衛福部中央健保署「健保用藥品項查詢項目檔」(政府資料開放平臺) |
| `nhi-lipid-2026-09-01-r1` | 2026-09-01 公告「藥品已收載品目異動明細表」 |
| `nhi-lipid-rules-structured-2026-09-01-r1` | 藥品給付規定 2.6.1–2.6.3 |

價格全部取自健保署公開資料,不是自行產生的。每份來源的出處與 SHA-256 記在 [`docs/source-register/`](docs/source-register/)。

主檔 607 筆裡有 370 筆目前支付價為 `0.00`——那是該品項最後一段、無結束日的價格區間,且之前都有過真實價格。主檔收錄歷史品項,不是「現行有給付」清單。

## 這不是什麼

不是健保署系統。查詢結果不可作為申報依據,實際規定與價格以健保署公告為準。工具不判斷任何病人是否符合給付,也不接受任何病人資料。

## 開發

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm export:web                      # → apps/clinician/dist
pnpm --filter @nhi-cv/clinician dev  # 本機開發
```

- `packages/domain` — 查詢邏輯與編譯後的資料集
- `apps/clinician` — 介面(Vite + React,零網路呼叫)
- `scripts/*-codegen.mjs` — 健保署更新資料時,從 `data/governed/` 重新產生資料集

改動查詢行為前請看 [CLAUDE.md](CLAUDE.md) 的「Rules that protect correctness」,以及 [CONTRIBUTING.md](CONTRIBUTING.md)。
