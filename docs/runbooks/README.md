# 作業手冊索引

本目錄以索引與引用整合既有作業文件，不複製其程序。只有本專案已有事實依據、且原先確實缺少的「憑證輪替」與「線上異常處置」收在本目錄；既有文件仍是各自範圍的唯一詳細來源。

| 作業範圍 | 權威文件 | 涵蓋內容 |
| --- | --- | --- |
| 部署、網域與上線煙霧測試 | [上線執行手冊](../launch-runbook.md) | Cloudflare Worker／Pages 部署、憑證存放位置、自訂網域、Actions secrets 與既有煙霧測試 |
| 官方類資料入庫 | [Phase 1 governed intake runbook](../phase1-intake-runbook.md) | 來源登錄、驗證與雙重覆核、RA 逐案核准、版本化入庫及變更管理六階段 |
| 備份、還原與回滾 | [Backup / Restore / Rollback 計畫](../backup-restore-rollback-plan.md) | D1／R2／repository 備份藍圖、restore 控制、Web／Mobile 回滾途徑；其中標示待核或未落地者仍不得視為已驗證 |
| Cloudflare 部署憑證輪替 | [憑證輪替手冊](credential-rotation.md) | 先換新並驗證、以 token ID 撤銷舊憑證、撤銷後再驗部署管線 |
| 已知線上異常處置 | [線上異常處置手冊](incident-response.md) | 端點、四處 bundle hash、API 煙霧的查核順序，以及四類實際發生過的異常 |

本索引不建立 [Backup / Restore / Rollback 計畫](../backup-restore-rollback-plan.md) §5 所列的未來 Phase 5 手冊，也不把規劃中的步驟表述為已執行。Repository 的 branch protection / rulesets 仍未設定；tracker #16 因此維持 `PARTIAL`。
