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
- 補記 RDL-013（governed 資料集保存政策：永久保留、只疊加不刪除；runbook §8/R4 定案）。
- §30 規劃產物第一批（主模型撰寫，依 ADR-001）：#35 Phase Acceptance Report 模板、#27 效能預算（含 TTFCA）、#26 無障礙驗收標準、#29 資料流圖（現況＋目標態）。
- 收件公告本文網頁擷取 PDF（hash-only；含主旨/發文字號標記），原始來源缺件 #4 結案；R7 確認 repo 自始 Private 結案。
- §30 規劃產物第二批：ADR-002 Data Residency（PROPOSED）、ADR-003 Cloudflare Architecture（基準核定）、ADR-004 Analytics/Logging 隱私（生效）。
- §30 規劃產物第三批：ADR-005 價格比較語意、ADR-006 Authentication 與 Native Secure Storage、ADR-007 API 相容與 Mobile Release 策略。
- §30 規劃產物第四批：ADR-008 Cross-platform Mobile（PROPOSED，PoC 為鎖定條件）、臨床快速查詢流程圖、Backup/Restore/Rollback 計畫。
- §30 規劃產物第五批：Processor Register 草稿、Data Retention Schedule 草稿、Monorepo 佈局對齊（現行佈局確認為 v3.2 §17.9 合法前綴）。
- §30 規劃產物第六批：App Store／Google Play 合規矩陣（法律定性待核）、三端功能對等矩陣（I/E/D 分級）、低擬真 Wireframes（W1–W6）。
- §30 規劃產物第七批：Milestones/Issues 規劃（M0–M5＋Labels 分類法）、DB Schema 與 Migration 結構草稿（資料域 append-only／帳號域分離）、API 規格結構草稿（白名單防火牆＋/v1 additive 策略）；#32/#33 均 structure-only，權威欄位俟 governed intake。
- §30 規劃產物第八批（PARTIAL 升級）：attestation 正式 JSON Schema（task-contract/v1 定稿＋祖父條款）、v3.2 全域 Requirement-to-Test 矩陣（A–E 區）、威脅模型擴充（Phase 1+ 現況面＋Phase 2/3 目標態，Phase 2 進入閘門＝正式 STRIDE review）。
- 收件藥品給付規定 2.6.1 舊版全文 PDF（hash-only；官方入口網端點直接下載、修訂前有效版、出處宣告齊備）：spec-source-status 缺口 #2（舊版表二全文）結案，方向 B（v3.2 §9.6 表二程序）解除封鎖；來源登錄增至 10 筆。payload 依 RDL-007 留置 repo 外。
- 表二程序 Stage 3 交叉檢視（TC-20260803-06 由 Codex GPT-5.6 Sol 建置）：新增 scripts/table2-cross-review.mjs 與統計式報告——3/3 輸入檔雜湊 MATCH；附件2 修訂項目 3 項，修正前欄對舊版 2.6.1 定位 PARTIAL 1／NOT_FOUND 2（附件2 涵蓋逾 2.6.1 之訊號）；表一／表二字樣僅見於附件2（舊版全文 0 次，編號為新版引入之訊號）；結構計數與來源登錄一致；最終對應認定待 RA。
- INTERPRET-002 裁決（RA 2026-08-03 結構化答覆「1A 2A」）：新版表一／表二皆屬降膽固醇規定之分表（與 statin 表二專用清單語義相容；規定表 B 之新版編號明示不裁決）；舊版 2.6.1 全文確認為表一／表二之單一舊版權威基準。NOT_FOUND 兩項（A2-ITEM-02/03）核定以補收相鄰小節舊版 PDF 處置——待收件後 Stage 1 登錄並重跑交叉檢視。
- 2A 補件收件（hash-only）：藥品給付規定 2.6.2 與 2.6.3 舊版全文 PDF（官方入口網端點直接下載、修訂前有效版、出處宣告齊備），來源登錄增至 12 筆；payload 依 RDL-007 留置 repo 外。A2-ITEM-02/03 之重定位待交叉檢視腳本擴充多基準後重跑。
- 表二程序 Stage 3 交叉檢視 r2（TC-20260803-07 由 Codex GPT-5.6 Sol 建置）：新增 scripts/table2-cross-review-r2.mjs 多基準重跑（r1 腳本與報告凍結不動）——4 檔雜湊 MATCH；3 項 × 3 基準定位矩陣：A2-ITEM-01 唯一定位於 2.6.1（PARTIAL 4/5）、A2-ITEM-02 於 2.6.2 完整定位（FOUND 12/12）、A2-ITEM-03 於 2.6.3 完整定位（FOUND 10/10），交叉命中僅各 1 片段；TC-06 兩項 NOT_FOUND 定位缺口補齊；新基準結構複驗與來源登錄一致；2.6.2/2.6.3 均無表一／表二字樣（與 INTERPRET-002 相容）；歸屬正式認定依報告警語保留 RA。
- 表二程序新版 2.6.1 全文候選推導（TC-20260803-08 由 Codex GPT-5.6 Sol 建置）：新增 scripts/table2-new261-derive.mjs——2 檔雜湊 MATCH 後自附件2 A2-ITEM-01 右欄（修正後）機械擷取候選全文，payload 僅寫 repo 外（內建 repo 邊界防呆）；repo 內統計報告：候選 SHA-256 8b178837…75f1（11,392 bytes）、表一 3 次／表二 2 次（INTERPRET-002 預期相符）、修訂日期列示 8→9、規定表 A 系資料列 5→6、B 系 3→0（RA 檢視點）、定義區塊項數擴充；狀態 PENDING_RA_REVIEW，不得下游使用，待官方新版可下載（2026-09-01 起）後另案驗證。
- 表二程序新版 2.6.2／2.6.3 全文候選推導（TC-20260803-09 由 Codex GPT-5.6 Sol 建置；RA 明示指示派工）：新增 scripts/table2-new262-263-derive.mjs——3 檔雜湊 MATCH 後依左欄標題垂直座標切分第 12 頁兩項（非整頁粒度），各自右欄機械擷取雙候選，payload 僅寫 repo 外；262 候選 a3c84db3…75f3（784 bytes，條文 2→2、日期列示 1→2）、263 候選 57fef95e…e3dd（952 bytes，條文 2→3、日期列示 4→5）；兩候選表一／表二均 0 次（與 INTERPRET-002 相容）；狀態 PENDING_RA_REVIEW，不得下游使用，待官方新版另案驗證。附件2 三項修訂之候選推導至此全數完成。
- 表二程序階段性驗收報告（docs/acceptance/table2-stage-interim-20260803.md，依 §30 #35 模板）：彙整 TC-06→09 段落——PR #18–#22 逐筆 head SHA／RA 簽記／merge SHA、四份 attestation、三候選統計成果、未解決事項（候選 PENDING_RA_REVIEW、261 候選 B 系 0 列檢視點、RDL-005 維持 BLOCKED、M1 其餘條件）；階段性 PASS，非 Phase 結案，不解除任何 BLOCKED。
- M1 續行規劃（docs/m1-continuation-plan.md；RA ③B 裁示）：第二資料集提案 `nhi-lipid-rules-2026-09-01-r1`（官方新版規則全文 PDF 原件＋storage-manifest）之六步入庫路徑（官方收件→Stage 1→官方 vs 候選比對→INTAKE-APPROVE→RDL-005 第二次窄幅解除→governed 入庫），與 Stage 1–6 常態運轉對照表（以表二程序循環為參照運轉，結論：常態運轉認定＝第二資料集走完一輪）；三項待 RA 決定點；不匯入內容、不解除 BLOCKED。另：三份候選檔已傳送 RA 檢視（①A），2026-09-01 官方驗證開工排程已建立（②A）。
- M1 續行規劃三項決定點經 RA 裁示（2026-08-03 結構化答覆「1 照案 2 原件 3 立即」）：第二資料集照案核名 `nhi-lipid-rules-2026-09-01-r1`；入庫物＝官方 PDF 原件（結構化轉錄另案）；官方收件後立即派工比對驗證。`INTAKE-APPROVE` 與 RDL-005 窄幅解除仍待屆時逐案作成。
- **第二次 INTAKE-APPROVE（RDL-014）**：RA 指出公告文件即三小節合併之官方新版載體、無需等 9/1，重複上傳附件1／附件2 經逐位元組複驗與 08-02 收件一致後，以結構化答覆「C 留」核准 `INTAKE-APPROVE nhi-lipid-rules-2026-09-01-r1 feb6621`——公告原件包三檔（公告本文擷取＋附件1＋附件2）經雙向雜湊驗證入庫 `data/governed/nhi-lipid-rules-2026-09-01-r1/` 附 storage-manifest；來源登錄三筆追記（複驗、涵蓋 2.6.1–2.6.3 宣告、入庫參照）；M1 規劃 §2/§3/§4 同步修訂——**M1 兩項完成條件在文件面均已達成**（正式結案認定留 RA）；9/1 排程降為生效版勘誤攔截（保留）。附件2 規則文字在自身後續閘門前仍不可編碼；其餘一切維持 RDL-005 BLOCKED。
- M3 起手規劃（docs/rules-transcription-plan.md；RA 2026-08-04 指示不暫停）：規則結構化轉錄管線 T1–T4——governed 附件2 右欄逐字轉錄為 JSONL 條文單元（欄位含逐單元錨定＋雜湊）、往返保真驗證、`INTAKE-APPROVE nhi-lipid-rules-structured-2026-09-01-r1` 入庫；轉錄物 payload 置 repo 外、統計報告入 repo；261 候選 B 系疑點隨轉錄機械結案；明列「還不解鎖」清單（引擎消費需另裁、eligibility 永久排除、production 照舊 BLOCKED）；三項 RA 決定點（範圍／格式／派工時點）。
- T2 規則結構化轉錄（TC-20260804-10 由 Codex GPT-5.6 Sol 建置；RA 裁示 D1全／D2JSONL／D3立即）：新增 scripts/rules-transcribe-t2.mjs——三方雜湊閘門後自 governed 附件2 機械切分 67 個條文單元（表題4／資料列20／定義項34／條文8／註1），覆蓋 661/661 行 100%；表一 6 列、表二 0 列（新版表二「表題存在、內嵌列 0」訊號，解釋層讀法待 T3 後送 RA）；JSONL 草稿 payload 置 repo 外，schema 自檢＋派發方獨立複驗雙重確認。建置異常如實記錄：builder 程序於產物完成後、自檢回報前遭終止，派發方以逐條獨立驗證替代（產物與獨立重跑逐位元一致）；狀態 TRANSCRIPTION_DRAFT。

## [0.1.0] - 2026-08-01

### Added

- Phase 0 pnpm monorepo、Expo clinician app、Cloudflare Worker API。
- 純函式 deterministic 藥碼／名稱查詢核心與 `DEMO_DATA_ONLY` 虛構資料。
- 版本、as-of 日期、價格資料狀態、人工覆核與 fail-closed 行為。
- 隱私、資料來源、威脅模型、測試矩陣與規範阻斷文件。

### Explicitly not included

- 健保署核定資料、正式支付價、給付規則或病人資格判定。
