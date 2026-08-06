# TC-20260806-17 建置者自我檢查報告

## 派工與邊界核對

- 派工單 `docs/task-contracts/TC-20260806-17.md` 實測 SHA-256：`2cc491967eb6ed9fb1e8fd97599aed0fb0e01cb685a6c17eedf33e15d9da923b`，與指定值完全相同。
- 已完整讀取派工單、`CLAUDE.md`、`docs/architecture.md` 五項 deterministic-lookup 不變量，以及 `CLAUDE.md` 指定的治理狀態文件。
- 本次未執行任何 git 指令，亦未執行內含 git 呼叫的 `scripts/governance-scan.sh`。
- `data/governed/` 全檔在實作前後逐檔 SHA-256 相同；`drug-items-lipid.csv` 仍為 `e4783015aa0e84be62a9a27eff3dd6090f5019786771d389bc4498bc52b6e9f5`、1,843,720 bytes。
- 18 個既有測試檔逐檔 SHA-256 與實作前相同，原有 201 項測試零修改。
- 既有 generated items/rules 模組分別通過 `items-codegen --check` 與 `rules-codegen --check`，其 SHA-256 仍為 `6b80b231f1dacca9bb2ce5551f669bed2f2ae61f7eb7be077cdd66bfc41575a4`、`d13e025b028b62fe9036f61dab5dc8c7d83e092bf92a232df35e6c521a420b1c`。
- 新 generated module 只由正式 codegen 建立一次；其後兩次重跑均判定內容相同而不寫入，mtime 未變。所有產品產物先定稿，本報告最後以 write-once 新增。

## 檔案變更清單

| 檔案 | 變更 |
| --- | --- |
| `scripts/drug-items-codegen.mjs` | 新增 manifest/hash/bytes/20 欄欄名與欄序/4,047 列/606 組 fail-closed 閘門、同代號非期別欄位無損複驗、民國日期轉 ISO、十欄共用字串表、價格沿革排序、write-once 產生與唯讀檢查。 |
| `packages/domain/src/generated/drug-items-2026-08-06.ts` | codegen 生成 606 筆主檔及 4,047 個完整價格期別；檔頭綁定 dataset digest、RDL-021、計數與兩 URL 欄捨去理由。 |
| `packages/domain/src/drug-item-lookup.ts` | 新增 `lookupDrugItemMaster` 與嚴格區間選取；代碼、名稱、日期、版本、人工覆核與來源警語皆 fail closed。 |
| `packages/domain/src/index.ts` | 匯出 drug-item master lookup 公開介面。 |
| `packages/domain/src/generated-drug-items.test.ts` | 新增漂移、來源保真、分組前提、URL 分組驗證、民國日期、freeze、provenance、體積與 hash mismatch 測試。 |
| `packages/domain/src/drug-item-lookup.test.ts` | 新增代碼／名稱／成分、多筆、區間、首期前、有限尾端後、空隙、日期／版本、警語與禁語測試。 |
| `packages/contracts/src/index.ts` | 新增 `parseDrugItemMasterLookupRequest`，允許清單恰為 `query`、`as_of_date`、`dataset_version`。 |
| `packages/contracts/src/drug-item-master-lookup.test.ts` | 新增 transport 正負向測試，明確拒絕 `patient_id`、`diagnosis` 與其他未知欄位。 |
| `apps/api/src/index.ts` | 新增 `POST /v1/drug-items/lookup`、`GET /v1/meta.drugItemsDataset` 與不含 query 的完成日誌。 |
| `apps/api/src/drug-item-master-lookup.test.ts` | 新增完整 API 鏈路、原字串透傳、拒絕、日期／版本 fail-closed、metadata 與日誌隱私測試。 |
| `apps/clinician/App.tsx` | 新增第四且預設分頁「藥品查詢(中文品名)」、指定主檔欄位、適用支付價與有效期間、完整價格沿革、規則連結，以及嚴格分區的 2026-09-01 公告異動明細。既有三分頁文字、各警語透傳及無病人資料聲明逐字不改。 |
| `apps/clinician/src/drug-item-master-ui.test.ts` | 新增預設分頁、必要欄位、完整沿革、跨資料集分區與無價格評價語的 UI source assertions。 |
| `docs/test-matrix.md` | 同步加入 drug-item master codegen/domain/contracts/API/UI assertion inventory。 |
| `docs/TC-20260806-17-self-check.md` | 本 write-once 建置者自我檢查報告。 |

`pnpm typecheck` 依既有流程刷新 ignored/generated Worker 型別，`pnpm export:web` 刷新 `apps/clinician/dist/`；兩者不是本派工新增的產品來源檔。

## 測試數增減

- 實作前：18 個測試檔，201 項，201 passed。
- 實作後：23 個測試檔，248 項，248 passed。
- 增量：5 個測試檔、47 項測試；既有 18 個測試檔／201 項測試 bytes 不變。
- 新增分布：generated drug-items 8、domain lookup 10、contracts 13、API 12、clinician UI 4。

## Codegen、體積與重跑

| 項目 | 結果 |
| --- | --- |
| 來源資料 | 1,843,720 bytes／4,047 列／20 欄／606 相異代號 |
| Dataset digest | `de376fec6c11203fe030389e37663b715ada502259dcd2b041020c88d996970f` |
| 生成模組 | 317,407 bytes（預算 ≤ 1,200,000 bytes，PASS） |
| 生成模組 SHA-256 | `858dadb8209b95203ccc844ffac649148b8dce89aa8514b7e63ea45e9f56de11` |
| 獨立重跑 1 | `verified unchanged`；SHA-256 同上；mtime `1785996191` 未變 |
| 獨立重跑 2 | `verified unchanged`；SHA-256 同上；mtime `1785996191` 未變 |
| 最終 `--check` | PASS，317,407 bytes |

