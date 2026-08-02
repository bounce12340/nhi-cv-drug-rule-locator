# 效能預算(§30 #27;依 v3.2 §2.6 與 §19)

初始專案目標,**不是平台保證**;必須在中階實機與診間常見網路條件實測後調整(不得只以高階開發機或高速 Wi-Fi 驗證、不得只用 Debug Build)。任何調整經 RA/產品負責人核定後更新本文件。

## 1. 核心自訂指標:TTFCA

**Time to First Clinical Answer** — 從醫師開始搜尋,到畫面首次完整呈現可供閱讀的藥品名稱、適用規則摘要、重要例外/警示及現行健保支付價所需的時間。TTFCA 必須進入每一階段的效能測試與 production observability。

## 2. 診間互動目標(v3.2 §2.6,p75/p95)

| 指標 | 目標 |
| --- | --- |
| Warm start 至搜尋欄可操作 | p75 ≤ 600ms |
| Cold start 至搜尋欄可操作 | p75 ≤ 1.5s |
| 本機搜尋候選回應 | p95 ≤ 100ms |
| 健保代碼精確查詢至首屏摘要 | p95 ≤ 1.0s |
| 一般診間網路,輸入完成至首屏摘要 | p95 ≤ 1.5s |
| 標準查詢任務(不含登入) | 90% 使用者 ≤ 3 次主要互動 |

## 3. Web Core Web Vitals(v3.2 §19.1,實機 p75)

LCP ≤ 2.5s;INP ≤ 200ms;CLS ≤ 0.1。

## 4. API 目標(v3.2 §19.1)

| 端點類型 | 目標 |
| --- | --- |
| 健保代碼精確查詢 | p95 ≤ 500ms |
| 藥品名稱候選搜尋 | p95 ≤ 500ms |
| 已快取規則查詢 | p95 ≤ 300ms |
| 未快取規則查詢 | p95 ≤ 800ms |
| 一般 API | p99 ≤ 2s |
| 伺服器錯誤率 | < 1% |

## 5. Native 量測項(v3.2 §19.5;數值目標於 Mobile PoC 後訂定,標【待人工確認】)

Cold/Warm/Hot Start、Time to Initial Display、Time to Fully Interactive、TTFCA、search suggestion latency、screen transition latency、frame jank、crash-free sessions、Android ANR rate、memory、network request count、bundle size。測試涵蓋:中階裝置、低記憶體 Android、支援範圍內較舊 iPhone、4G/高延遲/封包遺失、cold/warm cache、背景返回。

## 6. 量測與閘門

- 每 Phase Acceptance 附本預算逐項對照表;未達標項目需 RA/產品負責人核定「調整目標」或「阻擋發布」。
- 診間 SLI(v3.2 §19.6):Search Field Ready Time、Search Suggestion Latency、Exact Code Result Latency、TTFCA、Price Comparison Render Time、Regulatory Data Sync Success Rate、Stale Data Exposure Rate、Crash-free Rate、ANR Rate。
- 效能分析一律去識別聚合,不記錄完整醫師身分或完整查詢文字(v3.2 §19.6)。

現況註記:Phase 0 demo 核心為純函式本地查詢,無網路路徑;本預算於 API/客戶端實作 Phase 起生效量測。
