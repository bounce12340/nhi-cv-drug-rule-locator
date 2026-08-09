# v3.2 §30 planning-artifact tracker

Tracks the 36 pre-implementation outputs that Master Project Prompt v3.2 §30 requires from the main model before formal feature code. Updated 2026-08-02. Statuses: DONE (exists and current), PARTIAL (started; gaps listed), TODO (not started), BLOCKED (cannot proceed in this environment or before a listed gate).

| # | §30 artifact | Status | Location / blocker |
| --- | --- | --- | --- |
| 1 | 專案 Scope 與 Non-goals | DONE | docs/scope-and-non-goals.md |
| 2 | Regulatory Source Inventory | DONE (living) | docs/spec-source-status.md + docs/source-register/(10 筆)— 全部收件檔出處宣告+雜湊複驗完成;v3.2 真實性確認、公告本文擷取收件、CSV 原生性已釐清;舊版表二全文 2026-08-03 收件,開放缺口歸零(表一舊版是否同檔涵蓋待 Stage 3 認定) |
| 3 | CSV 與資料完整性報告 | DONE | docs/stage3/stage3-verification-report.md — 雙重覆核 ACCEPTED(列數/空值/重複/格式/跨檔/母本 187/187);首個資料集已依 RDL-012 入 governed 儲存 |
| 4 | 法規及法律有效版本矩陣 | BLOCKED | Requires official texts and RA-designated effective-version confirmation |
| 5 | 尚待 RA／法律／個資確認事項 | DONE (living list) | docs/phase1-readiness.md (P0 blockers) + docs/spec-source-status.md (missing sources) |
| 6 | Data Residency ADR | DONE | docs/adr/ADR-002-data-residency.md(PROPOSED;關鍵值待 RA/法務確認,Phase 2 前定案) |
| 7 | Cloudflare Architecture ADR | DONE | docs/adr/ADR-003-cloudflare-architecture.md(基準核定;D1 production 採用待 §17.2 實測閘門) |
| 8 | Cross-platform Mobile ADR | DONE | docs/adr/ADR-008-cross-platform-mobile.md(PROPOSED;RN+Expo 優先候選,鎖定以 PoC 實機證據為條件) |
| 9 | Mobile Framework PoC Report | BLOCKED | iOS/Android device or simulator runs are unavailable in this environment (no Xcode, no adb) |
| 10 | Clinical Workflow／Human Factors Map | DONE | docs/clinical-workflow-map.md(設計基準;HF 驗證於 Phase 4/6 實機執行) |
| 11 | Price Comparison Semantics ADR | DONE | docs/adr/ADR-005-price-comparison-semantics.md(語意定案;群組核定流程待資料到位) |
| 12 | Authentication 與 Native Secure Storage ADR | DONE | docs/adr/ADR-006-auth-secure-storage.md(需求基準;實作參數 Phase 2 定案) |
| 13 | Analytics／Logging Privacy ADR | DONE | docs/adr/ADR-004-analytics-logging-privacy.md(生效;保存期間數值 Phase 5 前定案) |
| 14 | App Store／Google Play Compliance Matrix | DONE | docs/store-compliance-matrix.md(法律定性與聲明文案【待核】;送審前逐條轉 PASS/N-A) |
| 15 | API Version Compatibility 與 Mobile Release Strategy | DONE | docs/adr/ADR-007-api-compat-mobile-release.md(策略定案;數值 Phase 4 前定案) |
| 16 | GitHub Repository 與 Ruleset 設計 | PARTIAL | CONTRIBUTING.md + CI(六項檢查)、.github/CODEOWNERS、docs/runbooks/、docs/acceptance/ exist;branch protection/rulesets 仍未於 GitHub 設定,落差 #4 維持開放,須由 RA 於 repository 介面裁量設定;不得因檔案存在宣稱 §21.2 已全部完成 |
| 17 | Monorepo 與 Shared Contract 設計 | DONE | docs/architecture.md + docs/monorepo-reconciliation.md(現行佈局為 §17.9 合法前綴;缺項對應各 Phase 建立) |
| 18 | Phase Branch Strategy | DONE(R6 已裁決) | 規劃/治理期維持現行單分支逐 PR(核准之階段性偏離);實作期切換 v3.2 §21.3 三層模型(docs/v32-alignment-review.md #1);§24 Phase 編號對照表另待建(alignment #6);2026-08-05 A7(RDL-017)再確認維持現制、無變更結案 |
| 19 | Milestones 及 Issues | DONE | docs/milestones-and-issues.md(M0–M5 結構+Labels/Issue 規則;GitHub 實際建立為合併後執行動作,建立後回寫連結) |
| 20 | Subagent Task Contracts | DONE | docs/task-contract-template.md；首單 docs/task-contracts/TC-20260802-01.md |
| 21 | Model Routing ADR | DONE | docs/adr/ADR-001-model-routing.md (requester consent 2026-08-02) |
| 22 | Agent Execution Manifest 與 Attestation Schema | DONE | docs/schemas/task-contract-attestation.v1.schema.json + docs/attestation-schema.md(祖父條款 TC-01–03/terra-pro-build;CI 機器驗證待派工;Required Checks 歸 #16 執行域) |
| 23 | Requirement-to-Test Matrix | DONE (living) | docs/r2t-matrix.md(v3.2 全域 A–E 區,COVERED/PROCESS/PLANNED/GATED)+docs/test-matrix.md(示範核心細目);PLANNED 到期未建測=milestone 不得關閉 |
| 24 | Cross-platform Feature Parity Matrix | DONE | docs/feature-parity-matrix.md(I/E/D 分級;實機 parity 證據俟 PoC/Phase 4) |
| 25 | Web／iOS／Android Wireframes | DONE | docs/wireframes.md(低擬真文字版;文案【待核】;W5/W6 為後續 Phase 佔位) |
| 26 | WCAG 2.2 AA 與 Native Accessibility 驗收標準 | DONE | docs/accessibility-criteria.md(工具選型待確認) |
| 27 | Web、Native 與 TTFCA Performance Budget | DONE | docs/performance-budget.md(native 數值目標待 PoC 後訂定) |
| 28 | Threat Model | DONE (living) | docs/threat-model.md 擴充:Phase 1+ 現況面(governed 資料、attestation 鏈、憑證)+Phase 2/3 目標態;Phase 2 進入閘門=正式 STRIDE review |
| 29 | Data Flow Diagram | DONE | docs/data-flow-diagram.md(現況+目標態;目標態節點標【待人工確認】) |
| 30 | Processor Register 草稿 | DONE | docs/processor-register-draft.md(法律角色分類與審查狀態【待核】,Phase 2 前核定) |
| 31 | Data Retention Schedule 草稿 | DONE | docs/data-retention-schedule-draft.md(期限數值【待核】;governed 資料集依 RDL-013 永久) |
| 32 | Database Schema、Search Index 與 Migration Plan | DONE(structure-only) | docs/db-schema-migration-plan.md(資料域/帳號域分離;權威欄位語意【待核】俟 governed intake,RDL-005 閘門不變) |
| 33 | Drug Lookup／Price Comparison API Specification | DONE(structure-only) | docs/api-specification.md(端點面+白名單防火牆+版本策略;OpenAPI 於 Phase 3 正式化;同 #32 閘門) |
| 34 | Backup／Restore／Web Rollback／Mobile Rollback Plan | DONE | docs/backup-restore-rollback-plan.md(藍圖;RPO/RTO 數值 Phase 5 前核定) |
| 35 | Phase Acceptance Report Template | DONE | docs/acceptance/phase-acceptance-report-template.md(v3.2 §26 全欄位) |
| 36 | Production Release Gate | BLOCKED | Production release itself is blocked by RDL-005 and later-phase reviews |

Working rule: artifacts are authored without importing any received payload (RDL-007); every assumed-but-undecided point is marked 待人工確認 in the artifact itself.
