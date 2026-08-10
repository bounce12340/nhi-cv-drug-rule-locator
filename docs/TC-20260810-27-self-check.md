# TC-20260810-27 建置者自我檢查報告

> 本報告為建置者自查紀錄，不構成獨立驗收或最終 PASS；最終判定由派發方／驗收方執行。

## 產出檔案

- `docs/b-track/B1-cover-letter.md`：RA 可直接替換佔位符後使用之 SaMD 法律意見委任函範本。
- `docs/TC-20260810-27-self-check.md`：本自我檢查報告。

`docs/b-track/B1-samd-legal-brief.md` 未修改。

## 附件清單比對

| 委任函項次 | 委任函內容 | 依據 | 比對結果 |
| --- | --- | --- | --- |
| 1 | `docs/b-track/B1-samd-legal-brief.md` | TC §1.3 要求附 B1 委任摘要本身 | 一致 |
| 2 | `docs/scope-and-non-goals.md` | B1 §3 第 1 份 | 一致 |
| 3 | `docs/architecture.md` | B1 §3 第 2 份 | 一致 |
| 4 | `docs/store-compliance-matrix.md` | B1 §3 第 3 份 | 一致 |
| 5 | `docs/m2-kickoff-plan.md` §5 | B1 §3 第 4 份 | 一致 |
| 6 | `docs/phase-plan.md` | B1 §3 第 5 份 | 一致 |
| 7 | `docs/wireframes.md` | B1 §3 第 6 份 | 一致 |
| 8 | <https://nhi.uic-ai.com>（請實際操作） | TC §1.3 要求附產品線上網址 | 一致 |

比對結論：B1 §3 所列六份參考文件逐項、依原順序列入；另依派工單列入 B1 委任摘要本身與產品線上網址，共八項，未增未減。

## 紅線自查

- 「本軟體已在營運中」及 RDL-018 所載未取得 v3.2 §32 專業簽核、由 RA／專案負責人明示承擔之偏離登記，均置於信件本文前段之「報價與排程前請先留意之重要現況」，不是僅列於附件。
- 委任事項以問題形式交由受任者判斷；五題對應 B1 §2，未加入法律分析、定性結論、有利論證或期待答案。
- 法規與指引名稱未超出 B1 §2 既有內容。
- 收件單位、承辦人、日期、聯絡方式及委任人均使用 `【佔位符】`；未編造真實事務所、顧問機構或人名。
- 未寫入憑證值、真實藥品代號或個人識別資訊。
- 全文採專業直述語氣；關鍵詞掃描未發現產品行銷、產品褒揚或治理自誇語句。
- 保密段落明載本專案不含病人資料，附件性質為內部設計與治理文件及公開政府開放資料轉錄。
- 未設定報價金額或完成期限，僅請受任者提供預估時程與費用。
- 未修改程式碼、測試、資料、B1 本文、`scripts/**`、`.github/**` 或簽核台帳；未執行任何 git 指令。

## 五項檢查

| 檢查 | 結果 | 摘要 |
| --- | --- | --- |
| `pnpm typecheck` | 通過（exit 0） | 7 個 workspace projects 完成 typecheck |
| `pnpm test` | 通過（exit 0） | 33 files passed；302 tests passed，測試數維持 302 |
| `pnpm export:web` | 通過（exit 0） | Expo web export 完成 |
| `pnpm worker:types` | 通過（exit 0） | `worker-configuration.d.ts` 為最新；以 `/tmp` 暫存 Wrangler 設定目錄重跑，避開唯讀日誌路徑 |
| `pnpm worker:dry-run` | 通過（exit 0） | Wrangler dry-run 完成並正常退出，未部署 |

## 驗收方待辦

- 未執行 `bash scripts/governance-scan.sh origin/main`。該腳本內部會使用 git，與本單「不得執行任何 git 指令」之禁令衝突，須由驗收方補跑並確認退出碼為 0。
