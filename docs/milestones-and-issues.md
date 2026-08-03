# Milestones 與 Issues 規劃(§30 #19)

GitHub Milestones/Labels/Issues 之結構規劃。本文件為權威規劃來源;實際在 GitHub 建立屬執行動作,於本文件驗收合併後批次進行並回寫連結(不阻塞本批)。

## Milestones(工作階段對應)

| Milestone | 內容 | 進入條件 | 完成條件 |
| --- | --- | --- | --- |
| M0 規劃與治理(現行) | §30 規劃產物、governed intake、派工/驗收制度 | — | 追蹤表可行項全 DONE;PARTIAL 有結案路徑 |
| M1 正式資料基礎 | 表二程序(方向 B)、資料集擴充、解釋程序常態化 | 舊版表二全文收件 | Stage 1–6 常態運轉、第二個資料集入庫 |
| M2 帳號與隱私 | 登入、醫師資格驗證、隱私告知、DSR 流程 | 法律/個資【待核】項核定 | ADR-006 實作+隱私文件上線 |
| M3 規則引擎與價格比較 | domain 擴充、price-comparison 套件、api-client 生成 | M1 資料到位 | R2T 矩陣覆蓋+全項驗收 |
| M4 行動上架 | RN+Expo PoC、商店合規、雙店上架 | ADR-008 PoC 通過 | 合規矩陣逐條 PASS/N-A+上架 |
| M5 營運與觀測 | SLI/SLO、備援/回復演練、retention 排程 | M2 之後 | 演練證據+Phase Acceptance Report |

註:與 v3.2 §24 Phase 編號之對照表另建(alignment #6 追蹤中),本表以工作內容為準。

## Labels 分類法

- 類型:`type:build`(Codex 派工)/`type:planning`(主模型)/`type:governance`(RA 裁決)/`type:incident`
- 治理閘門:`gate:rdl-005`(碰觸 BLOCKED 邊界)/`gate:intake`(governed intake 程序)
- 平台:`platform:domain|api|web|ios|android`
- 優先級:`P0`(阻斷)/`P1`/`P2`/`P3`

## Issue 規則

- 建置類 Issue 必須載明:對應派工單編號(TC-)、驗收標準、關閉條件=對應 PR 合併(`PASS <sha7>`+CI 六項綠)。
- 治理類 Issue 記錄裁決請求與對應 RDL 編號;Issue 內一律 hash-only,不得貼任何收件 payload。
- Issue 模板(task/governance/incident)置於 `.github/ISSUE_TEMPLATE/`【待執行,不阻塞】。

## 執行狀態

Milestones/Labels/模板之實際建立=本文件合併後之後續執行動作;建立後於本文件回寫各 Milestone 連結(living document)。