同代號分組複驗涵蓋所有非期別欄位，包括最後不輸出的兩個 URL 欄；只將 `異動`、`支付價`、`有效起日`、`有效迄日` 視為逐期欄位。十個指定低基數欄位各自複驗相異值不超過 145，再以共用字串表索引。所有 4,047 個期別皆保留原始支付價／起日／迄日字串及兩個 ISO 日期，並依 ISO 起日升序排列。

## Web bundle 增量

量測對象皆為乾淨執行 `pnpm export:web` 後唯一的 `apps/clinician/dist/_expo/static/js/web/AppEntry-*.js`：

| 狀態 | Bytes | SHA-256 |
| --- | ---: | --- |
| 實作前 | 459,128 | `3d6b872dee9478509ab6fe4309bc60a19f1cfdba02084df2ee852624baaa7af3` |
| 實作後 | 808,586 | `fccb2f2618b84dea30151cc1978a40317378d53c600590f36ceb84aa0845db64` |
| 實際增量 | **+349,458** | — |

Worker dry-run 同時量得 Total Upload 501.70 KiB／gzip 65.69 KiB，僅 dry-run，未部署。

## 各探針結果

| 探針 | 結果 |
| --- | --- |
| 生成檔漂移 | 在 `scratchpad/tc17/preflight.ts` 將 header record count 606 竄改為 607，以 `DRUG_ITEMS_GENERATED_PATH` 指向該副本執行漂移測試；exit 1、1 failed／7 passed，逐位元比較轉紅。正式 generated SHA-256 前後皆為 `858dad…de11`。PASS。 |
| 強制 source hash mismatch | `--force-hash-mismatch --output=scratchpad/tc17/hash-mismatch-probe.ts`；exit 1，於雙重 SHA-256 gate fail closed，目標檔不存在，正式 generated SHA-256 未變。PASS。 |
| 分組前提複驗 | 合成兩列同代號 fixture，令 `成分` 不同；codegen 丟出 `rows 2 and 3 differ in non-price field 成分`，只含列號、不含代號值。另令將被捨去的 URL 欄不同亦 fail closed。PASS。 |
| 民國日期 | `  991231 → 2010-12-31`、`1000101 → 2011-01-01`、月末 `1130229 → 2024-02-29`、哨兵 `9991231 → 9999-12-31`；非閏年 2/29 轉紅。PASS。 |
| as-of 首期前 | 以真實代號查詢其首期前一日，回 `NOT_IN_VALIDATED_DATASET`、空 matches、`manualReviewRequired: true`，未回退。PASS。 |
| as-of 有限尾端後 | 合成只有非哨兵尾期的沿革，尾日後一日不命中，未回退至最後一期。PASS。 |
| as-of 期別空隙 | Governed 資料的同代號相鄰期別無空隙；另以合成兩期建立空隙，空隙內不命中，第二期首日才命中。PASS。 |
| API 日誌 | query marker 未出現在序列化 log；完成日誌 key 恰為 timestamp/service/event/request_id/lookup_status/match_count。PASS。 |
| 跨資料集分區 | 主檔 606 代號與公告異動鏈路 187 代號中有 186 個精確代號交集；UI 僅在另一個具來源標題、版本與自身警語的區塊顯示公告原支付價／初核價格／生效日，不改寫主檔資料。PASS。 |

探針使用的 `scratchpad/tc17/` 生成副本與 Wrangler 暫存檔均已刪除；正式產物與 governed bytes 未受影響。

## 五項 deterministic-lookup 不變量

| 不變量 | 負向／保護證據 | 結果 |
| --- | --- | --- |
| 代碼只做規定正規化與精確比對 | NFKC／trim／uppercase／空白與連字號正規化正向；一碼不同回無資料，無 correction/suggestion 欄位 | PASS |
| 名稱只正規化形式、大小寫與重複空白；多筆不自選 | 中文名、英文名、成分皆覆蓋；不同含量仍分離；重複成分回傳來源順序的全部涵蓋期候選，無 selected item | PASS |
| 日期與版本 fail closed | 真實首期前、合成有限尾端後、合成空隙、非法曆日、五位數西元年與錯誤版本皆回空 matches，不使用最近或現行期別 | PASS |
| 非 EXACT_MATCH 全部人工覆核；EXACT_MATCH 只表資料存在 | multiple、not-in-dataset、日期／版本失敗皆 `manualReviewRequired: true`；EXACT_MATCH 註解及輸出無病人資格或申報結論 | PASS |
| deterministic 行為有負向測試且矩陣同步 | 新增 codegen/domain/contracts/API/UI 負向測試並更新 `docs/test-matrix.md` | PASS |

## 五項驗收檢查

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS，exit 0；全部 workspace typecheck 完成。 |
| `pnpm test` | PASS，exit 0；23 files／248 tests passed。 |
| `pnpm export:web` | PASS，exit 0；Expo Web bundle 匯出完成。 |
| `pnpm worker:types` | PASS，exit 0；Worker types up to date。 |
| `pnpm worker:dry-run` | PASS，exit 0；dry-run 完成且未部署。 |

Wrangler 使用 repo 內 `scratchpad/tc17/xdg` 作一次性可寫設定目錄；探針後該目錄已清除。依環境限制未執行 iOS／Android simulator 或 device runtime 驗證，亦未宣稱已驗證。本報告為建置者自我檢查，不取代派發方／驗收方的獨立覆核。
