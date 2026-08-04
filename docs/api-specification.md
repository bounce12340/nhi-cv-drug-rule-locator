# Drug Lookup / Price Comparison API Specification(§30 #33,結構草稿)

**Structure-only**:定義端點面、請求/回應結構與相容性規則,不含權威資料值;正式欄位語意俟 governed intake(RDL-005)。相容性策略依 ADR-007(`/v1` 凍結、僅 additive);錯誤契約沿用 `@nhi-cv/contracts` 之 JSON 錯誤格式。

## 已實作(Phase 0)

| 端點 | 說明 |
| --- | --- |
| GET /health | 存活探測;無業務資料 |
| GET /v1/meta | 資料集版本、涵蓋視窗、警語 |
| POST /v1/lookup | body 僅允許 `query`/`as_of_date`/`dataset_version`(未知欄位一律拒絕=病人資料防火牆);回應三態+`manualReviewRequired` |
| POST /v1/rules/lookup | body 僅允許 `query`/`as_of_date`/`dataset_version`;回傳逐字規則單元與來源警語 |

### 規則逐字查詢(E4;additive)

- `POST /v1/rules/lookup` request:`{query: string, as_of_date: string, dataset_version?: string}`;三欄之外一律依既有 `INVALID_REQUEST` 錯誤契約拒絕。
- Success response:`{result: {status, sourceTag, warning, manualReviewRequired, datasetVersion, effectiveFrom, units}}`;每個 `units[]` 保留 domain 回傳的 `clausePath`、`verbatimText` 與來源追溯欄位。
- 日期格式、資料集有效起日或版本不匹配由 domain 回傳封閉結果,不改寫為近似值。
- `GET /v1/meta` additive 增列 `rulesDataset: {version, effectiveFrom}`,原有欄位維持不變。
- 完成日誌僅增加狀態、單元數與 request ID,不寫入 request body 或 `query` 文字。

## 規劃端點(結構)

### 資料(Phase 1+)

- `GET /v1/datasets` — 版本清單:`[{version, effective_from, effective_to, revoked}]`;不回傳 payload 細節。

### 帳號(Phase 2,ADR-006)

- `POST /v1/auth/register`:`{email}` → 驗證信流程;不收任何執業資料以外欄位【待核:資格驗證輸入欄位】
- `POST /v1/auth/verify-email`:`{token}`
- `POST /v1/auth/login` / `POST /v1/auth/logout`
- `GET /v1/account` / `DELETE /v1/account`(DSR;觸發 retention 流程)
- 驗證狀態:`GET /v1/account/verification` → `{status}`(待審/通過/退回)

### 價格比較(Phase 3,ADR-005)

- `POST /v1/price-comparison`:`{group_ref, as_of_date, dataset_version}` → 同組別排序表(語意由 price-comparison 套件單一實作);允許欄位白名單同 lookup 之防火牆模式。

## 全域規則

1. **請求白名單防火牆**:每個端點的 body/query 欄位採 allowlist,未知欄位=400 拒絕(不忽略、不透傳);任何端點永不接受病人相關欄位。
2. **回應必附**:`dataset_version`、as-of 語境、示範/資料狀態警語欄位;非 EXACT 類結果一律 `manualReviewRequired: true`。
3. **錯誤契約**:`{error: {code, message, request_id}}`;不回顯使用者輸入原文。
4. **版本策略**:`/v1` 僅 additive(新增欄位/端點);破壞性變更開 `/v2` 並依 ADR-007 併行窗口支援舊行動版本。
5. **日誌**:event/status/candidate count/request ID,永不含 query 內容(現行 Worker 慣例入規格)。
6. **認證**:Phase 2 起除 /health、/v1/meta 外均需 session;rate limit 與 Turnstile 介接【待核:閾值】。

## 正式化

OpenAPI 文件於 Phase 3 隨 `packages/api-client` 生成時正式化(monorepo-reconciliation);屆時本文件轉為變更決策紀錄,schema 以 OpenAPI 為單一事實來源。
