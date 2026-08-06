# TC-20260806-18 自我檢查報告

日期：2026-08-06（UTC）

## 1. 派工與邊界核對

| 項目 | 結果 |
| --- | --- |
| 派工單 SHA-256 | `3a846a9885352ccc61db62a555a49fbee310f6ee4777c51ea4d587229872dbe6`，MATCH |
| 指定基準檔案與 runbook Stage 1／3／4 | 已完整讀取 |
| `computeDatasetDigest` | 直接匯入並呼叫 `packages/source-intake/src/storage.ts` 之既有函式，未另立演算法 |
| `data/governed/` 寫入 | 無 |
| 自動核准／自動合併 | 無／無 |
| 候選子集進 repo 或 PR 內文 | 無；workflow 僅上傳 GitHub Actions artifact，PR `add-paths` 僅允許三個 metadata 檔 |
| 暫存位置 | 僅使用 repo 內已 gitignored 的 `scratchpad/` |
| 執行 git 指令 | 無 |

## 2. 檔案變更清單

| 檔案 | 變更 |
| --- | --- |
| `.github/workflows/drug-item-refresh.yml` | 新增每月／手動觸發、最小權限、無變動 summary、有變動 artifact（90 天）、metadata-only draft PR 流程 |
| `docs/source-register/drug-item-master.registry.json` | 新增 `source-registry/v1` 權威狀態，`current` 以 RDL-020 實際值初始化 |
| `docs/source-register/nhi-drug-item-master-20260806.md` | 指向機器可讀 registry；其餘既有治理敘述不變 |
| `scripts/drug-item-subset-derive.mjs` | 新增 `--source`、`--expect-sha256`、`--expect-rows`、`--out`；預設值、雜湊／BOM／欄序／列數／輸出複驗閘門不變 |
| `scripts/drug-item-refresh-check.mjs` | 新增下載、實測、同雜湊短路、旗標式推導、current 子集鎖定、差異統計、既有 digest 規則與 write-once artifact |
| `scripts/drug-item-refresh-materialize.mjs` | 新增 `pending`、人類登錄追記與 count-only Stage 3 報告產生器；拒絕覆寫 `current` 或既有報告 |
| `scripts/__tests__/drug-item-subset-derive-cli.test.mjs` | 新增 2 項旗標與雜湊錯配測試 |
| `scripts/__tests__/drug-item-refresh-check.test.mjs` | 新增 6 項無變動／有變動／非 200／結構錯誤／write-once／metadata 報告測試 |
| `scripts/__tests__/drug-item-refresh-workflow.test.mjs` | 新增 1 項 workflow 邊界測試 |
| `docs/TC-20260806-18-self-check.md` | 本報告（依中斷韌性要求最後寫入） |

repo 外提交範圍另有一次性證明產物 `scratchpad/TC-20260806-18-backcompat.csv`（1,843,720 bytes）與 Wrangler 暫存日誌；兩者均位於 gitignored `scratchpad/`，不屬 PR 內容。

## 3. 測試數增減

| 項目 | 數量 |
| --- | ---: |
| 原有測試 | 248 |
| 新增測試 | 9 |
| 刪除或修改既有測試 | 0 |
| 完整測試結果 | 257／257 PASS（26 test files） |

既有 8 項推導測試檔在實作前後 SHA-256 均為 `02674d7bb0acea7bb5e067e884909f41f22aaf8170b6fdeecd6c2f8946b10d47`；定向執行結果為 8／8 PASS。

## 4. 向後相容逐位元組證明

write-once 證明產物只指定新輸出位置；來源路徑、預期來源 SHA、預期列數、固定欄名欄序與篩選邏輯全部採既有預設值。

