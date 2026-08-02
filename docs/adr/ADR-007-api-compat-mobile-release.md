# ADR-007: API 版本相容與 Mobile Release 策略(§30 #15)

- Status: **ACCEPTED as strategy**(具體版本窗數值與 store 流程參數於 Phase 4 前定案【待人工確認】)
- 依據:v3.2 §17.10、§17.12、§21.10、§27

## Context

App Store/Google Play 審查與使用者更新有延遲,而健保規則與價格照公告日生效——資料時效不能被 App 版本綁架;不同使用者會同時跑不同 App 版本。

## Decision

1. **Server-driven regulatory data**:法規、支付價、例外清單、正式摘要一律由後端發布資料提供,不硬編碼於 App binary;App 顯示現用 `regulatory_data_version` 與 `price_data_version`(§17.10)。
2. **版本閘門**:維護 `minimum_supported_version` 與 `recommended_version`(`client_release_versions`,§7.5);**只有安全性或契約不相容才強制更新**,且須清楚理由並確認新版已可下載;舊 App 無法安全解讀新規則時 **fail closed**,不得錯誤顯示(§17.10)。
3. **API 相容範圍**:每次發布核定向後相容範圍並記錄;跨版本行為以 Feature Parity Matrix(tracker #24)追蹤;三平台共用同一 API/法規版本/價格來源(§2.4)。
4. **發布梯度**:PR 驗證 build → Phase 整合 build → TestFlight/Play Internal(Closed)Testing → store 送審 build → **staged rollout** production(§17.12、§27);Production signing 材料僅存受保護 GitHub Environments,builder 永不可及;送審/發布需 Sol Pro 驗收+指定人工核准。
5. **回滾策略分層**(§27):停止 rollout/下架版本/Feature Flag 關閉/API 相容維持/緊急新版——五種手段的適用情境於 runbook 明列;法規資料錯誤走「切回前一 Regulatory Data Release」而非回滾整個 App;安全或法規錯誤具 server-side kill switch 或最低版本閘門。
6. **本機索引與離線**:版本化 manifest+hash 驗證、增量同步、顯示 `last_synced_at`;離線快照明標且逾期不得冒充最新;帳號關閉後本機資料封鎖(§17.11)。

## Consequences

- `regulatory_data_manifests` 與 `client_release_versions` 進入 schema 設計(tracker #32)。
- Feature Flag 框架(高風險功能預設關)於 Phase 3+ 引入。
- Mobile rollback runbook(tracker #34)引用本 ADR 第 5 點的分層。
