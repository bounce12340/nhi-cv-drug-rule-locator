# TC-20260807-22 建置者自我檢查報告

日期：2026-08-07（UTC）

## 1. 派工、前置閱讀與邊界

| 項目 | 結果 |
| --- | --- |
| 派工單 SHA-256 | `0c20c38f540b1ae1816afc69906ac7da53ad147c19fd2b96ba9f55f2e3b3898a`，MATCH |
| 前置閱讀 | 已完整讀取派工單、`docs/accessibility-criteria.md`、TC-21 自檢、`apps/clinician/App.tsx`、`apps/clinician/src/` 全部 UI 輔助與既有測試、五項 CI 命令與效能預算 |
| 執行 git 指令 | 無 |
| 禁改範圍 | `data/governed/`、`packages/domain/src/generated/`、`apps/api/`、`scripts/` 全樹內容摘要前後均為 `b39f6dac2c3b423510e76cb5844fbbfcfdcebec3e720570adf26d68d2a5f999c` |
| domain 警語常數 | 無修改；守護測試直接取用 `RULE_TEXT_WARNING`、`ITEM_WARNING`、`DRUG_ITEM_MASTER_WARNING` 進行 UTF-8 byte equality |
| 寫入順序 | 產品來源與測試先完成並通過定向／完整檢查；確認報告路徑不存在後，最後一次新增本報告 |

`pnpm typecheck` 依既有 workspace 流程執行 Worker types generate，產出內容維持不變；Wrangler 設定／日誌導向 `/tmp/nhi-cv-tc22-xdg`。`pnpm export:web` 刷新既有 `apps/clinician/dist/` 驗證輸出。

未執行 iOS／Android simulator 或實機無障礙 smoke test，亦未宣稱通過實機項目；原生環境的 storage 缺失／例外則已由純函式測試驗證安全降級為 application-lifetime in-memory storage。

## 2. 檔案變更

| 檔案 | 變更 |
| --- | --- |
| `apps/clinician/App.tsx` | 新增系統預設／手動明暗主題、中文／English 切換、集中式 zh/en 介面字典、全部介面外殼翻譯、英文原文說明行、受保護文字 identity boundary、動態 token styles |
| `apps/clinician/src/ui-preferences.ts` | 新增 web localStorage／原生 in-memory 安全 storage、偏好讀寫、系統主題解析、缺鍵中文降級翻譯器、受保護文字 identity helper、明暗 theme tokens 與對比計算器 |
| `apps/clinician/src/ui-preferences.test.ts` | 新增 7 項：預設／持久化、無效偏好、系統主題、storage 例外降級、翻譯缺鍵、三不翻逐位元組、兩主題 AA 對比 |
| `apps/clinician/src/theme-i18n-ui.test.ts` | 新增 6 項：實際字典鍵集合、控制與持久化接線、App 色值 token 化、官方文字接線、英文黑名單、既有測試檔 byte lock |
| `apps/clinician/dist/` | `pnpm export:web` 產生的驗證輸出；單一 bundle 更新為 `AppEntry-00f7ffa4082a88b656b3dde452d27da0.js` |
| `docs/TC-20260807-22-self-check.md` | 本報告，於產品與驗證完成後新增 |

既有 UI 輔助／測試與 test matrix 均未修改，收尾 SHA-256：

| 檔案 | SHA-256 |
| --- | --- |
| `apps/clinician/src/consolidated-ui.test.ts` | `f88069b11fc4385dfe356e9b35cf5e9b2de6a4328626bd425e3e8836146e3572` |
| `apps/clinician/src/drug-item-master-ui.test.ts` | `450204d6bc309da0d9216a2275f6e56b886a81afd65b8d90b987c2a3734af540` |
| `apps/clinician/src/drug-item-ui-integration.test.ts` | `32af2f26d03f801b8d12dd66f168a66686592c3ad6c951b67b3afa183090d1c2` |
| `apps/clinician/src/drug-item-ui.ts` | `3c52de2968886c3ea83b991f7b631e62da0325a727c48cd3bc7753ad5e136a90` |
| `docs/test-matrix.md` | `1454099577f0fdc10523bae7f6565465e3401b6b003be8892a80da5a027367bd` |

## 3. 測試數

| 項目 | 實作前 | 實作後 | 差額 |
| --- | ---: | ---: | ---: |
| 測試檔 | 30 | 32 | +2 |
| 測試 | 279 | 292 | +13 |
| 通過 | 279 | 292 | +13 |

五個 clinician UI 測試檔定向執行為 28／28；完整 `pnpm test` 為 32 files／292 tests。三個 TC-21 既有 UI 測試檔另以固定 SHA-256 守護，證明未因舊中文 source assertion 而修改或放置未使用死字串。

## 4. 主題、持久化與 token 化

- 初始 theme preference 為 `system`，使用 `useColorScheme()`；手動選擇後儲存 `light`／`dark` 到 `nhi-clinician-theme`。
- web 使用 `localStorage`；無 storage 或 getter/setter 丟例外時，保留於 module-lifetime memory map。兩條路徑均有測試。
- `App.tsx` 的 hex／rgb／hsl 掃描為 CLEAN；全部 `color`、`backgroundColor`、`borderColor` 與 placeholder 色均來自 `THEME_TOKENS[theme]`。
- 明暗主題切換、語言切換與既有主要操作觸控高度均至少 44 CSS px。

### WCAG 2.2 AA 對比抽驗

