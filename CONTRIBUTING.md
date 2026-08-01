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

1. Terra 負責建置；Sol 必須針對待合併的精確 head commit SHA 做獨立驗收。建置者不得自行宣告最終 PASS。
2. 只有該精確 head SHA 的 Sol 驗收為 PASS，且所有必要 GitHub CI（`typecheck`、`test`、Expo Web export、Worker types、Worker dry-run）皆成功，才可合併至 `main`。
3. PASS 只對記錄的 head SHA 有效。任何新增 commit、amend、rebase 或其他 head SHA 變更，都會使先前驗收失效，必須重新執行 Sol 驗收與必要 CI。
4. Sol 驗收為 FAIL 或 BLOCKED 時，不得合併。
5. 對已符合前述條件的 commit，使用者預先授權代理提交 GitHub PR 並合併至 `main`，不需逐次再次確認；合併後必須回報產生的 merge commit SHA。
