# Database Schema、Search Index 與 Migration Plan(§30 #32,結構草稿)

**Structure-only**:僅定義表/欄位/索引結構與遷移原則,不含任何權威資料值;權威欄位語意與正式資料一律俟 governed intake(RDL-005 閘門不變)。目標引擎:Cloudflare D1(SQLite;production 採用仍受 ADR-003 §17.2 實測閘門約束)。

## 資料域(法規資料;append-only)

| 表 | 欄位(結構) | 備註 |
| --- | --- | --- |
| datasets | version PK, effective_from, effective_to, digest_sha256, approval_ref, revoked, created_at | 對應 storage-manifest;RDL-013 只疊加,revoked 為標記不刪列 |
| drug_records | id PK, dataset_version FK, code, normalized_code, name, normalized_name, dosage_form, strength, payload_json | 欄位語意【待核:以官方欄位定義為準】;無自由文字病人欄位 |
| rule_records | id PK, dataset_version FK, rule_ref, applies_to_code, text_hash, payload_json | 規則本文結構待表二/給付規定資料集定案【待核】 |
| price_records | id PK, dataset_version FK, code, price_amount, currency, price_effective_from | 價格語意依 ADR-005;金額欄位不入 demo 值 |

## 帳號域(Phase 2;與資料域嚴格分離)

| 表 | 欄位(結構) | 備註 |
| --- | --- | --- |
| users | id PK, email_hash, email_verified_at, status, created_at | 不存明文 email 於索引外欄位【待核:加密策略】 |
| physician_verifications | id PK, user_id FK, result, source, verified_at, verifier | 不存證件影本(禁蒐) |
| consent_records | id PK, user_id FK, policy_type, policy_version, consented_at | 舉證用;retention schedule 管理 |
| sessions | id PK, user_id FK, expires_at, revoked_at | ADR-006 |
| audit_log | id PK, actor, event, target, request_id, created_at | 不含查詢內容;§13.3 不可任意刪除 |

**永久紅線**:任何表不得含病人識別、診斷、檢驗欄位;查詢內容不落資料庫(僅聚合去識別統計,ADR-004)。

## Search Index

- 代碼:`normalized_code` 唯一索引(dataset_version, normalized_code)——exact match only,不做模糊代碼索引(不自動更正之結構性保證)。
- 名稱:`normalized_name` 前綴索引;全文檢索採 SQLite FTS5,中文斷詞策略【待核:字元 n-gram vs 詞庫】;多筆命中回傳全部(MULTIPLE_MATCHES),索引層不排序取一。

## Migration Plan

1. 遷移工具:`wrangler d1 migrations`,遷移檔逐號入 repo,CI dry-run 驗證。
2. 資料域遷移只允許 additive(加表/加欄/加索引);破壞性變更需 RA 裁決+新 dataset_version 重灌,不就地改寫。
3. 帳號域遷移允許欄位演進,但刪除/縮短保存一律走 retention schedule 與 DSR 程序,不由遷移檔隱含執行。
4. 回滾:資料域=切回前一 dataset_version(引擎不刪舊版);schema 回滾依 backup-restore-rollback-plan.md。
5. 每次遷移附:結構 diff、受影響查詢清單、fail-closed 行為不變之測試證據。

## 驗收條件(實作期)

Schema 落地 PR 必附:本文件同步更新、遷移檔、負向測試(無病人欄位、exact-match 索引行為、視窗外 fail-closed)。
