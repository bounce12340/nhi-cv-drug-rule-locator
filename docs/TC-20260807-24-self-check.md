# TC-20260807-24 建置者自我檢查

- 派工單：`docs/task-contracts/TC-20260807-24.md`
- 角色：Codex GPT-5.6 Sol（builder）
- 日期：2026-08-07
- 基準：32 files／292 tests
- 完成：33 files／302 tests（新增 1 個測試檔、10 項測試；既有 292 項零修改）
- 本報告是建置者自我檢查，不取代 Claude Fable 5 對精確 head SHA 的獨立驗收。

## 1. 檔案變更

| 檔案 | 內容 |
| --- | --- |
| `apps/clinician/App.tsx` | 將公告價格對照移至每張主檔卡片的主檔詳細欄位之前；新增主檔快照事實提示；把價格沿革改為每卡獨立、預設收合且可無障礙操作的控制；補齊中英文介面文案與手機換行樣式 |
| `apps/clinician/src/drug-item-ui.ts` | 新增公告四欄位對照 resolver、快照提示條件純函式與 `2026-08-06` 主檔快照日期常數；均為零 I/O 呈現 helper，未改 domain 查詢 |
| `apps/clinician/src/price-presentation-ui.test.ts` | 新增 10 項正向、負向、條件矩陣、收合、原始值與手機版面測試 |
| `docs/TC-20260807-24-self-check.md` | 本自我檢查報告 |

`pnpm export:web` 另產生 gitignore 內的驗證輸出 `apps/clinician/dist/`；它不是原始碼變更。

## 2. §1 嚴格分區與顯著價格對照

公告價格對照的資料流為：

`item.nhiCode` → `resolveAnnouncementPriceComparison(nhiCode)` → exact-code 公告列 → `priceBefore`／`priceAfter`／`effectiveDate`／`coverageRule`

- resolver 的輸入只有代碼，不接受 `DrugItemMasterMatch`、`applicablePricePeriod` 或任何主檔價格。
- resolver 只從公告列解構四個欄位並回傳 frozen 物件；四欄任一缺少時不產生對照，不補值、不推論。
- UI 以 `原支付價 {priceBefore} → 初核價格 {priceAfter}` 呈現，並逐字顯示公告 `effectiveDate` 與 `coverageRule`；區塊同時顯示 `ITEM_DATASET_VERSION` 與未改寫的 `ITEM_WARNING`。
- 區塊位於主檔詳細欄位之前；非公告異動代碼的 `comparison` 為 `undefined`，不會渲染價格對照內容，也不以主檔值產生新價。
- 主檔的 `applicablePricePeriod.paymentPriceRaw` 僅留在獨立的「該查詢日期適用之支付價」區塊。

負向測試特別使用 `AC47928100` 驗證治理界線：主檔值與公告 `priceBefore` 恰同為 `2.93`，測試再把主檔 applicable price 置換成 sentinel；公告 resolver 仍只回公告列的 `2.93`／`2.78`，回傳物件沒有 `paymentPriceRaw`，helper 原始碼也沒有該識別字。這釘死了「即使數值相同，也不得把主檔價格與公告 `priceAfter` 配對」。

## 3. §2 主檔快照提示

`shouldShowMasterSnapshotNotice(asOfDate, nhiCode)` 的四格矩陣結果：

| `as_of_date` | 公告異動集合 | 提示 |
| --- | --- | --- |
| `2026-09-01` | 是 | 顯示 |
| `2026-08-31` | 是 | 不顯示 |
| `2026-09-01` | 否 | 不顯示 |
| `2026-08-31` | 否 | 不顯示 |

提示只陳述以下事實：

- 主檔資料集版本；
- 主檔為 `2026-08-06` 時點快照；
- 該主檔品項最後一筆價格期間的 ISO 起迄日；
- 上方公告對照另載快照日後、生效日為公告 `effectiveDate` 的異動。

提示不含價格值，不推算、不替換、不合併資料；`AC47928100` 在 `2026-09-02` 的主檔 `applicablePricePeriod.paymentPriceRaw` 測試仍為逐字 `2.93`。提示中英文文案的「正確／現行／應適用」與 eligibility 黑名單掃描均為 0。

## 4. §3 價格沿革收合

- `priceHistoryExpanded` 在 `DrugItemMasterCard` 內以 `useState(false)` 建立，因此每張卡片獨立、預設收合。
- 未呼叫 `preferenceStorage` 或 `localStorage`，狀態不持久化。
- 控制項是 `Pressable`，具有 `accessibilityRole="button"` 與 `accessibilityState={{ expanded: priceHistoryExpanded }}`。
- 中英文展開／收合標籤均顯示目前狀態及 `item.priceHistory.length` 筆數。
- 展開後仍直接依原排序映射 `item.priceHistory`，逐字使用 `period.startDateIso`、`period.endDateIso`、`period.paymentPriceRaw`；未刪除、重排或評價內容。
- 主檔 applicable price 區塊在收合條件之外，始終直接顯示 `applicablePricePeriod.paymentPriceRaw`。

## 5. §4 多筆與手機呈現

