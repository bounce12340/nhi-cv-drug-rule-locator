# M3 引擎消費規劃:governed 規則資料 → domain 查詢引擎(E1–E5)

> RA 2026-08-04 指示「出引擎消費規劃」。本文件規劃**規則引擎消費 governed 結構化規則資料集**(`nhi-lipid-rules-structured-2026-09-01-r1`,RDL-015)之範疇、機制、隔離設計與派工切分。規劃本身不解鎖任何事;實際解鎖=RA 對 §6 決定點之裁示+RDL-016 登錄。

## 1. 消費形態:第一階段=逐字文本查詢(display-only)

引擎新增「**給付規定文字查詢**」能力:輸入小節(2.6.1/2.6.2/2.6.3)或條文單元識別,回傳 governed JSONL 之**逐字條文單元**(verbatim_text+層級路徑+生效日+來源錨定+單元雜湊)。

明確排除(本階段不做,各有未來閘門):

- **可計算規則邏輯**:不解析條文中的條件、門檻、療程——那是詮釋,需未來獨立轉錄格式+驗證+RA 核准
- **藥品↔規則對映**:demo 藥品記錄不連結真實規則(需真實藥品代碼資料集,未收件);兩查詢面完全分離
- **eligibility**:依 RDL-002 永久排除;所有輸出禁止「符合/不符合給付」語彙(以負向測試鎖定)
- **價格接線**:price_change_seed 為異動清單、永非價格主檔(v3.2 §6),引擎價格維持 DEMO_DATA_ONLY

## 2. 資料進碼機制:build-time codegen(維持 domain 零 I/O)

`packages/domain` 為純函式、無 I/O——governed JSONL 不在 runtime 讀取,而以**決定性代碼生成**進碼:

1. 新增 `scripts/rules-codegen.mjs`:讀 governed JSONL(雜湊閘門對 storage-manifest)→ 生成 `packages/domain/src/generated/rules-2026-09-01.ts`(immutable 常量模組;檔頭嵌來源資料集版本+digest+單元數;位元組決定性)
2. **生成檔為 repo 內首次出現規則內容之處**——此即 RDL-005 核心解除點,邊界:僅得由 codegen 產生、嚴禁手改、逐單元保留 unit_sha256
3. **CI 漂移防護**:六項檢查外新增第七項(或併入 test):CI 重跑 codegen 並逐位元組比對生成檔,漂移即紅燈——生成檔與 governed 資料集的鏈結由機器持續看守
4. 三端(Web/iOS/Android/API)自然一致:皆經 domain 消費同一生成模組

## 3. DEMO/正式雙源隔離與雙警語

引擎自此有兩類資料,以型別層強制隔離:

| 資料類 | 內容 | 來源標記 | 警語(草案,G3 待 RA 核定文案) |
| --- | --- | --- | --- |
| 示範藥品記錄(現有) | 虛構藥品/價格 | `DEMO_DATA_ONLY` | 示範資料,非健保署核定資料/不可作為申報依據。(不變) |
| 規則文字單元(新) | 官方公告轉錄逐字文本 | `OFFICIAL_TEXT_TRANSCRIBED` | 官方公告之逐字轉錄(2026-09-01 生效),經保真驗證;本工具非健保署系統,查詢結果不可作為申報依據,實際規定以健保署公告為準。 |

- 每筆查詢結果**必帶**來源標記與對應警語;UI/API 雙處呈現
- 型別層禁止交叉:demo 查詢函式回傳型別不含規則單元,反之亦然;測試鎖定零交叉汙染
- as-of-date 語意各自獨立:demo 資料窗 2026-08 月不變;規則資料 effectiveFrom 2026-09-01——查詢日期早於生效日→`NOT_IN_VALIDATED_DATASET`(fail closed,不回「即將生效」之推測)

## 4. 不變量延伸與負向測試(invariant 5 之履行)

docs/architecture.md 五不變量全數延伸至規則查詢,並新增:

1. 小節/單元識別:正規化後精確比對;近似識別(如 2.6.4、2.61)→ `NOT_IN_VALIDATED_DATASET`,永不建議或自動更正
2. 歧義(如僅查「表一」跨多單元)→ `MULTIPLE_MATCHES` 列全部,永不自動選取
3. fail closed:無效日期/生效日前/dataset_version 不符 → `NOT_IN_VALIDATED_DATASET`
4. 非 `EXACT_MATCH` 一律 `manualReviewRequired: true`;EXACT_MATCH 僅表示單元存在,不隱含任何給付意涵
5. **新增**:全部輸出以負向測試斷言不含 eligibility 語彙(符合給付/不符合給付/可申報 等固定黑名單)
6. **新增**:生成模組逐單元 unit_sha256 於測試中對 governed manifest 鏈結重驗

docs/test-matrix.md 同步增列以上斷言。

## 5. 派工管線(E1–E5)

| 步驟 | 性質 | 內容 | 產出 |
| --- | --- | --- | --- |
| E1 本規劃 | 規劃(Fable) | 範疇+機制+決定點 | 本件,PR 供 RA 裁示 |
| E2 codegen | 建置(Codex xhigh) | `rules-codegen.mjs`+生成模組+CI 漂移防護 | 生成檔+防護測試 |
| E3 domain 擴充 | 建置(Codex xhigh) | `lookupRuleText`+雙源隔離型別+全套負向測試 | 引擎能力+test-matrix 同步 |
| E4 contracts+API | 建置(Codex xhigh) | 白名單欄位(額外欄位一律拒絕)+`POST /v1/rules/lookup`(additive) | API 面 |
| E5 UI | 建置(Codex xhigh) | 規則查詢分頁+雙警語呈現 | 三端畫面 |

每單獨立 TC(派工單雜湊、雙重覆核、attestation、RA PASS),建置慣例全套沿用(凍結、探針、冪等、字面稽核)。E2+E3 涉 deterministic 行為→負向測試隨單強制。

## 6. RA 決定點(已裁,2026-08-05)

RA 於驗收語式中一併裁示(原文「ASS a5e7485 G1照案 G2核准 G3照案 G4兩單 G5照案」,SHA 正確且五項齊備,判讀為 `PASS a5e7485` 之明顯漏字,原文如實在案;**RA 旋於同日以正字全文「PASS a5e7485 G1照案 G2核准 G3照案 G4兩單 G5照案」重簽,判讀獲確認**):

1. **G1 消費形態:照案**——第一階段=display-only 逐字文本查詢,§1 排除清單照列
2. **G2 核准**——RA 簽發 **`ENGINE-CONSUME-APPROVE nhi-lipid-rules-structured-2026-09-01-r1 display-only`**,登錄 RDL-016(RDL-005 第四次窄幅解除;可計算邏輯/對映/價格/eligibility 不在內)
3. **G3 警語文案:照案**(§3 草案兩則)
4. **G4 派工切分:兩單**(E2+E3 一單=TC-20260805-12;E4+E5 一單後續)
5. **G5 清單類資料:照案**(維持 storage-only)

## 7. 依然 BLOCKED(本規劃不觸碰)

production 部署(v3.2 §32 簽核前)、eligibility(永久)、可計算規則邏輯、藥品↔規則對映、價格主檔、9/1 生效版確認排程照舊。

回覆格式例:「G1照案 G2核准 G3照案(或附修文)G4兩單 G5照案」——G2 核准即簽發語式,我登錄 RDL-016 後依 G4 切分立即派 E2+E3。
