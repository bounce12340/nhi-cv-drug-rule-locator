# Attestation Schema 正式化(§30 #22)

`.github/attestations/` 的機器可讀佐證,自 TC-20260802-01 起運作;本文件連同 `docs/schemas/task-contract-attestation.v1.schema.json`(JSON Schema draft 2020-12)將其定稿。

## 規則

1. **一任務一檔**:檔名 `<task_id>.json`(如 `TC-20260802-05.json`),schema 標記 `task-contract/v1`。
2. **必填**:task_id、task_contract 路徑、`task_contract_sha256`(派工單位元組之 SHA-256,v3.2 §21.5.4)、repo、branch、records(至少 builder+dispatcher-acceptance 各一)。
3. **角色紀錄**:builder(Terra Pro 路由 ↦ Codex GPT-5.6 Sol xhigh)與 dispatcher-acceptance(Sol Pro 路由 ↦ Claude Fable 5)各一筆;欄位見 schema。驗收側 `model_id` 依 ADR-001 以 session 執行紀錄連結留痕,精確 id 不入 repo。
4. **不可事後改寫**:attestation 隨對應 PR 入庫後視同治理紀錄,永久保留(RDL-013 精神);更正以新增備註欄位的後續 PR 為之,不改寫歷史值。

## 祖父條款(歷史檔案)

- `TC-20260802-01/02/03.json`:早於 §21.5.4 落地,無 `task_contract_sha256`;維持原樣,列為豁免清單,不回填(避免事後改寫)。
- `terra-pro-build.json`:Phase 0 遺留之 `phase-0-build/v1` 舊制,僅歷史紀錄,不受本 schema 約束。

## 驗證與強制(狀態)

| 層 | 內容 | 狀態 |
| --- | --- | --- |
| Schema 定稿 | 本文件+JSON Schema | 本批完成 |
| CI 機器驗證 | 以 schema 逐檔驗證 attestations(豁免清單除外),倣 governed-store.test.ts 模式 | 【待派工:後續 TC,由 Codex Sol 建置】 |
| Required Checks(`terra-pro-build-attestation`/`sol-pro-acceptance`) | GitHub branch protection/rulesets 設定 | 歸 #16 執行域(需 repo 管理介面;見 v32-alignment-review #3) |

新增欄位走 `task-contract/v2`(不可就地改 v1 語意);v2 提案須經 RA 核可並更新本文件。