計算採 WCAG sRGB relative luminance；本介面抽驗文字門檻為 4.5:1。

| 主題 | 範圍 | 前景／背景 | 比值 | 結果 |
| --- | --- | --- | ---: | --- |
| 明亮 | 規則警語 | `#FFFFFF`／`#352F58` | 12.36:1 | PASS |
| 明亮 | 主檔警語 | `#FFFFFF`／`#57251D` | 12.44:1 | PASS |
| 明亮 | 公告來源警語／英文說明 | `#174D38`／`#E7F4EE` | 8.62:1 | PASS |
| 明亮 | 無病人資料聲明 | `#173B4D`／`#E5F4FA` | 10.54:1 | PASS |
| 明亮 | 頁尾義務 | `#40566D`／`#F4F7FB` | 7.06:1 | PASS |
| 暗黑 | 規則警語 | `#211A2C`／`#D8D0F0` | 11.37:1 | PASS |
| 暗黑 | 主檔警語 | `#211A2C`／`#F1CFC5` | 11.59:1 | PASS |
| 暗黑 | 公告來源警語／英文說明 | `#D1FAE5`／`#163B30` | 10.88:1 | PASS |
| 暗黑 | 無病人資料聲明 | `#E0F2FE`／`#123348` | 11.49:1 | PASS |
| 暗黑 | 頁尾義務 | `#CBD5E1`／`#0B1220` | 12.61:1 | PASS |

## 5. 語言、缺鍵與三不翻

| 驗收點 | 證據 | 結果 |
| --- | --- | --- |
| 預設與持久化 | 無值／非法值皆回中文；手動 `zh`／`en` 儲存於 `nhi-clinician-language` | PASS |
| 字典集中與完整性 | `UI_COPY.zh`／`UI_COPY.en` 為唯一介面字典；TypeScript AST 守護測試核對兩者鍵集合精確相等且非空 | PASS |
| 缺鍵降級 | English 缺鍵先取 zh；雙側缺鍵／空值採明示中文 fallback，不回空白或 key | PASS |
| 官方逐字條文 | App 直接呈現 `unit.verbatimText`；以實際規則單元驗證 zh/en 前後 UTF-8 bytes 相等 | PASS |
| RA 核定警語 | App 直接呈現三個 domain warning 值；實際常數在 zh/en 下 UTF-8 bytes 相等 | PASS |
| 資料值 | 中文／英文品名、藥商、健保碼與來源價格樣本在 zh/en 下 UTF-8 bytes 相等；翻譯器只處理外殼 label/template | PASS |
| 英文固定說明 | 警語區在 English 模式顯示 `Official warnings and rule text appear in their original Chinese wording.` | PASS |

英文介面狀態只描述 record match／verified dataset 事實，篩選標籤採 `Changed in this announcement`、`3-month trial list`、`Table 2 items`；未產生給付結論。

## 6. Web bundle 驗證、黑名單與增量

量測對象為每次 `pnpm export:web` 後唯一的 `apps/clinician/dist/_expo/static/js/web/AppEntry-*.js`。

| 狀態 | Bytes | SHA-256 |
| --- | ---: | --- |
| TC-21 基準 | 810,074 | `b1260dce6c40088811b99a2f284431550ca2daa8e55dd7919359b8c67a5d397f` |
| TC-22 完成 | 827,431 | `f921d6aa2ac6dd521041802a0fded00c648e53f98d20bdb3d201992db0915385` |
| 增量 | **+17,357 bytes（+2.14%）** | — |

解開 bundle 的 `\\uXXXX` 字面後，以下全部存在：

- `主題：明亮（切換至暗黑）`、`主題：暗黑（切換至明亮）`
- `Theme: Light (switch to Dark)`、`Theme: Dark (switch to Light)`
- `中文`、`English`
- `Official warnings and rule text appear in their original Chinese wording.`

bundle 不分大小寫逐詞計數：

| 英文黑名單 | 命中數 |
| --- | ---: |
| `eligible` | 0 |
| `covered` | 0 |
| `reimbursable` | 0 |
| `qualifies` | 0 |

## 7. 五項檢查

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS；7 個 workspace typecheck 全部完成 |
| `pnpm test` | PASS；32 files／292 tests |
| `pnpm export:web` | PASS；單一 Web bundle 827,431 bytes |
| `pnpm worker:types` | PASS；`worker-configuration.d.ts` up to date |
| `pnpm worker:dry-run` | PASS；Total Upload 503.64 KiB／gzip 66.22 KiB；`--dry-run` 正常退出，未部署 |

## 8. 五項驗收結論

| 驗收項 | 結果 |
| --- | --- |
| 基準＋新增測試全綠 | PASS；279 + 13 = 292 |
| 主題 token／對比／持久化 | PASS；App 色碼掃描 0 命中，10 組抽驗全過，web/native-safe storage 測試全過 |
| 字典／缺鍵／三不翻／英文黑名單 | PASS；實際字典鍵集合、fallback、UTF-8 byte guard 與 source blacklist tests 全過 |
| bundle 控制字樣／固定說明 | PASS；7 個必要字樣皆在，四個黑名單詞皆 0 |
| 自我檢查報告 | PASS；檔案、測試、對比、bundle、五項檢查與增量均已列明 |

本報告為建置者自我檢查，不取代派發方／驗收方的獨立覆核；實機 accessibility smoke test 仍需在具備 iOS／Android 裝置的 Phase Acceptance 執行。
