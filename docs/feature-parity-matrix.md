# Cross-platform Feature Parity Matrix(§30 #24)

Web/iOS/Android 三端功能對等矩陣。對等分級:**I=必須完全一致**(法規語意,由單一 domain 套件保證)、**E=體驗等價**(流程相同,平台慣例可異)、**D=允許差異**(平台特性)。三端絕不各自實作法規判定邏輯(docs/monorepo-reconciliation.md 原則)。

## 現況(Phase 0,Expo universal 單一程式碼)

| 功能 | 分級 | Web | iOS | Android | 備註 |
| --- | --- | --- | --- | --- | --- |
| 藥碼/藥名查詢與正規化 | I | ✅ | ✅* | ✅* | @nhi-cv/domain 單一實作 |
| 三態結果(EXACT/MULTIPLE/NOT_IN_VALIDATED_DATASET) | I | ✅ | ✅* | ✅* | 不自動選取、不自動更正 |
| as-of 日期與版本 fail-closed | I | ✅ | ✅* | ✅* | 視窗外一律 NOT_IN_VALIDATED_DATASET |
| 示範警語+無病人資料聲明 | I | ✅ | ✅* | ✅* | 固定字串,不可縮短或折疊 |
| manualReviewRequired 顯示 | I | ✅ | ✅* | ✅* | 非 EXACT 一律 true |
| 搜尋框自動聚焦 | E | ✅ | ✅* | ✅* | 鍵盤行為依平台 |

\* iOS/Android 為同一 Expo 程式碼之預期行為;本環境無法實機驗證(tracker #9 BLOCKED),於 PoC 與 Phase 4 以實機證據補驗。

## 後續 Phase(規劃)

| 功能 | 分級 | 三端策略 |
| --- | --- | --- |
| 登入+醫師資格驗證(Phase 2) | E | 同一流程;憑證儲存依平台 secure storage(ADR-006) |
| 價格比較(Phase 3) | I(語意)/E(呈現) | 排序與比較語意依 ADR-005 單一套件;表格版面可依螢幕調整 |
| 無障礙 | E | 各平台依 docs/accessibility-criteria.md 對應標準(WCAG 2.2 AA/VoiceOver/TalkBack) |
| 離線行為 | I | 一律 fail-closed,不以過期快取回答查詢【待核:是否完全禁用離線查詢】 |
| 推播/資料更新通知(Phase 5+) | D | 【待設計】 |

## 驗收規則

新功能上線前必須先在本表登錄分級;**I 級功能之三端行為差異一律視為缺陷**。實機 parity 驗證證據掛於各 Phase Acceptance Report;本表隨功能演進即時更新(living document)。
