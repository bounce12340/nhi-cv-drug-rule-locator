# TC-20260810-30 建置者自我檢查

## 1. 結論與範圍

- 已完成 `RuleLookupResult` 呈現層重構：規則來源資訊維持常駐，主檔辨識區塊移至官方條文之前，官方條文改為「章節 → 單元」兩層樹狀 disclosure。
- 主檔辨識元件本體未修改，只移動其呼叫位置；TC-29 §10.2 的查無不渲染、有條文但零代碼為非互動內容、有代碼維持預設收合三條分支均由原有測試繼續守護。
- 官方章節與單元預設皆收合。每個章節可獨立展開；每個單元可獨立展開；各章節另有「全部展開」與「全部收合」單元控制。
- 收合單元標頭只使用 `unitId`、`unitType`、`tableLabel` 與非空 `clausePath`。`verbatimText` 只出現在單元的 `expanded` 分支，直接以 `{unit.verbatimText}` 完整輸出，未截斷、摘要、預覽、正規化或加省略號。
- 本輪未修改引擎、資料、相依套件、lockfile 或契約禁止路徑。

## 2. 本輪產物

| 路徑 | 說明 |
| --- | --- |
| `apps/clinician/App.tsx` | 主檔前置；新增常駐 `sourceTag`；新增兩層樹、章節批次控制、雙語文案、無障礙狀態與響應式樣式 |
| `apps/clinician/src/rule-text-tree.ts` | 新增純函式：依來源順序分組章節，以及只挑取准許的單元結構性中繼資料 |
| `apps/clinician/src/rule-drug-identification-ui.test.ts` | 只改寫 TC §5 具名的兩個舊版面斷言，沒有修改其他既有斷言 |
| `apps/clinician/src/rule-text-tree-ui.test.ts` | 新增 7 項守護測試，涵蓋常駐資訊、順序、兩層預設收合、43／8／16 單元、批次控制、節錄禁令、位元組一致與無障礙 |
| `apps/clinician/dist/` | `pnpm export:web` 產生的驗證輸出 |
| `docs/TC-20260810-30-self-check.md` | 本報告 |

收尾 SHA-256：

| 檔案 | SHA-256 |
| --- | --- |
| `apps/clinician/App.tsx` | `39238486a265f8ae631d02c08cbe9d998800284a754b98fecd371e41c2e6aeeb` |
| `apps/clinician/src/rule-drug-identification-ui.test.ts` | `f666a21ad9117a4d7a9d1d6196a5369572e168605959e44f45444b46e17d0708` |
| `apps/clinician/src/rule-text-tree.ts` | `0dcb15f289d64d41371795e4b8c244368bfbc8a71c057a132a9241c4e06abd56` |
| `apps/clinician/src/rule-text-tree-ui.test.ts` | `df4f5fdd9226961a476a3238eae4ddf4ee6d574a1c8f71d5836311518fe3e32e` |

## 3. §1、§2：順序與常駐來源資訊

`RuleLookupResult` 的實際來源碼順序為：

1. `result.warning` 與官方原文語言提示
2. 查詢狀態、`result.datasetVersion`、生效日、`result.sourceTag`、必要時的 `manualReviewRule`，以及既有章節導覽
3. `RuleDrugMasterIdentificationBlock`
4. 官方條文樹 `ruleTextTree`

新測試以來源路徑釘死 `result.warning`、`result.datasetVersion`、`result.sourceTag` 與 `manualReviewRule` 均位於主檔及官方條文 disclosure 之前；它們不在任何 `expanded` 分支內。既有 `manualReviewRule` 中英文文案未修改。

## 4. §3、§4：樹狀結構、節錄禁令與逐字保真

- `groupRuleTextUnitsBySection` 只依 `section` 分組，維持輸入章節順序及章節內單元順序。實際資料驗證為 2.6.1 = 43、2.6.2 = 8、2.6.3 = 16。
- 單一單元查詢仍產生一個章節節點，不會省略第一層。
- 章節狀態以 `useState(false)` 起始；單元展開集合以空 `Set` 起始，因此首次呈現為兩層全部收合。
- 章節 toggle 與各單元 toggle 均有 `accessibilityRole="button"` 及 `accessibilityState={{ expanded }}`；各章節的全部展開會同時開啟章節並加入該章所有單元 ID，全部收合會清空該章單元展開集合。
- `getRuleUnitStructuralMetadata` 的回傳鍵集合固定為 `unitId`、`unitType`、`tableLabel`、`clausePath`，不含 `verbatimText`。元件來源測試另確認收合標頭路徑沒有 `verbatimText`。
- 逐字值只在 `{expanded ? (...) : null}` 內直接輸出為 `>{unit.verbatimText}</Text>`；整個分組前後的 `verbatimText` 陣列逐項完全相等，且該元件沒有 `slice`、`substring` 或省略號路徑。
- 主檔辨識元件的函式內容未改；五個欄位、主檔版本、`DRUG_ITEM_MASTER_WARNING`、查無文案、預設收合及 TC-29 §10.2 三情形均保持原行為。

