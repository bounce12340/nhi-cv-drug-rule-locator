# ADR-008: Cross-platform Mobile 方案(§30 #8)

- Status: **PROPOSED — 優先候選 React Native + Expo;正式鎖定以 PoC 實機證據為條件**(v3.2 §17.8 明文不得未經 PoC 即鎖定;PoC 屬 tracker #9,本環境 BLOCKED,須於具 Xcode/adb 之環境執行)
- 2026-08-05 RA 裁示(A5,RDL-017):**PoC 排程照案核定**——優先候選維持 React Native + Expo;鎖定仍以 PoC 實機證據為唯一條件,PoC 為 B 軌實機作業(本環境不可執行),完成後依 §17.8 逐項對 performance-budget 目標評定方轉 ACCEPTED。
- 依據:v3.2 §17.8、§2.4、§17.9;現況:Phase 0 已以 Expo SDK 57 建立 demo 客戶端

## Context

第一個正式 release 必須同時具備 Web、iOS 可送審、Android 可送審(§2.4),三端共用同一 API/法規版本/價格來源,且不得各自實作規則引擎。

## 評估(§17.8 三候選)

| 維度 | React Native + Expo | Flutter | Capacitor |
| --- | --- | --- | --- |
| 與 Workers TypeScript API 共用型別 | ◎ 單一 TS 生態 | △ Dart 需 codegen | ◎ TS |
| Web 共用 | ◎ react-native-web(Phase 0 已用) | △ Flutter Web 成熟度風險 | ◎ 即 Web |
| 原生體驗/導覽慣例 | ○ | ◎ | △ WebView 殼疑慮(§2.4 禁純殼) |
| Secure Storage/深鏈/無障礙 | ○ 生態成熟 | ○ | △ 依插件 |
| AI Subagent 可維護性 | ◎ 全 TS 單 repo | △ 雙語言 | ○ |
| 既有資產 | ◎ Phase 0 即 Expo | ✗ 重寫 | △ |

**暫定結論**:React Native + Expo 為優先候選——單一 TypeScript、與現有 Phase 0 與 Workers 生態最合、AI 代理維護成本最低;Capacitor 因 §2.4「原生 App 不得只是 WebView 包裝」風險列末位。

## PoC 鎖定條件(§17.8,於實機執行)

Cold/Warm start、搜尋索引速度、長條文捲動、Keychain/Keystore 憑證保存、Universal Links/App Links、Turnstile 登入流、Accessibility、App size——逐項達 docs/performance-budget.md 目標方可將本 ADR 轉 ACCEPTED;未達標則回到本表重評。

## Consequences

- Phase 0 demo 繼續以 Expo 演進不視為鎖定;正式 mobile 實作(v3.2 Phase 4)前必須完成 PoC 並更新本 ADR。
- monorepo 佈局調整(§17.9 之 apps/mobile 等)隨本 ADR 定案一併處理(tracker #17)。
