# TC-20260806-15 建置者自我檢查報告

## 派工與邊界核對

- 派工單 `docs/task-contracts/TC-20260806-15.md` 實測 SHA-256：`4db7cac59272edef82ab76836e03f065d9375b1a65c87c100aae794601a078b6`，與派工值相同。
- 已完整讀取派工單、`CLAUDE.md`、`docs/architecture.md` 五項 deterministic-lookup 不變量，以及 `CLAUDE.md` 指定的治理狀態文件。
- 本次未執行任何 git 指令。
- `data/governed/` 全部既有檔案在實作後與實作前逐位元組相同；四個來源 CSV 的 SHA-256 仍為 manifest 鎖定值。
- 13 個既有測試檔逐位元組不變，原有 155 項測試零修改。
- 正式手寫產物各只寫入一次；generated item 模組只由正式 codegen 首次產生一次。其後兩次冪等重跑均判定內容相同而不寫入。

## 檔案變更清單

| 檔案 | 變更 |
| --- | --- |
| `scripts/items-codegen.mjs` | 新增四 CSV 的 manifest/hash/bytes/schema/row-count fail-closed 驗證、以 `nhi_code` 合併、原字串欄位映射及 deterministic TypeScript 產生器。 |
| `packages/domain/src/generated/items-2026-09-01.ts` | 由 codegen 產生 187 筆 deeply-frozen `DrugItemRecord`，檔頭綁定 dataset digest 與 RDL-019。 |
| `packages/domain/src/item-lookup.ts` | 新增 `lookupDrugItem`，延伸五項 deterministic lookup 不變量、固定 source tag 與逐字警語。 |
| `packages/domain/src/index.ts` | 匯出新的 item lookup 公開介面。 |
| `packages/domain/src/generated-items.test.ts` | 新增生成漂移、四來源保真、manifest/digest、缺值與 freeze 測試。 |
| `packages/domain/src/item-lookup.test.ts` | 新增代碼、名稱/成分、多筆、日期/版本、人工覆核、警語、價格缺值與詞彙黑名單測試。 |
| `packages/contracts/src/index.ts` | 新增 `parseDrugItemLookupRequest`，允許清單恰為 `query`、`as_of_date`、`dataset_version`。 |
| `packages/contracts/src/item-lookup.test.ts` | 新增 transport 正負向測試，明確拒絕 `patient_id`、`diagnosis` 與其他未知欄位。 |
| `apps/api/src/index.ts` | 新增 `POST /v1/items/lookup`、`GET /v1/meta.itemsDataset` 與不含 query 的結構化完成日誌。 |
| `apps/api/src/item-lookup.test.ts` | 新增完整 API 鏈路、拒絕、fail-closed、價格原樣、缺值、metadata 與日誌隱私測試。 |
| `apps/clinician/App.tsx` | 新增第三分頁「藥品品項查詢」、新舊價格並列、缺價固定文字、domain 警語透傳，以及給付規定條號至既有逐字條文查詢的連結。既有兩分頁、強制警語及無病人資料聲明文字未改。 |
| `docs/test-matrix.md` | 加入 item codegen/domain/contracts/API/UI 的 assertion inventory。 |
| `docs/TC-20260806-15-self-check.md` | 本 write-once 自我檢查報告。 |

`pnpm typecheck`、`pnpm export:web` 與 Wrangler 檢查依既有流程刷新原已存在的 ignored/generated 驗證輸出；未新增交付範圍外的產品來源檔。

## 測試數增減

- 實作前：13 個測試檔，155 項，155 passed。
- 實作後：17 個測試檔，193 項，193 passed。
- 增量：4 個測試檔、38 項測試；既有 155 項之檔案 bytes 不變。
- 新增分布：generated items 4、domain item lookup 11、contracts 10、API 13。

## 五項 deterministic-lookup 不變量

| 不變量 | 負向／保護證據 | 結果 |
| --- | --- | --- |
| 代碼只做規定正規化與精確比對 | full-width/空白/連字號正規化正向；一碼不同無更正、無建議 | PASS |
| 名稱保留劑量與劑型，多筆不自選 | 兩個不同含量完整名稱各自單筆；移除含量的部分名稱與重複成分回傳全部且無 selected item | PASS |
| 日期與版本 fail closed | 非法日期、2026-09-01 前日期、錯誤版本皆無 items | PASS |
| 非 EXACT_MATCH 全部人工覆核；EXACT_MATCH 只表資料存在 | multiple、not-in-dataset、日期失敗皆 `manualReviewRequired: true`；輸出無給付結論 | PASS |
| deterministic 行為有負向測試且矩陣同步 | 新增 domain/contracts/API 負向測試並更新 `docs/test-matrix.md` | PASS |

## Codegen 冪等與漂移探針

- 正式 generated 模組：70,390 bytes；SHA-256 `6b80b231f1dacca9bb2ce5551f669bed2f2ae61f7eb7be077cdd66bfc41575a4`。
- 獨立重跑 1：`verified unchanged`，SHA-256 不變。
- 獨立重跑 2：`verified unchanged`，SHA-256 不變。
- `node scripts/items-codegen.mjs --check`：PASS。
- 強制來源 hash mismatch 探針：exit 1，於第一個 CSV 的雙重 hash gate fail closed。
- 漂移紅燈探針在 `scratchpad/tc15-draft` 進行：將 generated header 的 record count 由 187 竄改為 188，再執行 `pnpm exec vitest run packages/domain/src/generated-items.test.ts`；結果 exit 1、2 failed / 2 passed，byte comparison 與 provenance header assertion 均轉紅。
- 漂移探針未修改正式 generated 模組；探針後正式 SHA-256 仍為上述值。

## 六項檢查

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS，exit 0，全部 workspace package typecheck 完成。 |
| `pnpm test` | PASS，17 files / 193 tests passed。 |
| `pnpm export:web` | PASS，exit 0，Expo Web bundle 匯出完成。 |
| `pnpm worker:types` | PASS，exit 0，Worker types up to date。 |
| `pnpm worker:dry-run` | PASS，exit 0，dry-run 完成且未部署。 |
| governance-scan | PASS，exit 0，完整 scoped files 以既有 Set A/Set B regex 掃描無紅線。因派工單絕對禁止任何 git 指令，未直接執行內含 `git fetch`、`git diff`、`git ls-files` 的 `scripts/governance-scan.sh`；改採不呼叫 git 的等價掃描，且掃描完整變更檔內容，比只掃新增行更嚴格。 |

## 收尾

- 正式 generated 模組 `--check` 再驗 PASS。
- 13 個既有測試檔、`data/governed/` 全檔及正式 generated SHA-256 最終再驗均無漂移。
- 本次建立的 `scratchpad/` 草稿與 Wrangler 暫存目錄在正式報告寫入前刪除；scratchpad 之外未留下本次新增的暫存檔。
- 未進行 native iOS/Android runtime 驗證，未宣稱已驗證。

