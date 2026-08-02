# ADR-004: Analytics 與 Logging 隱私(§30 #13)

- Status: **ACCEPTED**(現行 Phase 已生效;取樣率/保存期間數值與工具選型【待人工確認】,Phase 5 前定案)
- 依據:v3.2 §15.2、§16、§18.2、§19.3、§19.6;現況:docs/privacy-data-inventory.md、API 結構化 log 已符合

## Context

醫師查詢紀錄與帳號連結後可能反映專業關注,不得當一般分析事件(§16);log 與分析是最容易滲漏個資的通道。

## Decision

1. **Log 欄位 allowlist**(§19.3):結構化 log 只允許事件類型、結果狀態、計數、request_id、資料版本、時間;**永不記錄**:查詢內容、密碼、token、完整 email、完整醫師證書字號、完整電話。現行 API 已依此實作,列入 code review checklist。
2. **第三方紅線**:不使用 session replay、廣告 SDK、Advertising ID;不向第三方分析平台同時傳送醫師識別+查詢內容;新 SDK 一律過 §18.6 六項審查。
3. **產品分析**:僅聚合/去識別/假名化;效能指標(TTFCA、SLI)以事件類型+匿名化計時+資料版本聚合;不建立醫師個人使用輪廓;管理者不得以查詢紀錄做醫師績效或商業分析(§16)。
4. **分離原則**:安全日誌(登入、權限、管理操作)與產品分析日誌分離儲存與權限;error stack 出境前遮罩。
5. **保存**:log 取樣率與保存期間【待人工確認,Phase 5 前由 RA 核定並記入 retention schedule(tracker #31)】;預設不永久保存。
6. **查詢歷史功能**(§8.4/§16):若提供,預設裝置端、可清除、不上傳第三方;跨裝置同步需另案隱私評估。

## Consequences

- governance/code review 增加檢核點:任何新增 log 欄位須對照 allowlist;CI 可於未來加 log-schema lint【待評估】。
- Phase 5 observability 配置(SLO、alerts)必須以本 ADR 為邊界。
- 修訂需 RA 核可。
