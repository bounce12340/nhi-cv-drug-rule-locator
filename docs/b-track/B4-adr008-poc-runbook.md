# B4:ADR-008 實機 PoC 執行手冊(A5 排程,RDL-017)

> 執行者:具 **macOS+Xcode**(iOS 側)與 **Android SDK/adb** 之工程環境者。本 repo 之雲端環境 BLOCKED,無法代跑。目的:取得 v3.2 §17.8 要求之實機證據,決定 ADR-008(React Native+Expo)轉 ACCEPTED 或回評估表。

## 1. 前置

- 裝置:**中階 Android 實機**(非旗艦)+**支援範圍內較舊 iPhone**;禁止只用模擬器/高階機(performance-budget.md 明文)。
- Build:**Release/production build**(禁 Debug build 量測);Expo SDK 57,`pnpm install` 後依 Expo 標準流程產出 dev-client/EAS build 或 prebuild+原生建置。
- 網路:量測含 4G/高延遲/封包遺失情境(可用系統網路調節工具)。

## 2. 兩波量測(對應 ADR-008 §PoC 鎖定條件)

**W1(現在可測——現有藥品查詢〔官方項目主檔與公告資料分區呈現〕+官方規則逐字查詢兩個分頁即可承載):**

| 項 | 目標(performance-budget.md) | 證據 |
| --- | --- | --- |
| Cold start 至搜尋欄可操作 | p75 ≤ 1.5s | 每裝置 ≥20 次量測分佈 |
| Warm start 至搜尋欄可操作 | p75 ≤ 600ms | 同上 |
| 本機搜尋候選回應 | p95 ≤ 100ms | 錄影+時間戳 |
| 長條文捲動(官方逐字查詢結果) | 無明顯 jank(frame 記錄) | 效能剖析輸出 |
| App size | 記錄實際值(目標於 PoC 後訂定,§19.5) | build 產物數據 |
| Accessibility 基礎 | 讀屏可導覽、對比達標(docs/accessibility-criteria.md) | 檢測清單逐項 |

**W2(隨 Phase 2 功能齊備後測):**

| 項 | 前置 |
| --- | --- |
| Keychain/Keystore 憑證保存 | ADR-006 實作後 |
| Universal Links/App Links 深鏈 | 網域+深鏈實作後(m2-auth-detail-design §4) |
| Turnstile 登入流 | 登入實作後 |

## 3. 證據格式(逐項)

裝置型號/OS 版本/build 識別(commit SHA)/量測日期/原始數據檔或錄影/量測者。彙整為單一報告檔交 RA。

## 4. 判定與回登

- 依 [README.md](README.md) §2 入台帳。**W1+W2 全項達標** → ADR-008 轉 ACCEPTED(tracker #9 結案、monorepo 佈局調整 tracker #17 隨之啟動)。
- 任一項未達標 → 回 ADR-008 評估表重評(Flutter/Capacitor 重新計分),**不得帶病鎖定**(§17.8)。
- W1 先行完成可先入台帳為部分證據;鎖定判定必待兩波齊備。
