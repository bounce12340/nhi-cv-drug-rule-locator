# v3.2 全文對齊審查(2026-08-02)

權威版 v3.2(真實性已確認,見 docs/source-register/master-project-prompt-v3.2.md)全文研讀後,現行治理與規劃的對齊結論。依紅線規範,本文僅引章節編號,不重述任何規則、代碼或價格內容。

## 一、已對齊(無需動作)

| v3.2 條款 | 現行落實 |
| --- | --- |
| §21.5 tier 分工(Terra Pro 建置/Sol Pro 驗收) | ADR-001 之映射與 CONTRIBUTING 分工一致 |
| §21.5.3 獨立性(建置者不自核、驗收者不改碼、同 run 不得兼任) | CONTRIBUTING「派工與驗收作業」+ 實務執行紀錄一致 |
| §21.5.5 不得靜默替換 | ADR-001 + RDL-010 明文化 |
| §21.6 派工單要件(Scope/Out of scope/驗收標準/允許檔案) | docs/task-contract-template.md 全數涵蓋 |
| §29 禁止事項 31–37(模型治理) | 全數已編入現行規則 |
| §30 36 項規劃產物 | docs/v32-planning-tracker.md 逐項對應 |
| §3 衝突處理(MANUAL_REVIEW,不靜默修正) | deterministic 不變式與 runbook §10 一致 |
| §5.2 Maker-Checker | runbook Stage 3 雙重覆核等效 |

## 二、發現落差(需處理;標【R】者需 RA 裁決)

1. **【R6|已裁決 2026-08-02】§21.3 三層分支模型**:RA 裁示——規劃/治理期(現階段)維持單一工作分支逐 PR 進 main 之現行模式(核准之階段性偏離);進入正式功能實作期(v3.2 Phase 1+ 編碼工作)時切換三層模型(`main`/`phase/*`/`agent/*`,每 Phase 單一 Squash Release PR)。切換時點由派發方於首個實作派工前提報確認。
2. **【R7|已結案 2026-08-02】§21.1 Repository Private**:RA 確認 repository 自始即為 Private——完全符合 §21.1,無偏離需記錄。
3. **§21.2 必要檔案缺項(已依 TC-20260809-25 補入前置檔案,整體仍 PARTIAL)**:`docs/acceptance/` 已存在;`.github/CODEOWNERS` 與 `docs/runbooks/` 已補入。此項只記錄檔案現況,不代表 §21.2 已全部完成;§21.4 branch protection/rulesets 仍為落差 #4。
4. **§21.4 main 保護**:branch protection/rulesets 尚未於 GitHub 設定(tracker #16)。
5. **§21.5.4 attestation 欄位**:現行 task-contract/v1 缺 `prompt_or_task_contract_hash`;自 TC-20260802-04 起補記派工單雜湊,舊紀錄不追溯。名為 `terra-pro-build-attestation`/`sol-pro-acceptance` 的 GitHub Required Checks 尚未實作(tracker #22)。
6. **§24 Phase 編號體系不一致**:v3.2 的 Phase 0–7 與現行 docs/phase-plan.md 的 Phase 0/0.5/1–3 為兩套編號。對應關係:現行「Phase 1 governed intake」≈ v3.2 Phase 1 的資料治理前段;v3.2 Phase 1 另含 Schema/Migration/D1 等實作,屬現行體系的 Phase 2 範疇。需一份對照表並統一用語(列入規劃工作,不影響當前進行中工作)。
7. **§22 測試矩陣欄位**:v3.2 要求之完整欄位(Requirement ID/Test ID/tier 標記等)超出現行 docs/test-matrix.md;全面矩陣屬 tracker #23,於實作 Phase 前補齊。
8. **§26 Phase Acceptance Report**:欄位清單已明,模板待建(tracker #35)。

## 三、與進行中工作的關係

- §9.6 表二程序(舊版擷取、新舊比較、比較報告、RA 核定、未核定前 PENDING_RA_REVIEW)與現行「表二全文含否待 Stage 3 檢視」方向一致;Stage 3 報告的表別字樣統計為其前置輸入。
- §6 匯入狀態語彙(ACCEPTED/ACCEPTED_WITH_WARNING/REJECTED/MANUAL_REVIEW_REQUIRED)已納入 TC-20260802-04 之報告結論格式。
- §31 官方研究連結清單:屬未來實作 Phase 的查核事項;依 RDL-005,任何官方規則資料仍不得經 web 逕行取得,技術文件查核不在此限。

## 四、追蹤表已同步更新

#16、#18、#22、#23、#35 之備註已依本審查更新;R6/R7 待 RA 裁決後回填。
