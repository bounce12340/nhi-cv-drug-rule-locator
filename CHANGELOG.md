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
- T3 轉錄往返保真驗證（TC-20260804-11 由 Codex GPT-5.6 Sol 建置；一次退回如實記錄——builder 首輪自我攔截 TSV 欄側映射錯誤、依 write-once 條款停手請求授權，派發方授權重生後續跑完成）：新增 scripts/rules-verify-t3.mjs——五件輸入雜湊閘門（附件2 三方全等）、錨點完全分割驗證（三區段零縫隙／零重疊／零越界）、往返逐位元比對 **等值 true×3**（7455／444／654 字元，零分歧）、**候選 261／262／263 交叉核對位元組全等**、schema 獨立重驗 5 項 67/67；總判定 **FIDELITY_VERIFIED**。轉錄保真已證，JSONL 待 T4 `INTAKE-APPROVE nhi-lipid-rules-structured-2026-09-01-r1 dcb6bd9` 前仍為草稿。
- **第三次 INTAKE-APPROVE（RDL-015）**：RA 於檢視會期中傳送之 JSONL 後，逐字簽發 `INTAKE-APPROVE nhi-lipid-rules-structured-2026-09-01-r1 dcb6bd9`——結構化規則轉錄檔（rules-structured.jsonl，9aa028b9…7117，67 條文單元）經雙向雜湊驗證入庫 `data/governed/nhi-lipid-rules-structured-2026-09-01-r1/` 附 storage-manifest；新增內部推導產物來源登錄（DERIVED_VERIFIED，登錄增至 13 筆）；轉錄管線 T1–T4 全鏈結案。**規則引擎之消費未授予**，需另一次 RA 裁決；eligibility 永久排除；其餘一切維持 RDL-005 BLOCKED。
- M3 引擎消費規劃（docs/engine-consumption-plan.md；RA 2026-08-04 指示）：第一階段＝display-only 逐字文本查詢（明確排除可計算邏輯／藥品對映／eligibility／價格接線）；build-time codegen 進碼機制（domain 保持零 I/O，生成模組＋CI 漂移防護＝RDL-005 核心解除點）；DEMO／官方轉錄雙源型別隔離＋雙警語草案；五不變量延伸＋eligibility 語彙黑名單負向測試；E2–E5 派工管線；五項 RA 決定點（G1–G5，含 RDL-016 核准語式草案 `ENGINE-CONSUME-APPROVE … display-only`）。
- **RDL-016（RDL-005 第四次窄幅解除）**：RA 裁示 G1–G5（G2 核准即簽發 `ENGINE-CONSUME-APPROVE nhi-lipid-rules-structured-2026-09-01-r1 display-only`；驗收原文含明顯漏字，如實在案）——domain 引擎獲准以 build-time codegen 對 governed 結構化規則資料集作 **display-only 消費**；未授予：可計算邏輯／藥品對映／價格／eligibility（永久）／production。E2+E3（codegen＋domain 擴充）依 G4 兩單制隨即派工（TC-20260805-12）。
- E2+E3 規則引擎 display-only 消費（TC-20260805-12 由 Codex GPT-5.6 Sol 建置）：**domain 自 Phase 0 以來首次功能擴充**——scripts/rules-codegen.mjs（雜湊＋INTAKE-APPROVE 語式雙閘門）生成 packages/domain/src/generated/rules-2026-09-01.ts（67 單元進碼、深凍結、檔頭鏈結 digest／RDL-016、位元組決定性）＋CI 漂移防護測試（竄改實測紅燈）；lookupRuleText（小節／單元／表標籤三種精確查詢、近似零建議、日期與版本 fail closed、OFFICIAL_TEXT_TRANSCRIBED＋官方轉錄警語、非 EXACT_MATCH 一律 manualReviewRequired、與 demo 雙源型別隔離）；負向測試全套含 eligibility 黑名單（verbatim 豁免探針雙向實測）；86 舊測試零修改＋新增 15＝101/101；governance-scan 僅增一行排除生成檔（完整性改由漂移測試看守）。
- E4+E5 規則查詢三端接線（TC-20260805-13 由 Codex GPT-5.6 Sol 建置；RA 明示「派 E4E5」）：contracts 新增 parseRuleTextLookupRequest（白名單恰三欄，patient_id／diagnosis 等病人樣欄位逐一拒絕——防火牆延伸）；API 新增 POST /v1/rules/lookup（additive）＋meta 擴欄 rulesDataset，日誌零查詢內容（測試鎖定）；clinician UI 雙模式分頁（示範藥品／規則逐字查詢），規則結果恆常呈現 domain 透傳之官方轉錄警語（單一事實來源），demo 警語與無病人資料聲明零變動；101 舊測試零修改＋新增 21＝122/122；domain／生成檔／scripts 零位元組變動。規則逐字查詢自此 Web／iOS／Android／API 四面可用（display-only，RDL-016 範疇）。
- C1+C2 套件（TC-20260805-14 由 Codex GPT-5.6 Sol 建置；H1／H2 裁示）：packages/price-comparison——DEMO_DATA_ONLY 比較引擎依 ADR-005 語意全文（comparability_key 八欄位四態、price_status 五態、任一非 CURRENT 禁排序、≤4 項、缺漏不補值、「健保支付價」名稱紅線、禁用語＋eligibility 雙黑名單負向測試、fixtures 顯然虛構）；packages/api-client——4 端點型別化薄客戶端（錯誤契約、警語原樣透傳、零重試／快取／secrets、worker 直引整合測試）；測試 122→155（既有零修改＋新增 33）；真實價格接線依 H3 緩至主檔 intake。
- M2 P1 隱私文件草案三件（docs/privacy/；H5 裁示，Fable 撰寫，全數標註 DRAFT——未經法律審閱不得上線）：隱私權告知聲明草案（個資法第 8 條架構；蒐集項依 ADR-006、處理者依 processor register、保存依 retention schedule、明確不做行銷／輪廓分析）；DSR 流程草案（受理管道／身分驗證／各權利步驟與建議時限【待核】／刪除特別規則／audit）；註冊同意文本草案（個資與條款分離勾選、不預設勾選、版本化存證、明確不徵求行銷同意）。現行 Phase 0/1 零個資蒐集不變；文件於 Phase 2 帳號功能上線時方適用。
- M2 P2＋P3 設計批次（H5 裁示，Fable 撰寫）：docs/m2-auth-detail-design.md——ADR-006【待人工確認】細部提案（自建輕量 auth 選型評估、PBKDF2 參數、@simplewebauthn Passkey 方案、token／速率參數表全數【待核】、深鏈定案化）；docs/m2-account-schema-detail.md——帳號域十表 structure-only 細化（隨機 PK 防枚舉、email／證書字號 HMAC lookup＋加密雙欄、十態狀態機、SoD 雙核欄、audit／exception 全枚舉無自由文字、retention class 逐表標註、資料域帳號域分離兩 D1【待核】）。M2 文件側（P1–P3）至此收齊；實作維持 Phase 2 閘門＋STRIDE＋v3.2 §32。
- governance-scan Set B tripwire 首次實戰與窄幅修正：UI 改版使 Phase 0 強制無病人資料聲明在 diff 呈新增行而紅燈；人工判讀＝誤報，僅豁免該句精確全文（任何變體照舊紅燈）；SOP 教訓（掃描應於 commit 後重跑）入案。
- M3 續章＋M2 起手雙規劃（RA 2026-08-05 指示「M3及M2接續」）：docs/m3-price-apiclient-plan.md——C1 price-comparison 套件（DEMO_DATA_ONLY，依 ADR-005 語意全文：comparability_key 四態、price_status 非 CURRENT 不排序、禁用語黑名單、≤4 項）＋C2 api-client＋C3 真實價格顯示決定點（建議緩至主檔 intake）；docs/m2-kickoff-plan.md——P1 隱私文件草案／P2 ADR-006 細部定案設計／P3 D1 schema 細化（全文件側，實作鎖 Phase 2 閘門），SaMD 工作假設決定點；六項 RA 決定點 H1–H6。
- 裁示批次 A1–A8 登錄（RDL-017；RA 2026-08-05 結構化答覆「A 全部照案」）：A1 auth 參數包照案（PBKDF2 600,000 迭代、@simplewebauthn 以 Workers PoC 為前提、九項 token／速率值——docs/m2-auth-detail-design.md）；A2 帳號域兩 D1 分離照案（HMAC 金鑰輪替與 IP 遮罩格式遞延 Phase 2 首張派工單）；A3 八類個資保存期限照案（法律側確認留 v3.2 §32 B 軌）；A4 ADR-002 RA 側核定（法律／個資確認後方轉 Accepted）；A5 ADR-008 PoC 排程照案（鎖定仍以實機證據為唯一條件）；A6 M1 里程碑正式簽結（docs/m1-continuation-plan.md §4）；A7 分支制度維持現制（tracker #18 無變更再確認）；A8 INTERPRET-003 裁決（新版表二品項內容以獨立清單載體存在、不內嵌 2.6.1 條文本文；對映式消費屬未來另案引擎裁決）。批次各項均不解除 RDL-005、不替代 v3.2 §32 專業簽核。
- governance-scan 豁免範圍調整合併補記(PR #37,另一 Claude 會期建置,head 2e863a1):`docs/task-contracts/**` 加入 Set A 排除清單(EXCLUDES 與 EXCLUDE_RE 兩路徑同步)——派工單紀錄需能以名指涉受檢樣式而不誤觸掃描;RA 以逐字語式驗收並指示合併(驗收者非建置者,滿足 CONTRIBUTING §4 分離),兩項待決程序點(未經派工單之治理面變更、建置者不得自我驗收)由 RA 於 PR gate 追記裁處。書寫紀律不變:紀錄文件仍以名稱指涉樣式為優先。
- B 軌推進包(RA 2026-08-05 指示「B軌全推進」,Fable 撰寫):新增 docs/b-track/ 六件——總索引(B1–B5 相依關係、統一回登程序、§32 簽核台帳 append-only 格式)、B1 SaMD 法律意見委任摘要(產品事實/委任問題/影響面)、B2 隱私與個資審閱包(七文件逐份問題清單+Cloudflare DPA)、B3 正式 STRIDE 資安審閱委任摘要(六面×STRIDE、SoD 要求、Phase 2 進入閘門)、B4 ADR-008 實機 PoC 執行手冊(W1 現在可測/W2 隨 Phase 2 兩波、逐項效能預算對應、證據格式)、B5 商店合規法律定性摘要(六項【待核】結清路徑)。均為委任準備文件,不解除任何閘門;專業簽核取得前對應閘門維持關閉。

## [0.1.0] - 2026-08-01

### Added

- Phase 0 pnpm monorepo、Expo clinician app、Cloudflare Worker API。
- 純函式 deterministic 藥碼／名稱查詢核心與 `DEMO_DATA_ONLY` 虛構資料。
- 版本、as-of 日期、價格資料狀態、人工覆核與 fail-closed 行為。
- 隱私、資料來源、威脅模型、測試矩陣與規範阻斷文件。

### Explicitly not included

- 健保署核定資料、正式支付價、給付規則或病人資格判定。
