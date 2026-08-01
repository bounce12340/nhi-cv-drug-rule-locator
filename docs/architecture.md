# Architecture

## Boundary

`packages/domain` 是唯一的查詢決策點：純函式、不可變示範資料、沒有網路、資料庫、病人狀態或 request state。應用程式與 API 都呼叫它，因此 Web、iOS、Android 與 API 可獲得相同行為。

## Lookup contract

1. 藥碼採 NFKC、trim、uppercase、移除空白與連字號，再以 `^[A-Z0-9]{10}$` 檢查表面格式。
2. 格式合格的藥碼只做精確比對；一碼不同回 `NOT_IN_VALIDATED_DATASET`，不猜測替代碼。
3. 名稱只正規化字元形式、大小寫與重複空白，保留含量與劑型；多筆結果回 `MULTIPLE_MATCHES` 並要求人工覆核。
4. `as_of_date` 無效、日期不在有效期、或 `dataset_version` 不等於已載入版本時，回 `NOT_IN_VALIDATED_DATASET`；不以最新資料代替。
5. `EXACT_MATCH` 只代表資料集內有一筆精確藥品資料，絕不表示病人可獲給付。

## API

Worker 使用 `wrangler.jsonc`、`compatibility_date: 2026-08-01`、`nodejs_compat`。所有路徑都在 request handler 內處理，沒有 global mutable request state。JSON error 包含 code、message、request ID；log 僅寫事件與結果類型，不寫 query 或病人資料。

## Generated environment types

`apps/api/worker-configuration.d.ts` 只能由 `wrangler types` 生成，並被 `.gitignore` 忽略；不手寫 `Env`。`pnpm typecheck` 會先生成它，`pnpm worker:types` 以 `--check` 驗證它未漂移。
