# 標準派工單模板（Task Contract）

本模板對應 v3.2 §30 規劃產物 #20；每次派工時請複製「空白模板」並完整填寫，未明文授權的工作或檔案一律不在任務範圍內。

## 空白模板

### 1. 任務識別（Task ID and Title）

填寫說明：以 `TC-YYYYMMDD-NN` 格式填入唯一任務 ID，並以一句可辨識交付成果的文字填入標題。

- 任務 ID：`TC-YYYYMMDD-NN`
- 標題：`<任務標題>`
- 派發時間：`<ISO 8601 日期時間與時區>`

### 2. 三方識別（Dispatcher / Builder / RA）

填寫說明：分別記錄派發者、建置者與監管權責人（RA），且建置者必須同時列出 provider、模型顯示名稱、exact model ID 與 reasoning effort。

- 派發者（dispatcher）：`<名稱或可稽核識別>`
- 建置者（builder）：
  - provider：`<供應者>`
  - model display name：`<模型顯示名稱>`
  - exact model ID：`<精確模型 ID／版本，不得只填顯示名稱>`
  - reasoning effort：`<xhigh / high / medium / low>`
- RA：`<角色或可稽核識別；附相關 RDL 編號>`

### 3. 範圍（Scope：做什麼）

填寫說明：逐項描述本任務必須產出的具體變更、行為與交付物，使建置者不需自行擴張需求即可完成工作。

- `<交付物或變更 1>`
- `<交付物或變更 2>`

### 4. 非目標（Non-goals：明文不做什麼）

填寫說明：明列本次刻意排除的功能、資料、重構、部署及治理變更，避免「順手處理」造成越界。

- `<不做事項 1>`
- `<不做事項 2>`

### 5. 允許觸碰的檔案與目錄（Allowed Paths）

填寫說明：列出唯一可新增、修改或刪除的精確路徑及操作種類，**未列出者一律視為禁區**。

- `<路徑>`（`新增 / 修改 / 刪除`）：`<用途或限制>`

### 6. 驗收標準（Acceptance Criteria）

填寫說明：將每項需求改寫成可逐條判定 PASS／FAIL 的觀察結果；只要涉及 deterministic 查詢行為變更，就必須包含無匹配、歧義、超出日期或版本覆蓋等負向測試，並驗證不得自動選取或回傳未驗證結果。

1. `<可檢核標準 1>`
2. `<可檢核標準 2>`
3. `<若適用：deterministic 查詢的負向測試與 fail-closed 預期結果>`

### 7. 檢查要求（Verification）

填寫說明：在預定提交的完整工作樹上執行下列五項 CI 與紅線掃描，逐項記錄 PASS／FAIL／BLOCKED 及必要證據，任何 BLOCKED 都必須說明原因而不得視為通過。

- [ ] Typecheck：`pnpm typecheck`
- [ ] Tests：`pnpm test`
- [ ] Expo Web export：`pnpm export:web`
- [ ] Worker types：`pnpm worker:types`
- [ ] Worker dry-run：`pnpm worker:dry-run`
- [ ] 紅線掃描：檢查任務 diff 與允許路徑，確認沒有祕密、病人資料欄位、未經治理核准的官方規則或支付價、真實藥品代碼或名稱，以及範圍外變更；任何文字命中都須人工判讀並記錄結論。

### 8. 分支（Branch）

填寫說明：過渡期間使用 `claude/<任務ID>` 格式（例如 `claude/TC-YYYYMMDD-NN`），待 tracker #18 正名後依核准的新策略更新。

- 分支：`claude/TC-YYYYMMDD-NN`

### 9. 沙箱與網路設定（Sandbox and Network）

填寫說明：預設以 `--sandbox workspace-write` 執行且關閉網路；若任務確實需要其他權限，必須在派工前逐項列明範圍、理由及核准者，不得由建置者默示擴權。

- sandbox：`--sandbox workspace-write`
- network：`off`
- 允許寫入範圍：`<工作區內明列路徑；預設僅第 5 節路徑>`
- 其他工具或權限：`無`／`<明列權限、理由與核准者>`

### 10. Reasoning effort 等級

填寫說明：建置類任務固定使用 `xhigh`；非建置的機械作業才可依 RDL-010 指定 `medium` 以下，並記錄選用理由。

- 任務類型：`建置`／`非建置機械作業`
- reasoning effort：`xhigh`／`medium`／`low`
- 選用依據：`建置類固定 xhigh`／`<RDL-010 適用理由>`

### 11. 回報格式（Completion Report）

填寫說明：完成回報必須依序包含 diff 摘要、逐條對照驗收標準的自我檢核表，以及可稽核的 Codex session ID；測試失敗或無法取得的資訊不得省略。

1. **Diff 摘要**：`<檔案與變更重點>`
2. **逐條自我檢核表**：`<每項驗收標準及 PASS／FAIL／BLOCKED、證據>`
3. **Codex session ID**：`<session ID；若環境未提供則填 UNAVAILABLE 並說明>`

### 12. Attestation（v3.2 §21.5.4）

填寫說明：每次 build 與 acceptance 各自留下完整 attestation，以下欄位不可省略，未知值須明填 `UNAVAILABLE` 及原因而不得空白。

