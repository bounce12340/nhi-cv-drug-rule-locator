# TC-20260807-20 建置者自我檢查報告

日期：2026-08-07（UTC）

## 1. 派工與邊界核對

| 項目 | 結果 |
| --- | --- |
| 派工單 SHA-256 | `8cfef143790d0e470bf7c0fdcc4c1cc40cbd582d8855fa682d5a1b2415416808`，MATCH |
| 指定基準 | 已完整讀取派工單、推導腳本、附件 storage manifest 與 `scripts/__tests__/` 全部既有測試 |
| 執行 git 指令 | 無 |
| `data/governed/` 寫入 | 無；全樹內容摘要前後均為 `538ba5f9a8368fd97e87fe4226905a538faaa0eeffbfd2337fca7da7f74cfb9b` |
| codegen／生成模組 | 無修改；`packages/domain/src/generated/` 內容摘要前後均為 `b5bdbf338d84594dade72e66ccafe5a521e590bdac74c241130d7eeec998124e` |
| domain／api／UI 原始碼 | 無修改；排除既有 ignored `dist/.expo` 後，內容摘要前後均為 `3200360c29cd1c40ada52b41bb0a220f90934ffb240a8e2027d565f4218ac7bf` |
| 子集與資料值位置 | 正式 r2 子集只存在 gitignored `scratchpad/`；兩份報告只含 metadata |
| 寫入順序 | 先以 `wx` 建立正式子集，後寫 Stage 3 報告，最後寫本報告 |

`pnpm export:web` 依驗收要求刷新既有 ignored `dist/.expo` 驗證輸出；未改動 UI 原始碼。Wrangler 設定與日誌導向 `/tmp`，檢查後已清除。

## 2. 檔案變更

| 檔案 | 變更 |
| --- | --- |
| `scripts/drug-item-subset-derive.mjs` | 納入條件擴充為章節精確 token 或四份附件 `nhi_code` 聯集；加入 manifest 完整性、附件 hash/schema、預設結果、r1 章節基線、覆蓋與 digest 閘門 |
| `scripts/__tests__/drug-item-attachment-criterion.test.mjs` | 新增 3 項合成測試：空章節附帶代碼納入、空章節非附帶代碼排除、附件 hash 錯配 fail closed |
| `scratchpad/intake-23715/subset-lipid-r2.csv` | gitignored write-once r2 正式候選，1,844,105 bytes／4,048 列 |
| `docs/stage3/drug-item-subset-r2-report.md` | 新增 count/hash/header-only Stage 3 報告 |
| `docs/TC-20260807-20-self-check.md` | 本報告 |

既有四個 `scripts/__tests__/` 檔案未修改，收尾 SHA-256 仍分別為：

| 既有測試檔 | SHA-256 |
| --- | --- |
| `drug-item-refresh-check.test.mjs` | `8221e23d1a04a4665243ec78d6c426cfb181fd1aa64340caf505a68c72acb686` |
| `drug-item-refresh-workflow.test.mjs` | `e52ca9606f3143c7ffa08fb0728bdcef1f6bd7744b3ecf13d4bd430b72e5de31` |
| `drug-item-subset-derive-cli.test.mjs` | `d0a133871f9b184924a4e9f0fceca1277f4ee2f02e7b1b2b07928055074eb68b` |
| `drug-item-subset-derive.test.mjs` | `02674d7bb0acea7bb5e067e884909f41f22aaf8170b6fdeecd6c2f8946b10d47` |

因此既有 look-alike 排除案例及其測試文字保持不變。

## 3. 測試數增減

| 項目 | 實作前 | 實作後 | 差額 |
| --- | ---: | ---: | ---: |
| 測試檔 | 26 | 27 | +1 |
| 測試 | 257 | 260 | +3 |
| 通過 | 257 | 260 | +3 |

定向測試為 4 files／19 tests 全綠；完整測試為 27 files／260 tests 全綠。

## 4. 預期值交叉驗證

| 驗收不變量 | 派發預期 | 實算 | 結果 |
| --- | ---: | ---: | --- |
| r2 資料列數 | 4,048 | 4,048 | MATCH |
| r2 相異代碼數 | 607 | 607 | MATCH |
| 對 r1 列數差 | +1 | +1 | MATCH |
| 對 r1 相異代碼差 | +1 | +1 | MATCH |
| 附帶代碼聯集 | 187 | 187 | MATCH |
| r2 覆蓋附帶代碼 | 187 | 187 | MATCH |
| 附帶代碼覆蓋反例 | 0 | 0 | MATCH |
| 章節準則納入列數 | 4,047 | 4,047 | MATCH |
| 章節準則與 r1 逐列一致 | true | true（逐位元組相同） | MATCH |
| 公告附帶準則單獨新增列數 | 1 | 1 | MATCH |

章節準則子集 SHA-256 實算為 `e4783015aa0e84be62a9a27eff3dd6090f5019786771d389bc4498bc52b6e9f5`，與 r1 完全相同。既有逐 token 精確比對函式與近似章節負向測試均未更改。