## 5. §5 具名斷言改寫

測試 `"leaves every verbatim unit outside the collapsed master block and byte-identical"` 只改寫契約具名的兩處舊版面斷言：

| 舊斷言 | 新的等價強度斷言 |
| --- | --- |
| `RuleUnitCard` 不含 `expanded` | `RuleUnitCard` 必須帶 `accessibilityState={{ expanded }}`，且 `expanded` 分支必須先於逐字輸出位置 |
| 官方 `result.units.map` 先於主檔 | `RuleDrugMasterIdentificationBlock` 必須先於 `RuleTextSectionNode` |

`expect(cardSource).toContain(">{unit.verbatimText}</Text>")` 保留成立；`theme-i18n-ui.test.ts` 的同名斷言亦未修改並通過。其餘既有測試未修改；七個既有 clinician 測試檔的 SHA-256 與 TC-29 收尾值逐一相同。

## 6. 測試數增減與五項檢查

- 契約基準：36 files／324 tests。
- 完成：37 files／331 tests。
- 增量：新增 `rule-text-tree-ui.test.ts` 一檔、7 tests；既有測試數未減少。
- 定向結果：`rule-drug-identification-ui.test.ts`、`rule-text-tree-ui.test.ts`、`theme-i18n-ui.test.ts` 合計 3 files／23 tests 全數通過。

| 檢查 | 結果 | 證據摘要 |
| --- | --- | --- |
| `pnpm typecheck` | PASS（exit 0） | 7 個 workspace projects 完成，clinician strict TypeScript 通過 |
| `pnpm test` | PASS（exit 0） | 37 files passed；331 tests passed |
| `pnpm export:web` | PASS（exit 0） | Expo Web export 完成；單一 bundle 844,825 bytes |
| `pnpm worker:types` | PASS（exit 0） | 使用獨立 `/tmp` Wrangler 日誌；型別檔為最新 |
| `pnpm worker:dry-run` | PASS（exit 0） | 使用獨立 `/tmp` Wrangler 日誌；輸出 `--dry-run: exiting now.`，未部署 |

## 7. Web bundle 驗證與增量

- Bundle：`AppEntry-20c4c027141cd9fbb010bac943be95cf.js`，844,825 bytes，SHA-256 `92dcea6d6e3b2087b978226f972542b9945b3dbcc0e19e242e5386af7e2a5ad3`。
- TC-29 補正後基準為 839,165 bytes；本輪增加 5,660 bytes，約 +0.674%。未新增套件。
- 解碼 bundle 的 Unicode escape 後，「官方條文」／`Official rule text`、中英文全部展開／全部收合、來源標記／source tag 與規則資料集版本均有命中。
- eligibility 黑名單中文 5 詞與英文 4 詞逐項掃描，全部 0 命中。

## 8. 無障礙、對比與觸控目標

- 新增的章節 toggle、章節全部展開／全部收合按鈕及單元 toggle，均使用雙語可見文案與相同的 `accessibilityLabel`；章節與單元 toggle 另揭露 expanded state。
- 三類新控制皆有 `minHeight: 44`；容器允許 `flexWrap`，沿用既有響應式寬度而未新增固定畫面寬度。
- 新介面在 `surface` 上沿用既有 theme token。WCAG 對比守護的實測比率如下：明亮主題 `textStrong` 17.747:1、`textMuted` 7.581:1、`linkText` 7.563:1；暗黑主題依序為 15.837:1、11.161:1、9.938:1，全部高於一般文字 4.5:1。
- 本輪未宣稱完成實機 iOS／Android、讀屏或 Web Vitals 測試。

## 9. 禁止路徑與驗收方待辦

- `packages/**`、`data/governed/**`、`scripts/**`、`apps/api/**`、`.github/**` 的全檔內容聚合 SHA-256 在開工及收尾均為 `5d68504cb66d003d5376deb705d79c2c1ec5f2e4b840283e4404b85ae734230c`，沒有內容變更。
- 未執行任何改變 repository 狀態的 git 指令，亦未以 git 查詢結果充作驗收查核。
- 未執行 `scripts/governance-scan.sh`，本報告不宣稱 governance-scan 結果；依契約由驗收方補跑並獨立判定。
- 本報告是建置者自我檢查，不取代派發方／驗收方的獨立驗收。
