# 來源登錄:風險分級資料集(自附件2 轉錄)

- 資料集版本:`nhi-lipid-risk-2026-09-01-r1`,生效日 2026-09-01
- 狀態:**DERIVED_FROM_GOVERNED_SOURCE** —— 非新收件,係既有受管來源之轉錄
- 母本:`data/governed/nhi-lipid-rules-2026-09-01-r1/attachment-2-rule-revision-table.pdf`
  SHA-256 `6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2`,325,429 bytes
  來源登錄見 [`attachment-2-rule-revision-table.md`](attachment-2-rule-revision-table.md)
- 轉錄範圍:該 PDF 之**表一**、其後四段 ● 註記(等級定義、風險因子定義、各風險等級評估建議、non-HDL-C),
  以及 **2.6.2、2.6.3 之「建議修訂後給付規定」欄**。表二、2.6.1 逐字條文、附件1、公告網頁擷取不在本次範圍
- 轉錄工具:`scripts/risk-transcribe.mjs`(可重跑,`--check` 驗證);抽取指令 `pdftotext -layout -enc UTF-8`,
  雙欄區段另加 `-x 0 -W <寬>` 只裁左欄(第 11 頁 421pt、第 12–13 頁 300pt,寬度 ±4pt 輸出不變才採用)
- 編碼工具:`scripts/risk-codegen.mjs` → `packages/domain/src/generated/risk-2026-09-01.ts`

| 檔案 | SHA-256 | bytes | 筆數 |
| --- | --- | --- | --- |
| `assessment-advice.jsonl` | `830e15cdbf143416f2c1b56a956c4f7adc3c60f3affa85daa8691602734f4bf8` | 3,200 | 6 |
| `coverage-rule-conditions.jsonl` | `6d7822f1341a49879bba04566ffa1caa38a6aba85b45028247fcd3f63c58437f` | 2,011 | 5 |
| `coverage-rules.jsonl` | `98106c0a81cd55881658ab477702143bc5e8a1c8c99d0630dae342eba9e4911e` | 1,086 | 2 |
| `risk-factors.jsonl` | `f877d2a7a4d86b9161584216cabde000890f64bb2353bd1cfd9ebd42f1bd54d5` | 1,633 | 11 |
| `risk-tiers.jsonl` | `d32822010c90340eddd6af9a1f9e48c4c94281896af657386fa3e660eda40ab5` | 8,939 | 6 |
| `tier-criteria.jsonl` | `809f7949eafcc7df3139694b158d6713f6bf4a5e0b6a7ae2d51cf1387e8bec5e` | 4,895 | 18 |

資料集摘要(依 declaredName 排序後串接各檔 SHA-256 再取雜湊):
`3b17cf467900dcf4dde8c049ff4091f092dada8cbd482bda6ef6731e2614dfcf`

## 轉錄之取捨

逐項理由記於 [`data/governed/nhi-lipid-risk-2026-09-01-r1/TRANSCRIPTION.md`](../../data/governed/nhi-lipid-risk-2026-09-01-r1/TRANSCRIPTION.md)。摘要:

1. 處方規定依**原文自帶的標題**(「極高、非常高風險:」等)配對到等級,不依行序——該欄是連續文字流,與左側等級列並不對齊
2. 折行接合**只補空格、不改字元**;codegen 斷言兩形式去除所有空白後完全相同
3. 判定條件維持**兩層**(前提 + 任一),不攤平
4. `pdftotext` 掉到獨立行的上標(`1.73m²` 的 ²)依其列位還原
5. **未轉錄**「非藥物治療」欄:該欄跨列合併,抽取結果為碎片,拼回需依行序推斷
6. 「0 項心血管風險因子」列之次要目標值與處方規定均記為 `null`——公告未列,不由上一列借用
7. 評估建議依**標題自己寫的等級名稱**配對(逐字相等),不依行序;「0 項心血管風險因子」不在兩組之內,故無建議
8. non-HDL-C 註記之 `appliesToTierIds` 記為 `null`——公告未限定等級,不代為限定
9. 2.6.3 無「下列條件之一」之連接語,`restrictionRaw` 記為 `null`,畫面不代為補上
10. 雙欄區段以**幾何裁切**分欄,不以字元位置切:`-layout` 依視覺寬度補空白而 JS 以碼位索引,中文為雙寬,無固定位移
11. 折行空格規則在文件內部互相矛盾之處(`6-8週`)以具名例外 `WRAP_NO_SPACE` 記錄,例外未命中即建置失敗

## 交叉核對

2.6.2 之 4 個、2.6.3 之 10 個健保代碼,與 `data/governed/nhi-lipid-2026-09-01-r1/` 兩份**先前獨立轉錄**的
例外清單 CSV 完全一致(共 14 筆)。`packages/domain/src/coverage-rule.test.ts` 於每次 CI 重跑此比對。

## 明示不涵蓋

本資料集**不**重建新舊給付規定對照:僅轉錄「建議修訂後給付規定」欄,原給付規定欄不入資料集
(該對照面向已於 2026-08 移除,見 CLAUDE.md)。2.6.1 之逐字條文亦不涵蓋——其內容即表一,已另行轉錄。亦不得改用 2026-08 移除的 `nhi-lipid-rules-structured`:該資料集抽取時未用 `-layout`,表一被壓成單欄文字流、門檻數字與等級名稱錯行交錯。
