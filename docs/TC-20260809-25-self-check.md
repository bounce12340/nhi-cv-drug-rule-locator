# TC-20260809-25 建置者自我檢查

- 派工單：`docs/task-contracts/TC-20260809-25.md`
- 角色：Codex GPT-5.6 Sol（builder）
- 日期：2026-08-09
- 範圍：純治理文件；未編輯程式碼、測試或資料
- 測試基準／完成：33 files／302 tests → 33 files／302 tests
- 本報告是建置者自我檢查，不取代 Claude Fable 5 對精確 head SHA 的獨立驗收。

## 1. 檔案清單

| 檔案 | 變更 |
| --- | --- |
| `.github/CODEOWNERS` | 新增 repository owner 預設規則與七個高敏感路徑；明載檔案本身不具強制力，branch protection / rulesets 仍未設定 |
| `docs/runbooks/README.md` | 新增索引，以連結指向三份既有作業文件及兩份新手冊，不複製既有程序 |
| `docs/runbooks/credential-rotation.md` | 新增憑證輪替手冊，只記錄兩次實際撤銷誤判、token ID 比對、先換新後撤舊及撤銷後部署複驗 |
| `docs/runbooks/incident-response.md` | 新增線上異常處置手冊，只涵蓋四類已發生事件，固定端點 → 四處 bundle hash → API 煙霧的查核順序 |
| `docs/v32-alignment-review.md` | 只更新落差 #3 的檔案現況，並明載落差 #4 仍開放，不宣稱 §21.2 已全部完成 |
| `docs/v32-planning-tracker.md` | 只更新 #16 的 location／blocker；狀態維持 `PARTIAL`，branch protection / rulesets 仍交由 RA 於 GitHub 介面設定 |
| `docs/TC-20260809-25-self-check.md` | 本自我檢查報告 |

未修改 `docs/launch-runbook.md`、`docs/phase1-intake-runbook.md`、`docs/backup-restore-rollback-plan.md` 或 `CHANGELOG.md` 的既有內容。

## 2. 與既有文件的引用關係

| 新文件 | 引用 | 本文件只補的缺口 |
| --- | --- | --- |
| `docs/runbooks/README.md` | launch runbook、Phase 1 intake runbook、Backup / Restore / Rollback 計畫 | 提供單一索引與範圍說明 |
| `docs/runbooks/credential-rotation.md` | launch runbook §1.1、§2.1、§2.2、§3 | 不重抄三層存放表、權限表、部署指令或煙霧項目；只補輪替順序、ID 驗證與事故教訓 |
| `docs/runbooks/incident-response.md` | launch runbook §2.1、§2.2、§3；Backup / Restore / Rollback 計畫 §3；CHANGELOG 既有事故紀錄 | 不重抄部署或回滾程序；只補異常判讀順序、CDN 傳播期判讀與事故登記義務 |

Backup / Restore / Rollback 計畫 §5 所列未來 Phase 5 手冊沒有在本單建立；標示待核或未演練的步驟也沒有被改寫成已驗證事實。

## 3. 事實邊界核對

- 憑證輪替只採契約記錄的兩次實際事故：兩次都曾因名稱認錯而誤稱舊 token 已撤銷，實測卻仍有效。
- 帳戶層 token 驗證端點只寫路徑 `GET /client/v4/accounts/{account_id}/tokens/verify`；此路徑已對照 Cloudflare 官方 Verify Token API。文件沒有放入回應範例或任何實際 ID。
- 輪替順序為新憑證入位並通過部署驗證後才撤銷舊憑證；撤銷後另觸發一次既有部署 workflow，驗證管線仍可運作。
- 異常處置只列既有四案：routes 導致 `*.workers.dev` 404、三層主機名憑證無法發放、Pages 相對路徑 `ENOENT`、CDN 傳播期首次讀到舊 bundle hash。
- CDN 處置沒有虛構固定等待時間；只要求等待傳播後，以相同四個入口複驗。首次讀到舊 hash 不被判成部署失敗，也不因此立即回滾。

## 4. CODEOWNERS 與狀態

- Repository owner 取自既有 remote 的 GitHub repository 路徑，使用允許的 GitHub 帳號格式 `@bounce12340`；沒有加入姓名、email 或其他識別資訊。
- 預設規則與契約指定的七個高敏感路徑均為兩欄有效格式；本機以語法及逐條完整比對檢查，結果 PASS。
- `.github/CODEOWNERS` 檔頭明載其本身不強制審查。
- Branch protection / rulesets 沒有設定，也沒有宣稱已設定；alignment 落差 #4 維持開放，tracker #16 維持 `PARTIAL`。

## 5. 五項檢查與測試數

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS；exit 0 |
| `pnpm test` | PASS；33 files／302 tests |
| `pnpm export:web` | PASS；exit 0 |
| `pnpm worker:types` | PASS；exit 0，generated types up to date |
| `pnpm worker:dry-run` | PASS；exit 0，明確 `--dry-run: exiting now`，未部署 |

Wrangler 的最終兩項檢查以 `WRANGLER_LOG_PATH` 指向 `/tmp` 的本單專用檔，避開沙箱唯讀的預設 log 位置；沒有改動 Worker 設定或命令語意。Expo export 與 Worker types 只產生既有的建置／gitignore 輸出，不是本單原始碼變更。

## 6. 紅線與 governance-scan

- 未執行任何 git 指令。
- `bash scripts/governance-scan.sh origin/main` 內部會執行 `git fetch`、`git diff` 與 `git ls-files`，與本單「不得執行任何 git 指令」紅線衝突，因此建置者未執行該腳本，也不虛報其退出碼。此項須由具 git 執行權限的獨立驗收方完成。
- 已以不呼叫 git 的方式，對本單七個檔案套用 governance-scan 的 Set A 規則；PASS。沒有程式碼變更，Set B 無新增行可掃。
- 另以不呼叫 git 的方式檢查：CODEOWNERS 七條敏感路徑完整、runbook 引用目標存在、無 32 位十六進位實際識別值、無 Cloudflare token 值格式；全部 PASS。
- 文件內沒有憑證值、帳號 ID 實際值、token ID 實際值或真實藥品代號。
- 未編輯 `data/governed/**`、`packages/**`、`apps/**`、`scripts/**` 或 `.github/workflows/**` 中的受版本控制內容；五項檢查只重生前述既有 gitignore 輸出。未新增或變更相依套件。

## 7. 建置者結論

契約指定的治理文件產物、引用關係、事故事實邊界、CODEOWNERS 覆蓋、`PARTIAL` 狀態與五項檢查均已完成自我檢查。因禁止 git 指令，建置者沒有宣稱 governance-scan 的契約命令已執行；最終結論仍由派發方／驗收方在精確 head SHA 上獨立判定。
