# Phase Acceptance Report 模板(§30 #35;依 v3.2 §26)

> 每一個 Phase 完成時複製本模板為 `docs/acceptance/phase-XX.md` 填寫。三項全部成立才可建立 Phase Release PR:`Final Decision = PASS`、`Acceptance Model Tier = SOL_PRO`、`Accepted Commit SHA = Phase branch 最新 SHA`,且 `sol-pro-acceptance` Required Check 通過。

## 1. Phase 識別

- Phase 編號與名稱:
- Phase Scope(引用 phase 計畫章節):
- 報告日期:

## 2. 變更清單

- PR 清單(編號、標題、head SHA、對應派工單 TC-ID):
- Commit 清單(或指向 Phase branch 區間):

## 3. 需求與測試

- Requirement 完成狀態(對照 Requirement-to-Test Matrix,逐項 DONE/PARTIAL/DEFERRED 附理由):
- Test Matrix 結果(通過/失敗/阻擋統計與證據連結):
- GitHub Actions 結果(workflow run 連結,逐 job 結論):

## 4. Attestations(v3.2 §21.5.4;缺一不得合併)

- Terra Pro Builder Attestation:model display name、exact model id、run/session id、branch、commit SHA、task contract hash:
- Sol Pro Acceptance Attestation:model display name、exact model id(依 ADR-001 得以 session 執行紀錄連結保存)、run id、accepted commit SHA:
- 獨立測試證據(Sol Pro 於乾淨環境重跑之紀錄):

## 5. 專項審查

- RA/法規審查結論:
- 隱私(個資)審查結論:
- 資安審查結論:
- Mobile/Accessibility 結果(實機證據;本環境 BLOCKED 時如實標注):
- Performance 結果(對照 docs/performance-budget.md;逐項達標/未達標):
- Migration 與 Rollback 驗證:

## 6. 未解決事項

- 已知缺陷與風險(逐項:嚴重度、處置、追蹤位置):
- 待人工確認事項:

## 7. 最終判定

- Final Decision:`PASS / FAIL / BLOCKED`
- Acceptance Model Tier:`SOL_PRO`
- Acceptance Model Exact ID/Version:(依 ADR-001 保存方式)
- Acceptance Run ID:
- Accepted Commit SHA:
- Reviewed By / At:
- RA 簽記(語式 `PASS <sha7>` 之原文與時間):
