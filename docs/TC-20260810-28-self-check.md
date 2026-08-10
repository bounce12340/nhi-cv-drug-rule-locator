# TC-20260810-28 建置者自我檢查報告

> 本報告為建置者自查紀錄，不構成獨立驗收或最終 PASS；最終判定由派發方／驗收方執行。

## 產出檔案

- `apps/clinician/App.tsx`：新增多筆候選的中英文輕量事實陳述、以畫面實際顯示筆數代入文案，並新增不帶警告底色的 `multipleReview` 樣式；查無資料與規則逐字查詢仍使用原提示及 `styles.review`。
- `apps/clinician/src/drug-review-presentation.ts`：新增純呈現判定，區分精確命中、多筆候選、章節候選與查無資料，不修改查詢結果或 domain 旗標。
- `apps/clinician/src/drug-review-presentation.test.ts`：新增 5 項守護測試，涵蓋三種查詢情境、篩選後實際筆數、章節導覽、樣式、雙主題對比與受保護提示。
- `docs/TC-20260810-28-self-check.md`：本自我檢查報告。

`apps/clinician/dist/**` 僅由必要的 Expo Web export 重建，非手寫產品來源檔。

## 驗收標準自查

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| `EXACT_MATCH` 無提示 | 通過 | 純呈現測試以 `manualReviewRequired: false` 驗證回傳 `undefined`。 |
| `MULTIPLE_MATCHES` 顯示輕量提示 | 通過 | 多筆狀態且旗標為 `true` 時回傳 `multipleCandidates`；App 使用新增的 `styles.multipleReview`，該樣式沒有背景色。 |
| 筆數等於畫面實際顯示數 | 通過 | App 唯一傳入值為 `visibleMatches.length`；測試分別鎖定未篩選 42 筆與篩選後 7 筆。 |
| 章節篩選後仍顯示且使用篩選後筆數 | 通過 | 章節候選總數大於 1 時維持 `multipleCandidates`；測試以章節候選 42 筆、畫面顯示 5 筆驗證輸出為 5。 |
| 新文案保留全部候選與不代選事實 | 通過 | 中英文都明載目前畫面列出全部符合目前條件的候選，並明載工具不代為選取品項或期別。 |
| 查無資料維持原樣 | 通過 | `NOT_IN_VALIDATED_DATASET` 仍回傳 `unavailable`，App 仍以 `styles.review` 顯示原 `manualReviewDrug` 文案。 |
| `manualReviewRule` 與 `styles.review` 不變 | 通過 | 兩語 `manualReviewRule` 逐字仍在；`styles.review` 區塊變更前後 SHA-256 均為 `b0c16a7bffea1f1ce84beccbb69140d335f65247f32e97465bbc97d3608d73b2`。 |
| domain 與 API 不變 | 通過 | `packages/**` 聚合 SHA-256 變更前後均為 `0d0422146d7f22ca13493b468bccb7e640488a3859d08e1a1ea0c6a5a99efc56`；`apps/api/**` 均為 `78a3e54ae6203a0b5b0e42756572736d90dd0c4871c542a68dba08faa4fceb97`。domain 三處計算仍為 `status !== "EXACT_MATCH"`。 |
| 中英字典鍵集合相等 | 通過 | TC-22 既有守護測試於完整測試中通過；本次兩語同步新增同一個 `multipleReviewDrug` 鍵。 |
| 既有測試零修改 | 通過 | 六個既有 clinician 測試檔之逐檔 SHA-256 均與變更前相同，且其既有 byte-lock 測試通過。 |

## 無障礙對比

新 `multipleReview` 樣式使用 `theme.color.textMuted`，實際承載面為透明的結果區，因此以 `theme.color.background` 計算 WCAG 文字對比：

| 主題 | 前景色 | 背景色 | 實測對比 | 4.5:1 目標 |
| --- | --- | --- | --- | --- |
| 明亮 | `#40566D` | `#F4F7FB` | `7.0557:1` | 通過 |
| 暗黑 | `#CBD5E1` | `#0B1220` | `12.6107:1` | 通過 |

新增測試直接以專案既有 `contrastRatio` 計算兩組色票，並要求皆不低於 `4.5:1`。

## Bundle 與紅線複核

- 解碼 Expo Web bundle 後，新中文與英文輕量文案各出現 1 次。
- 查無資料的舊中英文案依要求各保留 1 次；bundle 呈現路由顯示 `multipleCandidates` 使用 `multipleReviewDrug`／`styles.multipleReview`，`unavailable` 才使用 `manualReviewDrug`／`styles.review`，舊文案已不在多筆路徑。
- TC-22 英文決策詞彙四項與中文決策語式五項逐項掃描，bundle 命中數全部為 0。
- `scripts/**` 聚合 SHA-256 變更前後均為 `534ff1baa6a62fbab475c5b04a85515fb929e4d6729cc39eb721c793e1be47b7`；`packages/**`、`apps/api/**`、`scripts/**`、`.github/**`、資料目錄及治理檔案皆未修改。
- 未執行任何 git 指令，未新增套件，未修改任何既有測試。

## 測試數增減

- 基準：33 files、302 tests。
- 完成：34 files、307 tests。
- 增量：新增 1 個測試檔、5 項測試；既有 302 項全數保留。

## 五項檢查

| 檢查 | 結果 | 摘要 |
| --- | --- | --- |
| `pnpm typecheck` | 通過（exit 0） | 7 個 workspace projects 完成 typecheck。 |
| `pnpm test` | 通過（exit 0） | 34 files passed；307 tests passed。 |
| `pnpm export:web` | 通過（exit 0） | Expo Web bundle 成功輸出。 |
| `pnpm worker:types` | 通過（exit 0） | `worker-configuration.d.ts` 為最新；以 `WRANGLER_LOG_PATH=/tmp/tc-20260810-28-wrangler-types.log` 重跑，避開唯讀的預設日誌路徑。 |
| `pnpm worker:dry-run` | 通過（exit 0） | 使用 `/tmp` 日誌路徑完成 dry-run，輸出 `--dry-run: exiting now.`，未部署。 |

## 建置者執行紀錄

- role：builder
- provider：OpenAI
- model display name：Codex GPT-5.6 Sol
- exact model ID：`gpt-5.6-sol`
- reasoning effort：xhigh
- run/session ID：UNAVAILABLE（執行環境未提供可稽核 session ID）
- 任務 ID：`TC-20260810-28`
- repo：`/home/user/nhi-cv-drug-rule-locator`
- branch／head SHA：UNAVAILABLE（派工單禁止執行 git 指令，建置者未自行查詢或建立 commit）
- 工具權限：workspace-write；網路未使用；未執行外部寫入或部署
- 結果：建置者自查項目通過；待獨立驗收

## 驗收方待辦

- 未執行 `scripts/governance-scan.sh`。該腳本內部會使用 git，與本單禁令衝突，須由驗收方補跑並判定結果。
- iOS／Android 模擬器、裝置及讀屏實測受本環境限制未執行；本報告只宣告自動化測試、靜態對比計算與 Web export 結果。
