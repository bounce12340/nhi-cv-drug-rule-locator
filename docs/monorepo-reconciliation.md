# Monorepo 佈局對齊(§30 #17)

現行佈局 vs v3.2 §17.9 建議佈局的對應與遷移計畫。原則不變:**三端絕不各自實作法規判定邏輯**(§17.9)——單一 domain 套件是行為一致性的來源。

## 對應表

| v3.2 §17.9 建議 | 現行 | 處置 |
| --- | --- | --- |
| apps/api | apps/api ✅ | 沿用 |
| apps/web | apps/clinician(Expo web 輸出) | Phase 4:依 ADR-008 定案後拆分或保留 universal app(RN+Expo 可單專案覆蓋 web+mobile,屆時以一個 apps/mobile 併同 web 輸出滿足意圖)【待 PoC 後決定拆分方式】 |
| apps/mobile | 同上 | 同上 |
| apps/admin | 無 | Phase 4 新建(Web-only 管理後台) |
| packages/domain | packages/domain ✅ | 沿用;正式規則引擎於實作期在此擴充 |
| packages/regulatory-contracts | packages/contracts | 實作期改名/擴充為 regulatory-contracts(避免破壞現有 import,遷移與 CI 同步) |
| packages/api-client | 無 | Phase 3:自 OpenAPI/契約生成 |
| packages/price-comparison | 無 | Phase 3:依 ADR-005 語意實作(獨立套件,domain 不含價格排序邏輯) |
| packages/design-tokens | 無 | Phase 4 |
| packages/validation | 無 | Phase 2+(欄位驗證共用) |
| packages/test-fixtures | 分散於各套件 *-fixtures.ts | 實作期集中(虛構資料紅線不變) |
| packages/observability-contracts | 無 | Phase 5(log/SLI schema) |
| packages/source-intake | (v3.2 未列,本專案新增) | 保留——governed intake 是本專案的治理資產;維持與 runtime 套件隔離 |

## 遷移原則

- 無建置步驟(TS 原始碼直接匯出)慣例維持,直到某平台工具鏈強制要求為止。
- 每次佈局變動走派工單+驗收;import 路徑變動附 codemod 或全量 typecheck 證據。
- 新套件建立時同步更新 CLAUDE.md 與本表。

## 結論

現行佈局是 §17.9 的**合法前綴**:已存在者全部對應,缺少者皆屬尚未到期的 Phase 產物。無需立即遷移;各套件於對應 Phase 建立。
