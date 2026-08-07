# TC-20260807-21 建置者自我檢查報告

日期：2026-08-07（UTC）

## 1. 派工、順序與邊界核對

| 項目 | 結果 |
| --- | --- |
| 派工單 SHA-256 | `b0374cdbe2eccb793a8a09c9ef22d5dd178d5d88504fb54ec16f834103f6e0d2`，MATCH |
| 前置閱讀 | 已完整讀取派工單、`CLAUDE.md`、`apps/clinician/App.tsx`、`scripts/drug-items-codegen.mjs`、`packages/domain/src/drug-item-lookup.ts`、公告生成模組匯出介面及治理／架構文件 |
| 執行順序 | 先完成 §0 r2 codegen 切版與探針，再依 §1.1 → §1.6 完成 UI；產品產物全部落盤後才新增本報告 |
| 執行 git 指令 | 無 |
| `data/governed/**` | 無寫入；工作期間沒有檔案 mtime 變動，codegen 僅唯讀驗證 r2 manifest／CSV |
| `apps/api/**` | API 實作與端點零修改；僅依 §0 明示授權更新 `apps/api/src/drug-item-master-lookup.test.ts` 內嵌 r1 日期／版本常數，測試邏輯不變 |
| 暫存位置 | 漂移、hash mismatch 與 Wrangler 暫存均位於 `scratchpad/tc21/`；收尾時已無暫存檔案 |
| write-once | 新 r2 生成模組由正式 codegen 以 `wx` 建立一次；後續重跑只讀取並回報 unchanged；本報告最後一次新增 |

未執行 iOS／Android simulator 或實機驗證，也未宣稱已完成原生 runtime 驗證。

## 2. 檔案變更

| 檔案 | 變更 |
| --- | --- |
| `scripts/drug-items-codegen.mjs` | 切至 `nhi-drug-items-2026-08-07-r2`；更新 manifest 授權、來源 SHA-256／bytes、dataset digest、607／4,048 常數、輸出檔名與 RDL-022/023 檔頭 |
| `packages/domain/src/generated/drug-items-2026-08-06.ts` | 依派工刪除舊 r1 生成模組 |
| `packages/domain/src/generated/drug-items-2026-08-07.ts` | codegen write-once 新增 r2 生成模組 |
| `packages/domain/src/drug-item-lookup.ts` | import／re-export 改指向 r2 生成模組；既有查詢邏輯不改 |
| `packages/domain/src/drug-item-integration.ts` | 新增 frozen、零 I/O 純函式：公告三類精確成員資格、精確代碼 join、結果篩選、章節 token 比對與主檔列舉 |
| `packages/domain/src/index.ts` | 匯出整合純函式介面 |
| `apps/clinician/src/drug-item-ui.ts` | 新增公告分區 view resolver、固定查無文字與 768px 純版面決策 |
| `apps/clinician/App.tsx` | 整合為兩分頁；公告資料併入主檔卡片分區；新增標籤／篩選、章節導覽、兩則頁尾義務與 desktop/mobile 版面 |
| `packages/domain/src/drug-item-integration.test.ts` | 新增 8 項：成員資格、精確 join、freeze、token 正負向、章節列舉及 r2 空白章節試用品項鏈路 |
| `apps/clinician/src/drug-item-ui-integration.test.ts` | 新增 4 項：767/768 斷點、公告有資料、固定查無、近似代碼不補接 |
| `apps/clinician/src/consolidated-ui.test.ts` | 新增 7 項：兩分頁、標籤／篩選、章節導覽、分區、頁尾、響應式與文案紅線 |
| `packages/domain/src/generated-drug-items.test.ts` | §0 僅更新 r2 import、版本／計數／雜湊／bytes／RDL 常數，邏輯不改 |
| `packages/domain/src/drug-item-lookup.test.ts` | §0 僅更新有效日期與生成模組路徑常數，邏輯不改 |
| `apps/api/src/drug-item-master-lookup.test.ts` | §0 僅更新 r2 日期／版本常數，邏輯不改 |
| `apps/clinician/src/drug-item-master-ui.test.ts` | §1.6 將舊分頁存在斷言反轉為不存在，並鎖定兩個保留分頁存在；其餘既有斷言不改 |
| `docs/test-matrix.md` | 同步 r2 計數與整合、章節、響應式、頁尾測試證據 |
| `docs/TC-20260807-21-self-check.md` | 本報告 |

