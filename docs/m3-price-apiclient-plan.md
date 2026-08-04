# M3 續章規劃:price-comparison 套件(demo-only)+api-client(C1–C3)

> RA 2026-08-05 指示「M3及M2接續」之 M3 側。依 ADR-005:**真實價格比較的資料前提(完整支付價主檔)尚未存在**——現有 governed 價格資料僅為 57 筆異動清單(v3.2 §6 永非主檔)。故本章可行段=以 DEMO 資料建置語意完備的比較引擎+API client;真實價格接線鎖在主檔 intake 之後。

## 1. C1:packages/price-comparison(DEMO_DATA_ONLY)

依 ADR-005 語意全文實作,資料一律虛構:

- `comparability_key`(成分組成/含量/劑型/途徑/釋放型態/複方比例/支付單位/規格量)→ `DIRECTLY_COMPARABLE`/`CONTEXT_ONLY`/`NOT_COMPARABLE`/`INSUFFICIENT_DATA` 四態,全相容才可直接比較
- `price_status = CURRENT|FUTURE|MISSING|STALE|CONFLICT`;**任一候選非 CURRENT 即不得最低價排序**(僅顯示狀態);缺漏不補值、不顯示 0、不沿用舊價
- 名稱紅線:一律「健保支付價」;**禁用語黑名單負向測試**(推薦/最佳/首選/最省/節省百分比)比照 eligibility 黑名單機制
- 單次比較 ≤4 項;現行/未來價分列附生效日;純函式零 I/O、fail closed、非精確一律 manualReviewRequired——五不變量全數適用
- 明確非目標:不接任何真實價格(含 governed 異動清單)、不做每日/療程費用換算、不接 UI/API(接線屬後續單)

## 2. C2:packages/api-client

- 對 4 端點(health/meta/lookup/rules/lookup)之型別化薄客戶端;request/response 型別自 contracts 衍生,錯誤契約透傳
- 警語欄位原樣透傳(不得吞沒或改寫);零 secrets、零重試魔法(fail closed 透傳)
- 測試:與 worker handler 之整合測試(本地 fetch mock),契約欄位覆蓋

## 3. C3(決定點):governed 異動清單之真實價格顯示

技術上可比照規則模式(codegen+RDL-017 顯示授權),但 ADR-005 定調價格為最高誤導風險面,且異動清單缺主檔脈絡(舊→新價無現行全貌)易被誤讀為現行價。**建議:緩——待價格主檔 governed intake 後一併規劃**。

## 4. 派工

C1+C2 合一單(TC 下一號,Codex xhigh;同屬 packages 新增、demo-only、零資料閘門);全套慣例(凍結/探針/冪等/黑名單/86→122 既有測試零修改)。

## 5. RA 決定點

- **H1** C1 照案(demo-only 套件)
- **H2** C2 照案(api-client)
- **H3** C3:緩(建議)vs 建(需 RDL-017 新閘門)
- **H6**(與 M2 共用)派工切分:M3=C1+C2 一單 Codex;M2=文件側 Fable 直寫(見 m2-kickoff-plan)
