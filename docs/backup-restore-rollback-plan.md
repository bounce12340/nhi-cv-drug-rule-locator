# Backup / Restore / Rollback 計畫(§30 #34)

依 v3.2 §17.7、§27;RPO/RTO 數值屬業務決策【待人工確認,Phase 5 前由 RA/產品負責人核定】。

## 1. 備份

| 資料 | 機制 | 註 |
| --- | --- | --- |
| D1(規則/藥品/價格/帳號) | D1 Time Travel(近期 PITR)+ 定期匯出至 R2 之長期備份 | 匯出頻率與保存年限【待核】;備份加密與存取權限最小化 |
| R2 官方文件 | 版本化 + 異地副本策略【待核】 | 原始文件不可變(RDL-013 精神) |
| repo(治理紀錄/governed 儲存) | git 歷史即備份;GitHub 私有 repo | data/governed 受 CI 守護 |
| Secrets | 不備份於 repo;於 secret store 之輪替與復原程序【待核】 | — |

## 2. Restore

- 重大 migration 前:D1 bookmark + 匯出快照,演練後才執行。
- 定期(至少每季【待核】)還原演練:還原至隔離環境 → 一致性與 audit 檢查 → 記錄演練報告。
- 正式資料庫還原=高風險操作:雙人核准、維護模式、事後驗證(§27)。

## 3. Web Rollback

- Production 只部署 main 受保護 commit;保留前一版本 artifact 可即時切回。
- **法規資料錯誤 ≠ App 錯誤**:切回前一 `regulatory_data_release`(資料層回滾),不動應用版本;由 RA 簽記撤銷(revoked)並依 runbook §8 重走修正入庫。

## 4. Mobile Rollback(§27;無法即時回滾之補償)

五層手段,依情境選用(ADR-007 第 5 點):
1. 停止 staged rollout(阻止擴散)
2. Feature Flag 關閉問題功能(不影響基本安全者)
3. Server 端:API 相容維持 + 法規資料 server-driven 修正(免等審查)
4. 安全/法規錯誤:server-side kill switch 或最低版本閘門(強更前確認新版已可下載)
5. 緊急新版送審(最後手段)

## 5. Runbooks(§19.4,Phase 5 落地於 docs/runbooks/)

Turnstile 中斷、Email 服務中斷、D1 降級、法規資料錯誤更正、帳號疑似冒用、管理員帳號失陷、個資外洩、錯誤部署回滾、D1 restore、維護模式——每本含觸發條件/step-by-step/責任人/事後檢討模板。

## 6. 現況註記

Phase 0–規劃期無 production 部署,本計畫為實作期藍圖;governed 儲存已具備「撤銷不刪除」與 CI 完整性守護,為資料層回滾的既有基礎。