- role：`<builder / independent acceptor>`
- tier：`<要求的模型 tier>`
- provider：`<模型供應者>`
- model display name：`<模型顯示名稱>`
- exact model ID：`<精確模型 ID／版本>`
- run/session ID：`<可稽核執行識別>`
- 任務 ID：`TC-YYYYMMDD-NN`
- repo：`<repository owner/name 或核准的本機識別>`
- branch：`claude/TC-YYYYMMDD-NN`
- head SHA：`<完整 commit SHA>`
- 起訖時間：`<開始與結束的 ISO 8601 日期時間及時區>`
- 工具權限：`<sandbox、網路、可寫路徑、外部寫入或部署權限>`
- 結果：`<PASS / FAIL / BLOCKED；附檢查證據或阻擋原因>`

---

## 填寫範例：TC-20260802-01

> **示範標記：** 本節只示範如何填寫本任務的派工單，不是新的授權、真實資料集或可直接重用的執行紀錄；所有待執行後產生的識別值均以 `DEMO_` 或文字說明標示。

### 1. 任務識別（示範）

- 任務 ID：`TC-20260802-01`
- 標題：建立派工單模板 `docs/task-contract-template.md`（v3.2 §30 規劃產物 #20）
- 派發時間：`2026-08-02（示範；原派工未提供時分與時區）`

### 2. 三方識別（示範）

- 派發者（dispatcher）：`Claude Fable 5（示範）`
- 建置者（builder）：
  - provider：`OpenAI（示範）`
  - model display name：`Codex GPT-5.6 Sol（示範）`
  - exact model ID：`gpt-5.6-sol（示範）`
  - reasoning effort：`xhigh（示範）`
- RA：`專案負責人（RDL-009；示範）`

### 3. 範圍（示範）

- 新增一份可供後續派工複製填寫的繁體中文標準 Task Contract 模板。
- 納入三方識別、明確範圍、禁區、驗收、CI、紅線、執行設定、回報與 attestation 要求。
- 在文末附上 `TC-20260802-01` 自身的明顯示範內容。

### 4. 非目標（示範）

- 不修改任何既有檔案，也不建立其他檔案。
- 不加入官方規則、支付價、真實藥品代碼或名稱，以及任何病人資料欄位。
- 不變更工作流程、貢獻指南、監管決策紀錄或 agent 設定。

### 5. 允許觸碰的檔案與目錄（示範）

- `docs/task-contract-template.md`（新增）：僅此一個；所有未列路徑均為禁區。

### 6. 驗收標準（示範）

1. 新檔案是有效 Markdown，完整包含 12 個欄位，且每個欄位都有一句填寫說明。
2. 文末包含以 `TC-20260802-01` 為例、明確標為示範的填寫範例。
3. 提交只包含允許的新檔案，提交前後均無其他工作樹變更。
4. 內容不含真實藥品代碼或名稱、價格數字表、官方給付條文及病人資料欄位。
5. 五項 CI 在包含新檔案的工作樹上全部通過。
6. 本任務不變更 deterministic 查詢行為，因此負向查詢測試要求不適用；仍執行既有完整測試。

### 7. 檢查要求（示範）

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm export:web`
- [ ] `pnpm worker:types`
- [ ] `pnpm worker:dry-run`
- [ ] 紅線掃描：人工複核唯一新檔與 diff，並記錄無範圍外變更、祕密、受管制內容或真實資料。

### 8. 分支（示範）

- 本任務既有分支：`claude/init-yd1kqu（示範；由派發者指定）`
- 過渡制標準格式示範：`claude/TC-20260802-01`
- 備註：後續任務依 tracker #18 核准結果正名。

### 9. 沙箱與網路設定（示範）

- sandbox：`--sandbox workspace-write（示範）`
- network：`off（示範）`
- 允許寫入範圍：`docs/task-contract-template.md（示範）`
- 其他工具或權限：`無；不 push、不部署（示範）`

### 10. Reasoning effort 等級（示範）

- 任務類型：`建置（示範）`
- reasoning effort：`xhigh（示範）`
- 選用依據：`建置類固定 xhigh（示範）`

### 11. 回報格式（示範）

1. **Diff 摘要**：新增標準派工單模板，未修改其他檔案。
2. **逐條自我檢核表**：逐項回報本範例第 6 節標準的 PASS／FAIL／BLOCKED 與證據。
3. **Codex session ID**：`DEMO_SESSION_ID（示範占位，實際回報須替換）`

### 12. Attestation（示範）

- role：`builder（示範）`
- tier：`Terra Pro（示範）`
- provider：`OpenAI（示範）`
- model display name：`Codex GPT-5.6 Sol（示範）`
- exact model ID：`gpt-5.6-sol（示範）`
- run/session ID：`DEMO_SESSION_ID（示範占位）`
- 任務 ID：`TC-20260802-01（示範）`
- repo：`DEMO_REPOSITORY（示範占位）`
- branch：`claude/init-yd1kqu（示範；本任務既有分支）`
- head SHA：`DEMO_HEAD_SHA（示範占位；提交後替換為完整 SHA）`
- 起訖時間：`DEMO_START_TIME / DEMO_END_TIME（示範占位；使用 ISO 8601 與時區）`
- 工具權限：`workspace-write；network off；僅可寫入本新檔；無 push 或部署（示範）`
- 結果：`DEMO_RESULT（示範占位；完成後填 PASS、FAIL 或 BLOCKED 並附證據）`
