# Requirement-to-Test Matrix(§30 #23,v3.2 全域)

需求→驗證證據的全域索引(living)。示範核心不變量的逐條斷言明細在 `docs/test-matrix.md`(本表 A 區之細目);本表補齊 v3.2 全案視角。狀態:**COVERED**(自動化證據存在)/**PROCESS**(以治理程序+人工紀錄為證據)/**PLANNED-Mx**(對應 milestone 到期時建測試)/**GATED**(受 RDL-005 或環境阻斷)。

## A. 核心查詢不變量(docs/architecture.md 五條)

| 需求 | 證據 | 狀態 |
| --- | --- | --- |
| 代碼正規化+exact match only、近似碼不更正 | packages/domain/src/index.test.ts | COVERED |
| 名稱多筆命中全列、不自動選取 | packages/domain/src/index.test.ts | COVERED |
| 日期/版本 fail-closed | packages/domain/src/index.test.ts | COVERED |
| 非 EXACT 一律 manualReviewRequired | packages/domain/src/index.test.ts | COVERED |
| 行為變更附負向測試 | CONTRIBUTING + PR 模板安全清單 | PROCESS |

## B. 傳輸與 API

| 需求 | 證據 | 狀態 |
| --- | --- | --- |
| 請求白名單防火牆(未知欄位=拒絕) | apps/api/src/index.test.ts(contracts parseLookupRequest) | COVERED |
| 三端點行為與示範警語 | apps/api/src/index.test.ts | COVERED |
| 日誌不含查詢內容 | Worker 實作慣例+api-specification.md 全域規則 5 | PROCESS(實作期加自動驗證 PLANNED-M3) |
| 規劃端點(auth/price-comparison)契約 | docs/api-specification.md(structure-only) | PLANNED-M2/M3 |

## C. Governed intake 與儲存

| 需求 | 證據 | 狀態 |
| --- | --- | --- |
| synthetic 通道隔離與全面 QUARANTINED | packages/source-intake/src/index.test.ts | COVERED |
| official 通道出處/語式/交叉分類 fail-closed | packages/source-intake/src/official.test.ts | COVERED |
| storage-manifest 結構與摘要決定性 | packages/source-intake/src/storage.test.ts | COVERED |
| repo 內 governed store 持續驗證(逐檔雜湊/目錄純淨/依賴隔離) | packages/source-intake/src/governed-store.test.ts(CI 每次執行) | COVERED |
| 紅線樣式攔查(代碼樣式/文號/價格字樣/病人欄位) | scripts/governance-scan.sh(CI 第六檢查) | COVERED(tripwire) |

## D. 治理程序(commit 級)

| 需求 | 證據 | 狀態 |
| --- | --- | --- |
| PASS 綁定精確 head SHA、驗收者≠建置者 | PR 模板 merge gate+合併紀錄+session 紀錄 | PROCESS |
| 派工單雜湊入 attestation(§21.5.4) | docs/schemas/task-contract-attestation.v1.schema.json | PROCESS(CI 機器驗證待派工) |
| 六項 CI 檢查全綠才可合併 | .github/workflows/ci.yml | COVERED |
| Required Checks 強制(branch protection) | 歸 #16 執行域 | PLANNED-M0(需管理介面) |

## E. 後續 Phase 需求(到期建測)

| 需求 | 規格來源 | 狀態 |
| --- | --- | --- |
| 登入/資格驗證/DSR 行為 | ADR-006、api-specification.md | PLANNED-M2 |
| 價格比較語意(單一套件、不在 domain 排序) | ADR-005 | PLANNED-M3 |
| 無障礙(WCAG 2.2 AA/VoiceOver/TalkBack) | docs/accessibility-criteria.md | PLANNED-M4 |
| 效能預算(含 TTFCA) | docs/performance-budget.md | PLANNED-M4/M5 |
| 三端 parity(I 級零差異) | docs/feature-parity-matrix.md | PLANNED-M4(實機) |
| 商店合規逐條 PASS/N-A | docs/store-compliance-matrix.md | PLANNED-M4 |
| 備援/回復/回滾演練 | docs/backup-restore-rollback-plan.md | PLANNED-M5 |
| iOS/Android 原生執行驗證 | tracker #9 | GATED(環境無 Xcode/adb) |
| 正式法規/價格資料正確性 | governed intake(RDL-005) | GATED(逐資料集 INTAKE-APPROVE) |

## 維護規則

新需求(含每張派工單的驗收標準)上線前先入本表對應區;PLANNED 列到期未建測=該 milestone 不得驗收關閉。本表與 test-matrix.md 於每次行為變更 PR 同步。
