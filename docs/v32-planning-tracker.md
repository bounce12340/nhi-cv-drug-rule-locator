# v3.2 §30 planning-artifact tracker

Tracks the 36 pre-implementation outputs that Master Project Prompt v3.2 §30 requires from the main model before formal feature code. Updated 2026-08-02. Statuses: DONE (exists and current), PARTIAL (started; gaps listed), TODO (not started), BLOCKED (cannot proceed in this environment or before a listed gate).

| # | §30 artifact | Status | Location / blocker |
| --- | --- | --- | --- |
| 1 | 專案 Scope 與 Non-goals | DONE | docs/scope-and-non-goals.md |
| 2 | Regulatory Source Inventory | DONE (living) | docs/spec-source-status.md + docs/source-register/(9 筆)— 全部收件檔出處宣告+雜湊複驗完成;v3.2 真實性確認、公告本文擷取收件、CSV 原生性已釐清(整理轉出);唯一開放來源缺口:舊版表二全文 |
| 3 | CSV 與資料完整性報告 | DONE | docs/stage3/stage3-verification-report.md — 雙重覆核 ACCEPTED(列數/空值/重複/格式/跨檔/母本 187/187);首個資料集已依 RDL-012 入 governed 儲存 |
| 4 | 法規及法律有效版本矩陣 | BLOCKED | Requires official texts and RA-designated effective-version confirmation |
| 5 | 尚待 RA／法律／個資確認事項 | DONE (living list) | docs/phase1-readiness.md (P0 blockers) + docs/spec-source-status.md (missing sources) |
| 6 | Data Residency ADR | DONE | docs/adr/ADR-002-data-residency.md(PROPOSED;關鍵值待 RA/法務確認,Phase 2 前定案) |
| 7 | Cloudflare Architecture ADR | DONE | docs/adr/ADR-003-cloudflare-architecture.md(基準核定;D1 production 採用待 §17.2 實測閘門) |
| 8 | Cross-platform Mobile ADR | PARTIAL | Expo is the de-facto Phase 0 choice; formal ADR incl. alternatives comparison TODO |
| 9 | Mobile Framework PoC Report | BLOCKED | iOS/Android device or simulator runs are unavailable in this environment (no Xcode, no adb) |
| 10 | Clinical Workflow／Human Factors Map | TODO | — |
| 11 | Price Comparison Semantics ADR | DONE | docs/adr/ADR-005-price-comparison-semantics.md(語意定案;群組核定流程待資料到位) |
| 12 | Authentication 與 Native Secure Storage ADR | DONE | docs/adr/ADR-006-auth-secure-storage.md(需求基準;實作參數 Phase 2 定案) |
| 13 | Analytics／Logging Privacy ADR | DONE | docs/adr/ADR-004-analytics-logging-privacy.md(生效;保存期間數值 Phase 5 前定案) |
| 14 | App Store／Google Play Compliance Matrix | TODO | — |
| 15 | API Version Compatibility 與 Mobile Release Strategy | DONE | docs/adr/ADR-007-api-compat-mobile-release.md(策略定案;數值 Phase 4 前定案) |
| 16 | GitHub Repository 與 Ruleset 設計 | PARTIAL | CONTRIBUTING.md + CI(六項檢查)exist;branch protection/rulesets、CODEOWNERS、docs/runbooks/、docs/acceptance/ 未建(v3.2 §21.2/§21.4;見 docs/v32-alignment-review.md #3/#4) |
| 17 | Monorepo 與 Shared Contract 設計 | PARTIAL | docs/architecture.md; reconciliation with the v3.2 §17.9 suggested layout TODO |
| 18 | Phase Branch Strategy | DONE(R6 已裁決) | 規劃/治理期維持現行單分支逐 PR(核准之階段性偏離);實作期切換 v3.2 §21.3 三層模型(docs/v32-alignment-review.md #1);§24 Phase 編號對照表另待建(alignment #6) |
| 19 | Milestones 及 Issues | TODO | — |
| 20 | Subagent Task Contracts | DONE | docs/task-contract-template.md；首單 docs/task-contracts/TC-20260802-01.md |
| 21 | Model Routing ADR | DONE | docs/adr/ADR-001-model-routing.md (requester consent 2026-08-02) |
| 22 | Agent Execution Manifest 與 Attestation Schema | PARTIAL | `.github/attestations/`(task-contract/v1)運作中;自 TC-04 起補 `prompt_or_task_contract_hash` 欄位(v3.2 §21.5.4);`terra-pro-build-attestation`/`sol-pro-acceptance` Required Checks 與正式 JSON Schema TODO |
| 23 | Requirement-to-Test Matrix | PARTIAL | docs/test-matrix.md covers demo-core invariants; v3.2-wide matrix TODO |
| 24 | Cross-platform Feature Parity Matrix | TODO | — |
| 25 | Web／iOS／Android Wireframes | TODO | — |
| 26 | WCAG 2.2 AA 與 Native Accessibility 驗收標準 | DONE | docs/accessibility-criteria.md(工具選型待確認) |
| 27 | Web、Native 與 TTFCA Performance Budget | DONE | docs/performance-budget.md(native 數值目標待 PoC 後訂定) |
| 28 | Threat Model | PARTIAL | docs/threat-model.md covers Phase 0 surface; expand for auth/data phases |
| 29 | Data Flow Diagram | DONE | docs/data-flow-diagram.md(現況+目標態;目標態節點標【待人工確認】) |
| 30 | Processor Register 草稿 | TODO | — |
| 31 | Data Retention Schedule 草稿 | TODO | — |
| 32 | Database Schema、Search Index 與 Migration Plan | TODO | Structure-only drafts permitted; authoritative fields wait for governed intake (RDL-005) |
| 33 | Drug Lookup／Price Comparison API Specification | TODO | Structure-only drafts permitted; same gate as #32 |
| 34 | Backup／Restore／Web Rollback／Mobile Rollback Plan | TODO | — |
| 35 | Phase Acceptance Report Template | DONE | docs/acceptance/phase-acceptance-report-template.md(v3.2 §26 全欄位) |
| 36 | Production Release Gate | BLOCKED | Production release itself is blocked by RDL-005 and later-phase reviews |

Working rule: artifacts are authored without importing any received payload (RDL-007); every assumed-but-undecided point is marked 待人工確認 in the artifact itself.
