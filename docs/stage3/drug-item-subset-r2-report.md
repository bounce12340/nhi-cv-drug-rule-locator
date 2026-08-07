# 健保用藥品項查詢項目檔範圍子集 r2 Stage 3 驗證報告

## 狀態與邊界

- 資料集識別：`nhi-drug-items-2026-08-07-r2`
- 驗證器：`scripts/drug-item-subset-derive.mjs`
- 狀態碼：`SUBSET_DERIVATION_VERIFIED`
- 推導產物：`scratchpad/intake-23715/subset-lipid-r2.csv`
- 產物位於 gitignored 建置區：true
- governed storage 寫入：false
- 報告僅含 metadata：true

本次產物為 Stage 3 候選，不構成入庫或下游引擎消費授權。納入條件為章節 token 精確匹配，或藥品代號存在於四份公告附帶清單的 `nhi_code` 聯集；來源列序不變，未去重、排序或正規化。

## 來源雜湊與結構閘門

| 檢查 | 期望 | 實算 | 結果 |
| --- | --- | --- | --- |
| SHA-256 | `d41cf7bf91ca1d6997ac751601548f68226a8326452aa5d8befd725e3a8d0158` | `d41cf7bf91ca1d6997ac751601548f68226a8326452aa5d8befd725e3a8d0158` | MATCH |
| 位元組數 | 96,843,587 | 96,843,587 | MATCH |
| 資料列數 | 224,553 | 224,553 | MATCH |
| 欄位數 | 20 | 20 | MATCH |
| UTF-8 BOM | true | true | MATCH |

欄位順序：異動、藥品代號、藥品英文名稱、藥品中文名稱、成分、規格量、規格單位、單複方、支付價、有效起日、有效迄日、藥商、製造廠名稱、劑型、藥品分類、分類分組名稱、ATC代碼、給付規定章節、藥品代碼超連結、給付規定章節連結。

## 公告附帶清單完整性閘門

先以 `storage-manifest/v1` 驗證 manifest，再於解析各 CSV 前比對原始位元組的 SHA-256 與位元組數。四檔皆相符後才建立 `nhi_code` 聯集。

| 宣告檔名 | manifest／實算 SHA-256 | 位元組數 | 資料列數 | 結果 |
| --- | --- | ---: | ---: | --- |
| `ezetimibe_3month_exception.csv` | `dae9534d1eb31ffaab5a1c4de35c89d3348ad8d8c524eb34f678dc2a704eebb7` | 249 | 4 | MATCH |
| `ezetimibe_statin_combo_3month_exception.csv` | `d4513a6cdd514470b87100352e4d8cca2f17124b1f23b5dc4bff7042a8f15948` | 546 | 10 | MATCH |
| `price_change_seed_20260901.csv` | `a480f90d9dd8d9d3eefaf9d206d94898a1184dc62f3e927041fcac7e2f6c6f1f` | 7,650 | 57 | MATCH |
| `statin_table2_only_list.csv` | `b258acb48e68db096f74cb53abe89a96a6d2929701c7da89370484c00d2e8388` | 7,651 | 116 | MATCH |

| 聯集檢查 | 結果 |
| --- | ---: |
| 相異附帶代碼數 | 187 |
| r2 已覆蓋附帶代碼數 | 187 |
| 覆蓋反例數 | **0** |

## r2 子集結果

| 項目 | r1 | r2 | 差額 |
| --- | ---: | ---: | ---: |
| 資料列數 | 4,047 | 4,048 | +1 |
| 相異藥品代號數 | 606 | 607 | +1 |

| r2 metadata | 結果 |
| --- | --- |
| 位元組數 | 1,844,105 |
| SHA-256 | `ec6c9fdb3a047d0ad9b29db6d0ffab23f0e0bb1ddd39851a7d50619bc3529412` |
| dataset digest | `c340830cfff85c0d8fe067fde4033574f741d03ca3f3c9361329df05ec4c9857` |
| digest 實作 | `computeDatasetDigest` |
| UTF-8 BOM | false |
| 往返資料列數 | 4,048 |
| 聯集納入反例數 | **0** |

## 章節準則不變量

章節欄仍依既有逗號切分、逐 token 去除前後空白後，與 `2.6.1.`、`2.6.2.`、`2.6.3.` 做完整字串相等比較。既有近似章節排除測試未修改。

| 檢查 | 結果 |
| --- | --- |
| 章節準則納入列數 | 4,047 |
| 章節準則子集 SHA-256 | `e4783015aa0e84be62a9a27eff3dd6090f5019786771d389bc4498bc52b6e9f5` |
| 章節準則子集位元組數 | 1,843,720 |
| 與 r1 逐位元組相同 | true |
| 公告附帶準則單獨新增列數 | 1 |
| 近似章節誤納列數 | 0 |

## Write-once 與重跑一致性

正式產物以 `wx` 建立一次；建立後只執行唯讀 `--check`。兩次全新推導均重新驗證來源與四份附件，再於記憶體推導並和正式產物逐位元組比較。

| 重跑 | 模式 | 資料列數／相異代碼數 | SHA-256 | 與正式產物相同 | 反例數 |
| --- | --- | --- | --- | --- | ---: |
| 1 | `--check` | 4,048／607 | `ec6c9fdb3a047d0ad9b29db6d0ffab23f0e0bb1ddd39851a7d50619bc3529412` | true | 0 |
| 2 | `--check` | 4,048／607 | `ec6c9fdb3a047d0ad9b29db6d0ffab23f0e0bb1ddd39851a7d50619bc3529412` | true | 0 |

正式產物在重跑、探針與五項檢查後，SHA-256 與 mtime 均未改變。

## Fail-closed 探針

| 探針 | 退出／錯誤 | 輸出產物 | 正式產物 | 殘留 | 結果 |
| --- | --- | --- | --- | --- | --- |
| `--force-hash-mismatch` | exit 1／`hash_mismatch` | 無 | hash、mtime 不變 | 0 | PASS |
| 附帶清單雜湊不符 | `attachment_hash_mismatch` | 無 | hash、mtime 不變 | 0 | PASS |

## 機械結論

| 驗收項目 | 結果 |
| --- | --- |
| 4,048 列／607 相異代碼 | PASS |
| 187 個附帶代碼全覆蓋 | PASS |
| 章節準則納入集與 r1 逐列一致 | PASS |
| 兩次重跑逐位元組一致 | PASS |
| 來源與附件雜湊錯配皆 fail closed | PASS |
| 僅在 scratchpad 留存子集資料 | PASS |

本報告不重現任何藥品代碼、品名或價格值。