## 5. 附件 manifest 驗證

| 附件 | manifest／實算 SHA-256 | 結果 |
| --- | --- | --- |
| `ezetimibe_3month_exception.csv` | `dae9534d1eb31ffaab5a1c4de35c89d3348ad8d8c524eb34f678dc2a704eebb7` | MATCH |
| `ezetimibe_statin_combo_3month_exception.csv` | `d4513a6cdd514470b87100352e4d8cca2f17124b1f23b5dc4bff7042a8f15948` | MATCH |
| `price_change_seed_20260901.csv` | `a480f90d9dd8d9d3eefaf9d206d94898a1184dc62f3e927041fcac7e2f6c6f1f` | MATCH |
| `statin_table2_only_list.csv` | `b258acb48e68db096f74cb53abe89a96a6d2929701c7da89370484c00d2e8388` | MATCH |

所有附件均先以 `storage-manifest/v1` 與 `verifyStoredFileBytes` 驗證原始位元組，通過後才解析 `nhi_code`。缺檔、manifest 不合法、hash/bytes 不符或 CSV schema 不符皆 fail closed，且發生在正式輸出寫入之前。

## 6. 兩次重跑、雜湊與 digest

| 項目 | 結果 |
| --- | --- |
| 資料集識別 | `nhi-drug-items-2026-08-07-r2` |
| r2 位元組數 | 1,844,105 |
| r2 SHA-256 | `ec6c9fdb3a047d0ad9b29db6d0ffab23f0e0bb1ddd39851a7d50619bc3529412` |
| dataset digest | `c340830cfff85c0d8fe067fde4033574f741d03ca3f3c9361329df05ec4c9857` |
| digest 實作 | 直接呼叫 `packages/source-intake/src/storage.ts` 的 `computeDatasetDigest` |

| 重跑 | 模式 | SHA-256 | 列／相異代碼 | r1 章節基線 | 附件覆蓋 | 反例 |
| --- | --- | --- | --- | --- | --- | ---: |
| 1 | `--check` | `ec6c9fdb3a047d0ad9b29db6d0ffab23f0e0bb1ddd39851a7d50619bc3529412` | 4,048／607 | true | 187／187 | 0 |
| 2 | `--check` | `ec6c9fdb3a047d0ad9b29db6d0ffab23f0e0bb1ddd39851a7d50619bc3529412` | 4,048／607 | true | 187／187 | 0 |

正式產物建立後 mtime 固定為 `2026-08-07 01:49:34.565435949 +0000`；兩次重跑、全部探針與五項檢查後 mtime 及 SHA-256 均未改變。

## 7. 探針結果

| 探針 | 結果 |
| --- | --- |
| 預設 `--check` | PASS；重新驗證來源、四附件、內嵌 4,048／607 與 SHA-256、r1 章節基線後，逐位元組吻合 |
| `--force-hash-mismatch` | PASS；exit 1、`hash_mismatch`、probe 輸出不存在；正式產物 hash/mtime 不變，目錄檔案數 3／3 |
| 附件 hash mismatch | PASS；對 scratchpad 內四附件副本竄改一檔後回 `attachment_hash_mismatch`，輸出不存在 |
| 附件探針清理 | PASS；探針目錄清理前僅 manifest 與四附件共 5 檔、無候選輸出；清理後目錄不存在，scratchpad 根目錄項目數 3／3 |
| write-once | PASS；正式產物僅一次 `wx` 建立，後續全部使用唯讀 `--check` |
| 往返驗證 | PASS；4,048 列，聯集納入反例 0，附件覆蓋 187／187 |

首次嘗試以 nested `spawnSync` 包裝來源錯配探針時，sandbox 以 `EPERM` 拒絕啟動 child；該包裝嘗試沒有執行推導、沒有建立檔案，正式產物 hash/mtime 與目錄檔案數不變。其後改以直接 CLI 執行同一探針，取得上表之有效結果。

## 8. 五項檢查

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS，27 files／260 tests |
| `pnpm export:web` | PASS |
| `pnpm worker:types` | PASS，Worker types up to date |
| `pnpm worker:dry-run` | PASS，dry-run 正常退出、未部署 |

## 9. 總結

| 驗收項目 | 結果 |
| --- | --- |
| 章節精確 token 或公告附帶代碼聯集 | PASS |
| 附件讀取前依 manifest 驗證 hash、錯配 fail closed | PASS |
| 章節準則與 r1 逐列一致、只增不減 | PASS |
| 派發方全部預期值 | PASS |
| 兩次重跑、`--check`、兩項雜湊錯配探針 | PASS |
| 五項專案檢查 | PASS |
| 禁止路徑與 metadata-only 邊界 | PASS |

本報告為建置者自我檢查，不構成入庫核准；r2 正式候選仍只存在於 gitignored `scratchpad/`。