| 項目 | 證據 |
| --- | --- |
| 預設來源 SHA-256 | `d41cf7bf91ca1d6997ac751601548f68226a8326452aa5d8befd725e3a8d0158` |
| 預設來源規模 | 96,843,587 bytes；224,553 資料列；20 欄；UTF-8 BOM |
| 新推導產物 | 1,843,720 bytes；4,047 資料列；SHA-256 `e4783015aa0e84be62a9a27eff3dd6090f5019786771d389bc4498bc52b6e9f5` |
| 現行 governed 子集 | 1,843,720 bytes；SHA-256 `e4783015aa0e84be62a9a27eff3dd6090f5019786771d389bc4498bc52b6e9f5` |
| `cmp -s` | exit 0，`byte_compare=IDENTICAL` |
| 往返反例 | 0 |

`data/governed/` 全樹內容摘要在實作前後均為 `538ba5f9a8368fd97e87fe4226905a538faaa0eeffbfd2337fca7da7f74cfb9b`，證明本單未改動其中任何位元組。

## 5. 探針結果

| 探針 | 結果 |
| --- | --- |
| 四個自訂旗標 | PASS；自訂來源／預期 SHA／預期列數／輸出路徑成功產生 write-once 子集 |
| 自訂 SHA 錯配 | PASS；`hash_mismatch`，零輸出 |
| 既有 `--force-hash-mismatch` | PASS；exit 1、`hash_mismatch`；既有產物 hash 與 mtime 不變；目錄檔案數 2／2 |
| 無變動合成 fixture | PASS；`changed:false`，輸入前後檔案清單相同，無 artifact／報告／PR 資料 |
| 有變動合成 fixture | PASS；新增 1、移除 1、價格期別新增 2、章節歸屬變動 1、欄位結構相同 true；候選 3 列／2 相異品項 |
| dataset digest | PASS；checker 與 registry 值均和 `storage.ts` 的 `computeDatasetDigest` 結果一致 |
| 上游非 200 | PASS；`fetch_http_error`、status 503、零 artifact、暫存清空 |
| 欄位結構改變 | PASS；`schema_error`、零 artifact、暫存清空 |
| write-once | PASS；第二次相同輸出拒絕覆寫，首次產物逐位元組未變 |
| metadata materialization | PASS；`current` 深度相同、只新增 `pending`；報告未出現合成品項識別、名稱或價格期別值 |
| YAML 語法 | PASS（Ruby Psych parse） |
| workflow 邊界 | PASS；只宣告 `contents: write`／`pull-requests: write`，artifact 保留 90 天，draft PR，metadata `add-paths` allowlist，無 governed 寫入／核准／合併步驟 |
| 手動紅線樣式掃描 | PASS；指定變更檔未命中 governance tripwire 的官方代碼／公告參照／非 demo 支付價樣式 |

`scripts/governance-scan.sh` 本身會執行 git，故依本派工「絕對不要執行任何 git 指令」未執行；改以相同紅線 pattern 對本單檔案做唯讀掃描。正式 PR 的既有 CI 仍會執行 governance-scan。

## 6. 五項檢查

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS，257／257 |
| `pnpm export:web` | PASS |
| `pnpm worker:types` | PASS，generated Worker types up to date |
| `pnpm worker:dry-run` | PASS，dry-run 正常退出，未部署 |

Wrangler 日誌以 `WRANGLER_LOG_PATH` 導向 repo 內 `scratchpad/TC-20260806-18-wrangler.log`，避免寫入唯讀的使用者設定目錄；兩個 Worker 檢查的最終重跑均為 exit 0。

## 7. 結論

本單完成「只偵測、只推導、只報告、只開 draft PR」之每月更新能力。所有成功路徑仍通過來源雜湊、UTF-8 BOM、固定欄名欄序、資料列數、輸出重讀與 current governed 子集雜湊閘門；旗標只替換預期值或路徑，未新增任何略過閘門的入口。`current` 不會由管線改寫，候選內容只會成為 90 天 CI artifact，實際入庫仍需 RA 逐字 `INTAKE-APPROVE` 與後續獨立治理程序。
