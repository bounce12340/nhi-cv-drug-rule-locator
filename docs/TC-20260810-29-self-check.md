# TC-20260810-29 建置者自我檢查

## 1. 結論與範圍

- 本輪完成 `apps/clinician/` 規則逐字查詢結果之藥品主檔辨識區塊，以及 7 項 UI 守護測試。
- 新區塊預設收合；中英文標題均說明它是「條文中出現之代碼」在藥品主檔的記錄並標示筆數。展開後才建立清單 UI。
- 逐字條文卡片仍逐單元完整渲染，沒有任何段落收合、隱藏、替換、更正或重組；辨識區塊位於全部逐字卡片之後，不是逐字卡片的一部分。
- 區塊只顯示代碼，以及主檔的中文品名、英文品名、成分、規格量與單位、劑型。主檔查無時保留代碼並顯示固定查無文案，不以條文文字填補。
- 本輪沒有修改查詢語意、相依套件、lockfile 或禁止路徑。

## 2. 本輪產物

| 路徑 | 說明 |
| --- | --- |
| `apps/clinician/App.tsx` | 接入既有 domain 純函式；新增雙語標題、筆數、展開／收合控制、主檔版本與原樣警語、五個辨識欄位、固定查無文案，以及沿用 768px 決策的響應式卡片排列 |
| `apps/clinician/src/rule-drug-identification-ui.test.ts` | 新增 7 項 UI／整合守護測試，涵蓋 116 筆實際整合、分區、收合與無障礙、五欄及排除欄位、查無、逐字保留、斷點與黑名單 |
| `apps/clinician/dist/` | `pnpm export:web` 產生的驗證輸出；單一 Web bundle 為 `AppEntry-ce4b4a4fd7415869f5f837506e94c3f7.js` |
| `docs/TC-20260810-29-self-check.md` | 本報告 |

`App.tsx` 收尾 SHA-256 為 `12240efecde520da1e853d66d481e4a747b00fb6d642eceae98efe86ebe46cf8`；新增測試檔為 `cc3c26917868a2cb76984d9f7b25cfcacd40cd68ba9cb2ed32c43fd6241c0a11`。

## 3. 續作產物與既有測試保護

§9.1 三檔本輪未寫入，收尾 SHA-256 與開工盤點完全相同：

| 路徑 | SHA-256 |
| --- | --- |
| `packages/domain/src/rule-drug-identification.ts` | `7d6f52385466ba26649ecb7807ba93c1819c25166f53c807b1757561f3988609` |
| `packages/domain/src/rule-drug-identification.test.ts` | `fb670205c33d8843a1227b920545f5e427c0d2baf2725fa51a9c87797db29586` |
| `packages/domain/src/index.ts` | `a09927b86496e8dba3989d77799962c7afd8340d2bd74c9f13f326df89a9791a` |

7 個既有 clinician 測試檔亦未修改；收尾 SHA-256：

| 檔案 | SHA-256 |
| --- | --- |
| `consolidated-ui.test.ts` | `f88069b11fc4385dfe356e9b35cf5e9b2de6a4328626bd425e3e8836146e3572` |
| `drug-item-master-ui.test.ts` | `450204d6bc309da0d9216a2275f6e56b886a81afd65b8d90b987c2a3734af540` |
| `drug-item-ui-integration.test.ts` | `32af2f26d03f801b8d12dd66f168a66686592c3ad6c951b67b3afa183090d1c2` |
| `drug-review-presentation.test.ts` | `d7eda95de1c041f757d85215988d239a66c744cc28216f322f24d9e8e1360093` |
| `price-presentation-ui.test.ts` | `54a8a0b3a078270498e8d05c09bf2b55bc26c7e9cb47a0956ac38cf61dc2fd0a` |
| `theme-i18n-ui.test.ts` | `f7477e94dec288cd807e0d06fccb461219414dd529d99411fd11c81c8b85c1a8` |
| `ui-preferences.test.ts` | `eaf389f30c05c13fd58c2bcad97eebd7955c6e2a1a635b95b971a091285efcfa` |

## 4. §2 嚴格分區與逐字保護