- `SIMVASTATIN 20 MG`、`as_of_date=2026-09-02` 維持 `MULTIPLE_MATCHES` 42 筆，沒有變更查詢語意或自動選取。
- 每筆結果都建立自己的卡片及沿革 state，並走相同的公告對照 resolver。
- 既有 768px 純函式斷點不變：767px 為 mobile、768px 為 desktop。
- 新增的沿革控制採 `flexWrap`，公告對照為可折行文字且 `flexShrink: 1`，未增加固定寬度。
- 測試資料中的 `paymentPriceRaw: "0.00"` 仍直接送入 `protectedText`，未隱藏、補值或解讀。

## 6. 新增測試與基準保護

新增 `apps/clinician/src/price-presentation-ui.test.ts` 共 10 項：

1. 57 筆異動公告的四欄位逐筆與公告來源相等且 resolver 結果 frozen。
2. 非異動代碼不產生對照。
3. 主檔 applicable price 不得與公告 `priceAfter` 配對的 sentinel 負向測試。
4. 對照區塊位於主檔詳細欄位前，且版本、警語與四欄位標籤齊備。
5. 快照提示四格條件矩陣。
6. `AC47928100` 的主檔 `2.93`、最後價格期間與提示引用欄位維持不變。
7. 快照提示中英文禁語掃描。
8. 每卡預設收合、無障礙狀態、筆數、中英控制標籤、不持久化。
9. 展開內容仍逐字取自完整 `priceHistory`，applicable price 永遠在條件外。
10. 成分多筆 42 筆、767px mobile 與 `0.00` 原值保護。

完整測試結果：`33 passed files / 302 passed tests`，即 `292 + 10`。

五個既有 clinician 測試檔 SHA-256 與實作前相同：

| 檔案 | SHA-256 |
| --- | --- |
| `consolidated-ui.test.ts` | `f88069b11fc4385dfe356e9b35cf5e9b2de6a4328626bd425e3e8836146e3572` |
| `drug-item-master-ui.test.ts` | `450204d6bc309da0d9216a2275f6e56b886a81afd65b8d90b987c2a3734af540` |
| `drug-item-ui-integration.test.ts` | `32af2f26d03f801b8d12dd66f168a66686592c3ad6c951b67b3afa183090d1c2` |
| `theme-i18n-ui.test.ts` | `f7477e94dec288cd807e0d06fccb461219414dd529d99411fd11c81c8b85c1a8` |
| `ui-preferences.test.ts` | `eaf389f30c05c13fd58c2bcad97eebd7955c6e2a1a635b95b971a091285efcfa` |

## 7. Web bundle 驗證

量測對象：`apps/clinician/dist/_expo/static/js/web/AppEntry-cf86727135a9ce7b173b8c1e8a6ce589.js`

- 大小：830,805 bytes
- SHA-256：`2c25a7ea5eba20f59ed9131082c4c90987c278ddca45da9c44d6fd131c352af3`
- 單一 AppEntry bundle：是

解開 bundle 的 `\\uXXXX` 字面後，以下均存在：

- 中英文公告價格對照字串；
- 中英文展開／收合標籤，含狀態與筆數 placeholder；
- `時點快照`、`2026-08-06` 與英文 snapshot 提示；
- `ITEM_WARNING` 完整逐字內容。

bundle 黑名單計數：

| 詞彙 | 命中 |
| --- | ---: |
| `符合給付` | 0 |
| `不符合給付` | 0 |
| `可申報` | 0 |
| `准予給付` | 0 |
| `不予給付` | 0 |
| `eligible` | 0 |
| `covered` | 0 |
| `reimbursable` | 0 |
| `qualifies` | 0 |

## 8. 五項檢查

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS；7 個 workspace typecheck 完成 |
| `pnpm test` | PASS；33 files／302 tests |
| `pnpm export:web` | PASS；單一 bundle 830,805 bytes |
| `pnpm worker:types` | PASS；exit 0，`worker-configuration.d.ts` up to date |
| `pnpm worker:dry-run` | PASS；exit 0，Total Upload 503.64 KiB／gzip 66.22 KiB，明確 `--dry-run: exiting now`，未部署 |

Wrangler 在預設環境曾嘗試將 debug log 寫入沙箱唯讀的 `/root/.config`；最終檢查只以 `XDG_CONFIG_HOME=/tmp/tc24-wrangler-config` 重新導向工具日誌，沒有修改命令語意、Worker 設定或 API 檔案。

## 9. 範圍與禁止事項核對

- 未執行任何 git 指令。
- 未新增相依套件；`pnpm-lock.yaml` SHA-256 驗證與實作前相同。
- `apps/api/**` 全檔 SHA-256 清單與實作前相同。
- `packages/domain/**`（含既有查詢函式、既有測試與 generated）全檔 SHA-256 清單與實作前相同。
- 未修改 `data/governed/**`、`scripts/**`、治理檔或既有測試。
- 未改 `lookupDrugItemMaster`、`lookupItems` 或任何 domain 查詢語意。
- RA 警語仍直接使用 `ITEM_WARNING`，中英文介面只翻譯 UI 標籤，不翻譯或改寫官方內容。
- 依環境治理限制，未宣稱 iOS／Android 實機 runtime 驗證；本次已完成 TypeScript、Vitest 與 Expo Web export 驗證。

## 10. 建置者結論

契約 §1 至 §4 的呈現要求、§5 禁止事項與 §6 可機器檢核項目均已在建置者自我檢查中滿足；最關鍵的公告／主檔價格分區由只接受代碼的公告 resolver 及 sentinel 負向測試共同鎖定。最終是否驗收通過，仍由派發方／驗收方針對精確 head SHA 獨立判定。