`POST /v1/items/lookup`、`POST /v1/drug-items/lookup` 與全部 API 實作維持不變。

## 3. 測試數增減與既有測試邊界

| 項目 | 實作前 | 實作後 | 差額 |
| --- | ---: | ---: | ---: |
| 測試檔 | 27 | 30 | +3 |
| 測試 | 260 | 279 | +19 |
| 通過 | 260 | 279 | +19 |

新增 19 項分布為 domain 整合 8、UI 純函式 4、整合 UI source assertions 7。既有測試只做派工單 §0 的常數更新與 §1.6 的斷言反轉；測試邏輯、註解與死字串均未用來繞過行為。

## 4. §0 codegen r2、冪等與漂移探針

| 項目 | 結果 |
| --- | --- |
| 資料集 | `nhi-drug-items-2026-08-07-r2` |
| 來源檔 | 1,844,105 bytes；SHA-256 `ec6c9fdb3a047d0ad9b29db6d0ffab23f0e0bb1ddd39851a7d50619bc3529412` |
| Dataset digest | `c340830cfff85c0d8fe067fde4033574f741d03ca3f3c9361329df05ec4c9857` |
| 生成內容 | 607 品項／4,048 期別；資料集生效日 `2026-08-07`；檔頭 RDL-022/023 |
| 生成模組 | 317,808 bytes；SHA-256 `49a09389edca526114ced051fbb4ba6ab59514c5743a71ff7865256a66bcf3e9` |
| 舊模組 | `drug-items-2026-08-06.ts` 不存在 |
| 獨立重跑 1 | `verified unchanged`，317,808 bytes，正式檔 SHA／mtime 不變 |
| 獨立重跑 2 | `verified unchanged`，317,808 bytes，正式檔 SHA／mtime 不變 |
| 最終 `--check` | PASS，生成位元與正式模組相同 |

探針結果：

- 強制來源 hash mismatch：exit 1，訊息為來源 SHA-256 不符雙重授權閘門；目標檔不存在，正式模組 SHA／mtime 不變。
- 生成漂移：在 `scratchpad/tc21/` 的 codegen 副本只竄改檔頭計數，定向 drift test 為 1 failed／7 passed，逐位元比對確實轉紅；正式模組未動。
- 冪等：首次正式生成使用 `wx`；其後四次一般／check 重跑均未重寫正式模組。

## 5. §1 功能驗證

