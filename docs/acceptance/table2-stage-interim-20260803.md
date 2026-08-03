# 表二程序階段性驗收報告(2026-08-03;非 Phase 結案)

> 依 `docs/acceptance/phase-acceptance-report-template.md`(§30 #35,v3.2 §26)產出之**階段性彙整**:涵蓋表二程序自舊版全文收件至附件2 三項修訂候選推導完成之段落(TC-20260803-06 → TC-20260803-09)。本報告不是 Phase 結案報告、不解除任何 BLOCKED 決定;§5 正式專項審查依 Phase 1 結案另辦。

## 1. Phase 識別

- 階段名稱:表二程序(v3.2 §9.6,方向 B)——Stage 3 交叉檢視+新版全文候選推導段落
- Scope:M1「正式資料基礎」之表二程序工作(docs/milestones-and-issues.md);不含 M1 其餘完成條件
- 報告日期:2026-08-03

## 2. 變更清單(PR、head SHA、對應 TC、RA 簽記)

| PR | 內容 | head SHA | TC | RA 簽記 | merge SHA |
| --- | --- | --- | --- | --- | --- |
| #18 | 舊版 2.6.1 全文 Stage 1 登錄(hash-only) | `d29ed36` | — | RA 親自合併 | `cd0a9e8` |
| #19 | Stage 3 交叉檢視 r1(腳本+統計報告) | `a82ec38` | TC-06 | RA 親自合併 | `a5e857d` |
| #20 | INTERPRET-002+2A 補件登錄(2.6.2/2.6.3)+交叉檢視 r2 | `620024b` | TC-07 | `PASS 620024b`(會期中) | `5443f7c` |
| #21 | 新版 2.6.1 全文候選推導 | `22ba0c1` | TC-08 | `PASS 22ba0c1`(會期中) | `36ed89b` |
| #22 | 新版 2.6.2/2.6.3 全文候選推導(RA 明示指示派工) | `c0c0a1b` | TC-09 | `PASS c0c0a1b`(會期中) | `dd981bd` |

裁決紀錄:INTERPRET-002(docs/interpretations/;RA 會期中結構化答覆「1A 2A」,2026-08-03)。來源登錄:12 筆(docs/source-register/)。

## 3. 需求與測試

- **主要成果(統計層)**:
  - INTERPRET-002:新版表一/表二皆屬降膽固醇規定之分表;舊版 2.6.1 全文=其單一舊版權威基準(規定表 B 之新版編號明示不裁決)。
  - r2 定位矩陣:A2-ITEM-01→2.6.1(唯一,PARTIAL 4/5);A2-ITEM-02→2.6.2(FOUND 12/12);A2-ITEM-03→2.6.3(FOUND 10/10);交叉命中僅各 1 片段。
  - 三份新版候選(payload 全數 repo 外,PENDING_RA_REVIEW):2.6.1 `8b178837…75f1`(11,392 bytes;表一 3/表二 2;日期列示 8→9);2.6.2 `a3c84db3…75f3`(784 bytes;日期列示 1→2);2.6.3 `57fef95e…e3dd`(952 bytes;條文 2→3、日期列示 4→5)。
- **測試**:每一 head SHA 於本地六項檢查全綠(typecheck/test 86/86/export:web/worker:types/worker:dry-run/governance-scan),並經 GitHub Actions `verify`+`governance-scan` 兩 required checks 全數 success(#20 run 30785080442、#21 run 30793881912、#22 run 30799038294;#18/#19 以各 merge 為憑)。
- **deterministic 查詢行為**:本段落零 packages/apps 變更,86 項既有測試(含負向)全數維持通過;test-matrix 無需增修。
- **腳本品質閘門(每單皆驗)**:雜湊閘門+強制失敗探針零殘留;冪等雙跑位元組一致;凍結檔對版本庫位元組複驗;產物安全自我掃描全零;builder 中文字面逐一稽核零規則內容。

## 4. Attestations(v3.2 §21.5.4)

- 機器可讀 attestation 四份:`.github/attestations/TC-20260803-0{6,7,8,9}.json`(task-contract/v1;builder+dispatcher-acceptance 雙紀錄;派工單全文 SHA-256 各自載明)。
- Builder(Terra Pro ↦ Codex GPT-5.6 Sol,exact id `gpt-5.6-sol`,xhigh):sessions `019fc56d…3d07`/`019fc5db…f5cd`/`019fc66e…f5cd`/`019fc6c0…e979`;四單皆一次派發零退回。
- Dispatcher-acceptance(Sol Pro ↦ Claude Fable 5,依 ADR-001;session_01QohqUPU5dYt5YV2ENrsQF7):四單皆獨立重跑複核通過(細節見各 TC 契約「執行結果附記」)。
- 獨立測試證據:派發方每單獨立重跑 ×2 之產物 SHA-256 紀錄+探針獨立實測,載於各 TC 契約與 PR 閘門。

## 5. 專項審查(階段性如實標注)

- RA/法規:本報告之 RA 簽記即為階段性紀錄;正式法規審查屬 Phase 1 結案項(未辦)。
- 隱私(個資):本段落零病人資料欄位(不變);正式隱私審查未辦。
- 資安:紅線掃描(CI required check)全綠;正式資安審查未辦。
- Mobile/Accessibility:本環境 BLOCKED(無 Xcode/adb),如實標注;本段落無 UI 變更。
- Performance:N/A(零 runtime 變更)。
- Migration/Rollback:N/A(零資料庫/部署變更)。

## 6. 未解決事項

| 項目 | 嚴重度 | 處置 | 追蹤位置 |
| --- | --- | --- | --- |
| 三份候選為推導產物,PENDING_RA_REVIEW,未經官方驗證 | 中 | 2026-09-01 官方新版可下載後收件+比對驗證(另案 TC) | 各推導報告固定警語 |
| 261 候選規定表 B 系(降三酸甘油酯表題)資料列 3→0 | 中 | RA 檢視候選檔確認新版該表處置 | TC-08 契約「RA 檢視點」 |
| RDL-005 維持 BLOCKED(正式規則/價格匯入、production、eligibility) | — | 續依 governed intake 逐案窄幅解除 | docs/regulatory-decision-log.md |
| M1 其餘完成條件(Stage 1–6 常態運轉、第二資料集入庫)未達 | — | 後續里程碑工作 | docs/milestones-and-issues.md |

## 7. 最終判定

- Final Decision:**PASS(階段性)**——以本報告 §2–§4 所列證據為限;不構成 Phase 結案、不解除 BLOCKED。
- Acceptance Model Tier:SOL_PRO(Claude Fable 5,依 ADR-001;exact id 以 session 執行紀錄保存)
- Acceptance Run ID:session_01QohqUPU5dYt5YV2ENrsQF7
- Accepted Commit SHA:以載有本報告之 PR head SHA 為準(RA 簽記於該 PR 閘門)
- Reviewed By / At:Claude Fable 5(派發方彙整)/ 2026-08-03
- RA 簽記:**待 RA 於載有本報告之 PR 以語式 `PASS <sha7>` 簽記**;簽記後由派發方轉錄至 PR 閘門並合併,即完成本階段驗收
