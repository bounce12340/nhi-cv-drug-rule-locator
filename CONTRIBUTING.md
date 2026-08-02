# Contributing

## 安全與資料邊界

- 所有 Phase 0 藥品、價格與規則示例必須明確標記 `DEMO_DATA_ONLY`，且必須是虛構資料。
- 不得加入病人姓名、病歷號、檢驗值、診斷、處方、身分證字號或任何可識別病人資料。
- 不得新增「符合／不符合給付」邏輯或文案；規則資料未經 RA 與官方來源核定前不可匯入。
- 不得把 secrets 寫進程式、設定檔、測試或提交紀錄。

## 開發流程

1. 先閱讀 `docs/spec-source-status.md`、`docs/regulatory-decision-log.md`。
2. 變更 deterministic 行為時，同步新增負向測試（不自動修正、不自動選候選、無法驗證即 fail closed）。
3. 執行 `pnpm typecheck`、`pnpm test`、`pnpm export:web`、`pnpm worker:types`、`pnpm worker:dry-run`。
4. 任何正式資料匯入或對外部署都需要獨立審核與明確授權，Phase 0 不進行。

## Commit 級合併治理

角色分工：**Claude Fable 5** 負責派發工作、於派發時設定驗收標準、並執行驗收；**Codex GPT-5.6 Sol（xhigh reasoning）** 負責依派工範圍與驗收標準進行編寫與建置。

1. Fable 5 派發每項工作時，須一併記錄工作範圍與可檢核的驗收標準；Sol 依派工內容建置，不得自行擴大範圍。
2. Fable 5 必須針對待合併的精確 head commit SHA、依派發時設定的驗收標準做獨立驗收。建置者不得自行宣告最終 PASS；任何情況下，驗收者不得同時是該 head SHA 的實際建置者。若某 head SHA 係由 Fable 5 親自建置，該 SHA 的驗收須由使用者或另行指定的獨立驗收者執行。
3. 只有該精確 head SHA 的驗收為 PASS，且所有必要 GitHub CI（`typecheck`、`test`、Expo Web export、Worker types、Worker dry-run）皆成功，才可合併至 `main`。
4. PASS 只對記錄的 head SHA 有效。任何新增 commit、amend、rebase 或其他 head SHA 變更，都會使先前驗收失效，必須重新執行驗收與必要 CI。
5. 驗收為 FAIL 或 BLOCKED 時，不得合併。
6. 對已符合前述條件的 commit，使用者預先授權代理提交 GitHub PR 並合併至 `main`，不需逐次再次確認；合併後必須回報產生的 merge commit SHA。