| 範圍 | 自我檢查結果 |
| --- | --- |
| §1.1 兩分頁與公告併卡 | 只保留預設「藥品查詢」及「規則逐字查詢」；公告資料在每張主檔卡片的獨立版本／警語區塊顯示，兩資料集值不合併、不覆寫 |
| 公告分區三情境 | 精確共有代碼回公告列；無公告列回固定文字；一碼近似不補接，三者皆有測試 |
| r2 新增品項 | 唯一「主檔章節空白且公告試用清單成員」可由 master lookup 精確查得，公告分區顯示三個月註記，主檔章節維持空白 |
| §1.2 標籤／篩選 | 57 筆「本次公告異動」、14 筆「三個月試用清單」、116 筆「表二品項」逐筆與來源欄位交叉驗證；結果提供「全部」及三類篩選 |
| §1.3 章節導覽 | 2.6.1／2.6.2／2.6.3 規則結果可切至藥品分頁並套用章節；來源欄先逗號切 token，再完整比對 `${section}.` |
| 章節負向 | `8.2.6.1.`、`2.6.10.`、`2.6.1.1.` 均不命中 2.6.1；多 token 與 token 前後空白為正向；UI 不使用 `coverageRuleSection.includes` |
| §1.4 頁尾 | 兩則核定文字逐字存在，既有「請勿輸入姓名…」句子逐字保留，頁尾不依分頁或查詢結果卸載 |
| §1.5 響應式 | `getClinicianLayoutMode` 在 767px 回 mobile、768px 回 desktop；desktop 最大寬 960px、卡片雙欄、價格列為欄式表格，mobile 為單欄；資料與警語不因版面分支而增減 |
| §1.6 斷言反轉 | 舊分頁文字負向斷言與兩個保留分頁正向斷言全綠 |
| 文案／價格紅線 | UI／domain 自撰來源未命中 eligibility 五詞或「符合／不符合…規定」句式；價格只顯示來源值、日期與期別，不產生評價文字 |

## 6. Web bundle 驗證與增量

量測對象為每次 `pnpm export:web` 後唯一的 `apps/clinician/dist/_expo/static/js/web/AppEntry-*.js`。

| 狀態 | Bytes | SHA-256 |
| --- | ---: | --- |
| 實作前 | 804,884 | `b231524272e588ac121d4759d77c1e60e020967c6610240532a1fec9b9629e59` |
| 實作後 | 810,074 | `b1260dce6c40088811b99a2f284431550ca2daa8e55dd7919359b8c67a5d397f` |
| 實際增量 | **+5,190** | — |

以唯讀 Node 掃描先解開 bundle 的 `\\uXXXX` 字面後驗證：

- 「藥品查詢」、「規則逐字查詢」、三個事實標籤、「查看本章節品項」均存在。
- 「藥品品項查詢」不存在。
- 開放資料顯名標示、無個資聲明、既有請勿輸入聲明均存在。
- eligibility 黑名單逐詞計數：`符合給付` 0、`不符合給付` 0、`可申報` 0、`准予給付` 0、`不予給付` 0。
- 「符合／不符合」後接規定的禁止句式為 0。

## 7. 五項 deterministic-lookup 檢查

| 不變量 | 證據 | 結果 |
| --- | --- | --- |
| 代碼僅規定正規化後精確比對 | 既有一碼近似 master lookup 負向續過；跨資料集 resolver 另有近似代碼不補接測試 | PASS |
| 名稱只做允許正規化，多筆不自選 | 既有中文／英文／成分、劑量保留與多筆全回測試續過 | PASS |
| 日期／版本 fail closed | 既有 invalid／gap／前後期別測試續過；章節列舉後仍逐筆走 master lookup，不繞過日期／版本閘門 | PASS |
| 非 EXACT_MATCH 需人工確認 | 既有 exact／multiple／not-in-dataset 斷言續過；UI 未新增任何資料推導結論 | PASS |
| deterministic 變更具負向測試 | 新增 token look-alike、公告近似代碼、767/768 邊界及查無情境，並同步 test matrix | PASS |

## 8. 五項驗收檢查

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS；7 個 workspace typecheck 全部完成 |
| `pnpm test` | PASS；30 files／279 tests |
| `pnpm export:web` | PASS；單一 Web bundle 810,074 bytes |
| `pnpm worker:types` | PASS；Worker types up to date |
| `pnpm worker:dry-run` | PASS；Total Upload 503.64 KiB／gzip 66.22 KiB；`--dry-run` 正常退出，未部署 |

## 9. 結論

§0 至 §1.6 均依指定順序完成；codegen 冪等、來源錯配、生成漂移、章節 look-alike、公告近似代碼、響應式斷點、bundle 必要／移除字樣及黑名單掃描皆符合派工驗收。此為建置者自我檢查，不取代派發方／驗收方的獨立覆核。
