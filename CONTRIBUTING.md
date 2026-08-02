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

## 派工與驗收作業（v2.0）

1. 每次派工必須依 `docs/task-contract-template.md` 開立派工單（Task Contract），存於 `docs/task-contracts/`；未明文列入派工單的檔案與工作一律視為禁區。
2. 建置者預設以 `--sandbox workspace-write`、網路關閉執行；不得改動治理面檔案（`.github/workflows/`、`CONTRIBUTING.md`、`docs/regulatory-decision-log.md`、`.claude/settings.json`、`.codex/config.toml`）——治理變更僅由派發方經 RA 流程處理；不得 force push。
3. 驗收 SOP：re-fetch 鎖定 head SHA → 逐條核對驗收標準與範圍外改動 → 紅線掃描 → 五項 CI 與 `governance-scan` 全綠 → 產出 attestation → 結論 PASS／FAIL／BLOCKED。驗收方不得在同一驗收程序中修改受驗內容。
4. RA 核准採固定語式「PASS <SHA 前 7 碼>」；未綁定 SHA 的核准視為未完成，須回問綁定。同一分支同一時間僅一個 active session 可寫入；驗收與合併前必須 re-fetch 再驗 head，發現非預期 commit 即停手重新驗收。
5. 異常處理：同一派工單重派至多 2 次，仍敗即 BLOCKED 報 RA；驗收 FAIL 附逐條事由退回，修正後屬新 SHA 重新驗收；映射模型不可用即 BLOCKED，不得替換（ADR-001）。
6. Effort 分級（RDL-010）：建置類固定 xhigh；非建置之純機械作業（無邏輯變更）可用 medium 以下，並在派工單記錄依據。
7. Attestation：每次建置與驗收依模板第 12 節欄位記錄——PR 描述載人讀版，`.github/attestations/` 載機器可讀 JSON；驗收方之精確模型識別依 ADR-001 由 PR 連結的 session 執行紀錄保存。
