# 來源登錄:結構化規則轉錄 JSONL(內部推導產物)

- 狀態:**DERIVED_VERIFIED**(2026-08-04;非外部收件——本檔為 governed intake 管線之內部推導產物,登錄其推導出處)
- 檔案紀錄:SHA-256 `9aa028b9f6036b9727d80186f37eb40695dca12ff61540c2ff5319b359227117`,35,239 bytes,67 行(每行一條文單元)
- 推導來源:`data/governed/nhi-lipid-rules-2026-09-01-r1/attachment-2-rule-revision-table.pdf`(RDL-014 入庫原件,SHA-256 `6389a5f6…6bb6c1c2`)之右欄「修正後」全三小節(2.6.1–2.6.3;RA 裁示 D1全/D2JSONL)
- 推導程序:TC-20260804-10(T2 機械轉錄,腳本 `scripts/rules-transcribe-t2.mjs` SHA-256 `7de416b0…d0859c`;零語意判斷、覆蓋 661/661 行、逐單元錨定+雜湊)
- 保真驗證:TC-20260804-11(T3,腳本 `scripts/rules-verify-t3.mjs`)總判定 **FIDELITY_VERIFIED**——錨點完全分割零瑕疵、往返逐位元等值 ×3、與三份候選位元組全等、schema 重驗 67/67
- 內容界定:逐字轉錄,無詮釋欄位;明確排除 eligibility 與價格;`unit_type`/`table_label` 等結構欄位僅為機械標記
- 入庫:RA 2026-08-04 核准 `INTAKE-APPROVE nhi-lipid-rules-structured-2026-09-01-r1 dcb6bd9`(RDL-015)→ `data/governed/nhi-lipid-rules-structured-2026-09-01-r1/rules-structured.jsonl`
- 用途界限:治理儲存;**規則引擎之消費需另一次 RA 裁決**(尚未授予);待 9/1 生效版確認排程之勘誤攔截結果
