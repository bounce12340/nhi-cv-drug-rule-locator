# Source register(來源登錄,runbook Stage 1)

每一個收件檔案一筆登錄紀錄;欄位定義見 `docs/phase1-intake-runbook.md` §3。本目錄僅存 metadata(雜湊、出處宣告、複驗結果),永不存放收件 payload。

宣告來源:專案負責人(RA)於 2026-08-02 會期中口頭宣告;RA 對載有本目錄的 PR 之 `PASS <sha7>` 即為登錄簽記。宣告中的公告參照與生效日一律以 `docs/spec-source-status.md` 收件紀錄為準,不在本目錄重複載明。

| 檔案 | 狀態 |
| --- | --- |
| master-project-prompt-v3.2 | PROVENANCE_DECLARED / AUTHENTICITY_CONFIRMED(RA 2026-08-02 裁示此版即權威版本) |
| ezetimibe_3month_exception | PROVENANCE_DECLARED(待 Stage 3 驗證) |
| ezetimibe_statin_combo_3month_exception | PROVENANCE_DECLARED(待 Stage 3 驗證) |
| price_change_seed_20260901 | PROVENANCE_DECLARED(待 Stage 3 驗證) |
| statin_table2_only_list | PROVENANCE_DECLARED(待 Stage 3 驗證) |
| companion-spec-readme | PROVENANCE_DECLARED(專案自撰文件,性質已釐清) |
| attachment-1-price-change-detail(附件1 PDF) | PROVENANCE_DECLARED(2026-08-02 收件;Stage 3 比對基準) |
| attachment-2-rule-revision-table(附件2 PDF) | PROVENANCE_DECLARED(2026-08-02 收件;Stage 3 比對基準) |
| announcement-webpage-capture(公告本文擷取) | PROVENANCE_DECLARED(2026-08-02 收件;缺件 #4 結案) |
| rule-2.6.1-prior-version-full-text(舊版 2.6.1 全文 PDF) | PROVENANCE_DECLARED(2026-08-03 收件;舊版表二缺口結案;方向 B 基準) |
| rule-2.6.2-prior-version-full-text(舊版 2.6.2 全文 PDF) | PROVENANCE_DECLARED(2026-08-03 收件;2A 補件,Stage 3 補充基準) |
| rule-2.6.3-prior-version-full-text(舊版 2.6.3 全文 PDF) | PROVENANCE_DECLARED(2026-08-03 收件;2A 補件,Stage 3 補充基準) |
| nhi-drug-item-master-20260806(健保用藥品項查詢項目檔) | PROVENANCE_DECLARED(2026-08-06 收件;政府資料開放平臺 23715,開放授權,RA 授權由 session 直接取得;範圍子集待 Stage 3 派工驗證) |
| rules-structured-jsonl(結構化規則轉錄 JSONL) | DERIVED_VERIFIED(2026-08-04 內部推導;T3 FIDELITY_VERIFIED;RDL-015 入庫) |
