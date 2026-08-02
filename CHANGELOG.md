# Changelog

所有重要變更記錄於此；正式法規與價格資料將採獨立、可追溯的資料版本記錄。

## [Unreleased]

### Added

- 記錄 2026-08-02 會期中收到之 Master Project Prompt v3.2 與四份候選資料檔（僅以 SHA-256 與筆數作出處記錄，未匯入任何規則或價格內容）。
- 新增 `docs/phase1-readiness.md` Phase 1 準備度評估與決策日誌 RDL-007／RDL-008。
- 記錄 RA 指定（RDL-009，專案負責人擔任）與需求方核准之 Model Routing ADR-001（Terra Pro ↦ Codex GPT-5.6 Sol xhigh 建置；Sol Pro ↦ Claude Fable 5 獨立驗收），RDL-008 隨之解除。
- 新增 v3.2 §30 規劃產物：`docs/scope-and-non-goals.md` 與 `docs/v32-planning-tracker.md`（36 項規劃產物追蹤表）。
- 新增標準派工單模板 `docs/task-contract-template.md`（§30 #20；首張派工單 TC-20260802-01 由 Codex GPT-5.6 Sol xhigh 建置），以及派工紀錄 `docs/task-contracts/` 與機器可讀 attestation `.github/attestations/`。
- CONTRIBUTING 增補 v2.0 派工與驗收作業（派工單制、builder 沙箱與禁區、驗收 SOP、PASS 語式與併發防護、異常處理、RDL-010 effort 分級）。
- CI 新增第六項 `governance-scan` 紅線掃描（`scripts/governance-scan.sh`）：自動攔查 PR 新增行中的健保代碼樣式、公告文號與非示範價格字樣，命中即紅燈供人工判讀。
- 補記 RDL-010（effort 分級）與 RDL-011（Codex 認證儲存）；表二專用清單以 hash-only 補件收錄（吻合 v3.2 §6 宣告之 116 筆），Phase 1 資料缺口相應更新。
- 新增 `docs/phase1-intake-runbook.md`（草案 v0.1）：官方類資料 governed intake 六階段程序（來源登錄、intake 能力建置、驗證與雙重覆核、RA 逐案核准與 RDL-005 窄幅解除、版本化入庫、變更管理），含解釋程序與 `INTAKE-APPROVE`／`INTERPRET` 核准語式；不含任何收件 payload，RDL-005 維持 BLOCKED。
- Runbook 經 RA 核定升版 v1.0；新增 `docs/source-register/`（Stage 1 來源登錄）：5/6 檔完成出處宣告與派發方雜湊複驗（全 MATCH），v3.2 prompt 因提供者表明需更新而標記 PROVENANCE_INCOMPLETE 待新版重收。
- source-intake 新增 `OFFICIAL_CANDIDATE` 官方類候選通道（schema `source-intake/v2`，TC-20260802-02 由 Codex GPT-5.6 Sol 建置）：runbook §3 出處欄位、交叉分類 fail-closed、`INTAKE-APPROVE` 語式逐字驗證、`governedStorageEligible` 欄位；一切 outcome 維持 QUARANTINED 且永不釋出 payload。
- 收件兩份原始官方附件 PDF（附件1 異動明細表 10 頁、附件2 給付規定修訂對照表 13 頁；hash-only，payload 不入 repo），Stage 3 之 CSV 母本比對解除封鎖；新增 governed 儲存驗證模組（storage-manifest/v1，TC-20260802-03 由 Codex GPT-5.6 Sol 建置）。
- INTERPRET-001 裁決：複方產品分類依 v3.2 §9.5 辦理，邊界案例結案（docs/interpretations/）。
- v3.2 全文對齊審查（docs/v32-alignment-review.md）：確認 §21.5／§29／§30 已對齊；列出八項落差含兩項待 RA 裁決（R6 分支模型、R7 repo 可見性）；追蹤表 #16/#18/#22 備註同步。
- Stage 3 驗證（TC-20260802-04 由 Codex GPT-5.6 Sol 建置）：新增 scripts/stage3-verify.mjs 與統計式驗證報告（僅計數與列號，無任何代碼/名稱/價格）。
- **首次 INTAKE-APPROVE（RDL-012）**：RA 以固定語式核准資料集 `nhi-lipid-2026-09-01-r1`（四個 hash 鎖定 CSV、摘要 01a4df7…），payload 進入 `data/governed/` 並附 storage-manifest；governance-scan 排除清單依 runbook §7 擴充至該目錄；RDL-005 其餘一切維持 BLOCKED。
- 新增 governed 儲存 CI 持續驗證測試（TC-20260802-05 由 Codex GPT-5.6 Sol 建置）：每次 CI 以 storage 模組機器驗證 data/governed/ 之 manifest、語式、逐檔雜湊與目錄純淨性。

## [0.1.0] - 2026-08-01

### Added

- Phase 0 pnpm monorepo、Expo clinician app、Cloudflare Worker API。
- 純函式 deterministic 藥碼／名稱查詢核心與 `DEMO_DATA_ONLY` 虛構資料。
- 版本、as-of 日期、價格資料狀態、人工覆核與 fail-closed 行為。
- 隱私、資料來源、威脅模型、測試矩陣與規範阻斷文件。

### Explicitly not included

- 健保署核定資料、正式支付價、給付規則或病人資格判定。
