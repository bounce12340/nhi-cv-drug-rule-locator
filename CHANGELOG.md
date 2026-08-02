# Changelog

所有重要變更記錄於此；正式法規與價格資料將採獨立、可追溯的資料版本記錄。

## [Unreleased]

### Added

- 記錄 2026-08-02 會期中收到之 Master Project Prompt v3.2 與四份候選資料檔（僅以 SHA-256 與筆數作出處記錄，未匯入任何規則或價格內容）。
- 新增 `docs/phase1-readiness.md` Phase 1 準備度評估與決策日誌 RDL-007／RDL-008。
- 記錄 RA 指定（RDL-009，專案負責人擔任）與需求方核准之 Model Routing ADR-001（Terra Pro ↦ Codex GPT-5.6 Sol xhigh 建置；Sol Pro ↦ Claude Fable 5 獨立驗收），RDL-008 隨之解除。
- 新增 v3.2 §30 規劃產物：`docs/scope-and-non-goals.md` 與 `docs/v32-planning-tracker.md`（36 項規劃產物追蹤表）。

## [0.1.0] - 2026-08-01

### Added

- Phase 0 pnpm monorepo、Expo clinician app、Cloudflare Worker API。
- 純函式 deterministic 藥碼／名稱查詢核心與 `DEMO_DATA_ONLY` 虛構資料。
- 版本、as-of 日期、價格資料狀態、人工覆核與 fail-closed 行為。
- 隱私、資料來源、威脅模型、測試矩陣與規範阻斷文件。

### Explicitly not included

- 健保署核定資料、正式支付價、給付規則或病人資格判定。
