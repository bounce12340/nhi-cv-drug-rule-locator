# 來源登錄:風險分級資料集(自附件2 表一轉錄)

- 資料集版本:`nhi-lipid-risk-2026-09-01-r1`,生效日 2026-09-01
- 狀態:**DERIVED_FROM_GOVERNED_SOURCE** —— 非新收件,係既有受管來源之轉錄
- 母本:`data/governed/nhi-lipid-rules-2026-09-01-r1/attachment-2-rule-revision-table.pdf`
  SHA-256 `6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2`,325,429 bytes
  來源登錄見 [`attachment-2-rule-revision-table.md`](attachment-2-rule-revision-table.md)
- 轉錄範圍:該 PDF 之**表一**(全民健康保險降膽固醇藥物給付規定表一)。表二、附件1、公告網頁擷取不在本次範圍
- 轉錄工具:`scripts/risk-transcribe.mjs`(可重跑,`--check` 驗證);抽取指令 `pdftotext -layout -enc UTF-8`
- 編碼工具:`scripts/risk-codegen.mjs` → `packages/domain/src/generated/risk-2026-09-01.ts`

| 檔案 | SHA-256 | bytes | 筆數 |
| --- | --- | --- | --- |
| `risk-factors.jsonl` | `f877d2a7a4d86b9161584216cabde000890f64bb2353bd1cfd9ebd42f1bd54d5` | 1,633 | 11 |
| `risk-tiers.jsonl` | `d32822010c90340eddd6af9a1f9e48c4c94281896af657386fa3e660eda40ab5` | 8,939 | 6 |
| `tier-criteria.jsonl` | `809f7949eafcc7df3139694b158d6713f6bf4a5e0b6a7ae2d51cf1387e8bec5e` | 4,895 | 18 |

資料集摘要(依 declaredName 排序後串接各檔 SHA-256 再取雜湊):
`a60ee155a9e631d2a4933c06f36297465a613c30de19fa4514877da708cf4082`

## 轉錄之取捨

逐項理由記於 [`data/governed/nhi-lipid-risk-2026-09-01-r1/TRANSCRIPTION.md`](../../data/governed/nhi-lipid-risk-2026-09-01-r1/TRANSCRIPTION.md)。摘要:

1. 處方規定依**原文自帶的標題**(「極高、非常高風險:」等)配對到等級,不依行序——該欄是連續文字流,與左側等級列並不對齊
2. 折行接合**只補空格、不改字元**;codegen 斷言兩形式去除所有空白後完全相同
3. 判定條件維持**兩層**(前提 + 任一),不攤平
4. `pdftotext` 掉到獨立行的上標(`1.73m²` 的 ²)依其列位還原
5. **未轉錄**「非藥物治療」欄:該欄跨列合併,抽取結果為碎片,拼回需依行序推斷
6. 「0 項心血管風險因子」列之次要目標值與處方規定均記為 `null`——公告未列,不由上一列借用

## 明示不涵蓋

本資料集**不**重建 2.6.1–2.6.3 之逐字條文(該面向已於 2026-08 移除,見 CLAUDE.md)。亦不得改用 2026-08 移除的 `nhi-lipid-rules-structured`:該資料集抽取時未用 `-layout`,表一被壓成單欄文字流、門檻數字與等級名稱錯行交錯。