- 規則區塊仍顯示 `result.datasetVersion`、`result.warning` 與每個 `unit.verbatimText`；主檔辨識區塊另行顯示 `DRUG_ITEMS_DATASET_VERSION` 與逐字輸出的 `DRUG_ITEM_MASTER_WARNING`。
- UI 只把 `verbatimText` 陣列交給既有 `identifyRuleDrugMasterRecords`；回傳型別只有 `nhiCode` 與 `masterItem`，UI 沒有取得或產生「條文中的藥品名稱」欄位，也沒有由行序推斷名稱與代碼的對應。
- 辨識欄位標籤均明示「主檔」；沒有宣稱條文所載名稱與主檔品名相同，亦沒有用主檔資料改寫條文。
- 新測試確認逐字內容在辨識前後逐位元相等，`RuleUnitCard` 不受收合狀態控制，且逐字卡片先於主檔辨識區塊完整渲染。
- `2.6.1` 實際整合測試取得 116 筆相異代碼，116 筆均有主檔記錄；查無分支仍以固定合成情境及 UI 文案守護。

定向結果：`apps/clinician/src/rule-drug-identification-ui.test.ts` 7／7；全部 clinician 測試 8 files／50 tests。

## 5. 測試數增減

- 現況基準：35 files／314 tests（既有 307 + 首輪 domain 7）。
- 完成：36 files／321 tests。
- 本輪增量：新增 1 個 UI 測試檔、7 項測試；既有 314 項全數保留並通過。

## 6. 五項檢查

| 檢查 | 結果 | 證據摘要 |
| --- | --- | --- |
| `pnpm typecheck` | PASS（exit 0） | 7 個 workspace projects 完成；新增 UI 與測試均通過 strict TypeScript |
| `pnpm test` | PASS（exit 0） | 36 files passed；321 tests passed |
| `pnpm export:web` | PASS（exit 0） | Expo Web export 完成；單一 bundle 838,146 bytes |
| `pnpm worker:types` | PASS（exit 0） | 以 `WRANGLER_LOG_PATH=/tmp/tc-20260810-29-wrangler-types.log` 執行；型別檔為最新 |
| `pnpm worker:dry-run` | PASS（exit 0） | 以獨立 `/tmp` 日誌執行；輸出 `--dry-run: exiting now.`，未部署 |

## 7. Web bundle 驗證與增量

- 接線前同環境基準 bundle：832,864 bytes。
- 最終 bundle：838,146 bytes；SHA-256 `1a70d64d9eba04f438b667b6e1d67255e1453bcb754fbe22425e4760e718e215`。
- 增量：+5,282 bytes（約 +0.634%）。未新增套件，增量來自 UI 元件、雙語文案與樣式。
- 解碼 bundle 的 Unicode escape 後，中英文區塊標題、中文展開／收合文案、英文展開／收合文案、雙語主檔版本標籤、主檔資料集版本值與主檔警語開頭各命中 1 次。
- TC-22 eligibility 黑名單中文 5 詞與英文 4 詞逐項掃描，全部 0 命中。

## 8. 效能與版面

- 預設狀態只渲染標題與收合控制；版本、警語與最多 116 張記錄卡均位於 `expanded` 條件內，展開後才建立清單 UI。
- 代碼辨識結果以 `useMemo` 綁定 `units`，同一查詢結果的介面狀態重繪不重算。
- 響應式版面沿用既有 `getClinicianLayoutMode` 純函式與 768px 斷點；手機為 100% 單欄，桌面可用雙欄 detail cells，外層與內容均允許換行，沒有新增固定寬度。
- 本輪維持 `docs/performance-budget.md` 既有預算；已驗證 bundle 增量與 Web export，未宣稱完成中階實機 Web Vitals、iOS／Android 或讀屏實測。

## 9. 紅線與驗收方待辦

- 本輪未對 `data/governed/**`、`packages/domain/src/generated/**`、`scripts/**`、`apps/api/**` 或 `.github/**` 施作內容變更，亦未改動任何既有測試或相依設定。
- 全程未執行任何 git 指令。
- 未執行 `scripts/governance-scan.sh`；該腳本內部會使用 git，與派工紅線衝突。本報告不宣稱其結果，須由驗收方補跑並獨立判定。
- 本報告是建置者自我檢查，不取代派發方／驗收方在精確 head SHA 上的獨立驗收。
