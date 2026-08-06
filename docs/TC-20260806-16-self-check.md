# TC-20260806-16 建置者自我檢查報告

## 派工與邊界核對

- 派工單 `docs/task-contracts/TC-20260806-16.md` 實測 SHA-256：`1603f6376236a03985dee77063052df483a3c8c1020a61b0507f832c8dfebc85`，與指定值相同。
- 已完整讀取派工單、`CLAUDE.md`、`docs/phase1-intake-runbook.md` Stage 3、`scripts/stage3-verify.mjs`、`docs/stage3/` 既有七份報告，以及 `CLAUDE.md` 指定的治理狀態文件。
- 本次未執行任何 git 指令，亦未執行內含 git 呼叫的 `scripts/governance-scan.sh`。
- 未對 `data/governed/` 執行任何寫入；收尾以任務開始時間為界檢查，較該時間新的 governed 檔案數為 0。
- 未修改 `packages/domain/src/generated/` 或任何既有測試檔。
- 正式子集只以 `wx` 建立一次；後續全部以唯讀 `--check` 重跑，正式子集 SHA-256 與 mtime 均未改變。
- 寫入順序符合中斷韌性要求：先建立 `scratchpad/` 正式子集，再新增 Stage 3 報告。

## 檔案變更清單

| 檔案 | 變更 |
| --- | --- |
| `scripts/drug-item-subset-derive.mjs` | 新增來源 hash/schema/row-count fail-closed 閘門、逐 token 精確篩選、write-once 輸出、`--check`、`--force-hash-mismatch`、統計與往返複驗。 |
| `scripts/__tests__/drug-item-subset-derive.test.mjs` | 新增 8 項完全合成 fixture 測試，含近似章節負向案例與 hash mismatch 零輸出。 |
| `vitest.config.ts` | 僅新增 `scripts/__tests__/**/*.test.mjs` 測試 include；既有 include 不變。 |
| `scratchpad/intake-23715/subset-lipid.csv` | gitignored write-once 正式子集；4,047 資料列、1,843,720 bytes。 |
| `docs/stage3/drug-item-subset-report.md` | 新增只含雜湊、計數、欄位名、章節 token 樣態與布林結果的 Stage 3 報告。 |
| `docs/TC-20260806-16-self-check.md` | 本建置者自我檢查報告。 |

`pnpm export:web` 依既有流程刷新 gitignored 的 Web export；typecheck 依既有流程處理 ignored/generated Worker 型別。兩者皆非本派工交付內容。

## 測試數增減

- 實作前：17 個測試檔，193 項，193 passed。
- 實作後：18 個測試檔，201 項，201 passed。
- 增量：1 個測試檔、8 項測試。
- 既有 17 個測試檔與原有 193 項測試零修改。

新增 8 項逐一覆蓋：單一精確 token、多值精確 token、`8.2.6.1.` 排除、三種相同數字序列章節排除、相鄰章節排除、空值排除、token 前後空白 trim，以及來源 hash mismatch fail closed/零輸出。關鍵負向案例中，`8.2.6.1.` 明確證明子字串法會命中而精確 token 法排除。

## 推導結果與兩次重跑

| 項目 | 結果 |
| --- | --- |
| 來源 SHA-256 | `d41cf7bf91ca1d6997ac751601548f68226a8326452aa5d8befd725e3a8d0158` |
| 來源結構 | 96,843,587 bytes／224,553 資料列／20 欄／UTF-8 BOM |
| 子集 SHA-256 | `e4783015aa0e84be62a9a27eff3dd6090f5019786771d389bc4498bc52b6e9f5` |
| 子集結構 | 1,843,720 bytes／4,047 資料列／20 欄／LF／無 BOM |
| 相異代號數 | 606 |
| 精確法與子字串法差額 | 231 |
| 往返反例數 | 0 |

| 重跑 | 模式 | 推導輸出 SHA-256 | 與正式產物逐位元相同 |
| --- | --- | --- | --- |
| 1 | `--check` | `e4783015aa0e84be62a9a27eff3dd6090f5019786771d389bc4498bc52b6e9f5` | true |
| 2 | `--check` | `e4783015aa0e84be62a9a27eff3dd6090f5019786771d389bc4498bc52b6e9f5` | true |

收尾另做一次唯讀 `--check`，SHA-256 仍相同、資料列仍為 4,047、往返反例仍為 0。

## `--force-hash-mismatch` 探針與殘留

正式產物建立後執行探針，並於前後量測正式產物及建置目錄。

| 檢查 | 結果 |
| --- | --- |
| 退出碼 | 1 |
| stdout 位元組數 | 0 |
| stderr 安全錯誤碼 | `hash_mismatch` |
| 正式產物 SHA-256 未改變 | true |
| 正式產物 mtime 未改變 | true |
| `scratchpad/intake-23715/` 檔案數前／後 | 2／2 |
| 探針新增殘留檔案 | 0 |
| 測試／Wrangler 一次性 `/tmp` 目錄殘留 | 0 |
| 結論 | PASS |

## 報告資料值與路徑限制檢查

- 以 4,047 列正式子集的代號、英文/中文品名、成分、藥商及製造廠值逐值交叉掃描 Stage 3 報告：命中 0。
- 含小數點的實際價格值逐值交叉掃描報告：命中 0；報告模板只輸出欄位空值計數，未輸出價格欄內容。
- Stage 3 報告只含 metadata；腳本 stdout 也只含雜湊、計數、欄位名、章節樣態與布林結果。
- 正式來源與子集位元組只存在 `scratchpad/intake-23715/`；該目錄收尾恰有來源與子集 2 檔。
- `data/governed/`、`packages/domain/src/generated/` 均無本派工產物。

## 五項檢查

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS，exit 0，全部 workspace typecheck 完成。 |
| `pnpm test` | PASS，18 files／201 tests passed。 |
| `pnpm export:web` | PASS，exit 0，Web bundle 匯出完成。 |
| `pnpm worker:types` | PASS，exit 0，Worker types up to date。 |
| `pnpm worker:dry-run` | PASS，exit 0，dry-run 完成且未部署。 |

Wrangler 首次沿預設路徑嘗試寫 `/root/.config` 診斷 log 時遇到唯讀檔案系統；該次不列為乾淨驗收結果。其後使用 `/tmp` 內一次性可寫 XDG 設定目錄重跑兩項，均無 EROFS、exit 0；一次性目錄已移除。

## 總結

| 驗收項目 | 結果 |
| --- | --- |
| 逐 token 精確比對與關鍵負向測試 | PASS |
| 既有 193 項測試零修改 | PASS |
| write-once、兩次重跑一致 | PASS |
| force-hash-mismatch fail closed、零寫入、零殘留 | PASS |
| 五項專案檢查 | PASS |
| 路徑與 metadata-only 邊界 | PASS |

本報告為建置者自我檢查，不取代派發方／驗收方的獨立覆核與 RA 後續裁決。
