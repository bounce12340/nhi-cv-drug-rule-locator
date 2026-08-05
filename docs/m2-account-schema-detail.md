# M2 P3:帳號域 Schema 細化(structure-only)

> **DRAFT — structure-only。** 依 ADR-006 欄位邊界細化 docs/db-schema-migration-plan.md 之帳號域;不含任何實際資料值;Phase 2 首張 migration 派工單以本文件為欄位基準。**永久紅線不變**:任何表不得含病人識別/診斷/檢驗欄位;查詢內容不落資料庫。
>
> **2026-08-05 RA 裁示(A2,RDL-017)**:§0 資料域/帳號域**分離為兩個 D1 database 照案核定**;§1 HMAC 金鑰輪替策略與 §3 IP 遮罩格式兩項細節**遞延至 Phase 2 首張派工單**隨實作核定;其餘結構照案。

## 0. 部署原則(提案)

- **資料域與帳號域分離為兩個 D1 database**【已核:A2,RDL-017】:爆炸半徑隔離、備份/保留政策各自獨立(法規資料永久 vs 個資依 retention)
- 帳號域 migrations:forward-only+資料保全;每張 migration 附回滾說明(§30 #32 原則)

## 1. users(細化)

| 欄位 | 型別/性質 | 備註 |
| --- | --- | --- |
| id | PK(隨機,非序列) | 防枚舉 |
| email_hash | 唯一索引 | keyed lookup(HMAC【待核金鑰輪替策略】) |
| email_encrypted | 加密 | 顯示/寄信用;金鑰入 Secrets |
| email_verified_at | nullable | |
| name_encrypted | 加密 | 資格確認用;清單顯示遮罩 |
| license_no_lookup | 唯一索引 | HMAC(證書字號)(§18.2 keyed lookup token) |
| license_no_encrypted | 加密 | 僅資格確認流程可解;永不入 URL/log |
| password_hash / hash_scheme / password_updated_at | | PBKDF2 參數見 P2 §1 |
| status | enum(§13.1 十態) | 完整啟用四條件缺一不可 |
| institution / specialty / phone_encrypted | **全部 nullable** | 選填;前後端不得實質必填化 |
| mfa_enforced / created_at / updated_at | | 管理員 mfa_enforced=true |

## 2. physician_verifications

id PK|user_id FK|result enum(VERIFIED/REJECTED/PENDING)|source_type enum(官方查詢服務)|verified_at|verifier_admin_id|second_approver_id nullable(§13.4 SoD 高風險雙核)——**無自由文字欄**(防病人資訊誤入)、無截圖/影本欄(禁蒐)。

## 3. consent_records

id PK|user_id FK|policy_type enum(privacy/terms)|policy_version|consented_at|ip_masked【待核遮罩格式】——append-only;撤回=新列(type=withdrawal),不改舊列。

## 4. sessions

id PK(opaque)|user_id FK|created_at|expires_idle_at|expires_absolute_at|revoked_at nullable|rotated_from nullable|step_up_at nullable|user_agent_hash|created_ip_masked——伺服器端權威;關帳號即整批 revoke(§3)。

## 5. passkey_credentials

id PK|user_id FK|credential_id 唯一|public_key|sign_count|transports|created_at|last_used_at|revoked_at——公鑰非機密但仍不入 log。

## 6. email_change_requests / deletion_requests(DSR)

- email_change:id|user_id|new_email_encrypted|token_hash|expires_at|confirmed_at——雙向確認(舊信箱通知+新信箱驗證)
- deletion_requests:id|user_id|requested_at|verified_at|confirmed_at|executed_at|notified_at|exception_note_code enum——對應 DSR 流程 §4;**exception 以代碼枚舉,不設自由文字**

## 7. login_attempts(速率限制)

key(帳號 hash+IP 遮罩混合)|window_start|fail_count——短保存(retention:安全事件類);不記錄密碼嘗試內容。

## 8. audit_log(細化)

id PK|actor_id|actor_role|event_code enum|target_type/target_id|request_id|second_approver_id nullable|reason_code enum nullable|created_at——**event 以代碼枚舉,無自由文字**;不可刪(§13.3);封存權限最小化;永不含查詢內容/token/完整證書字號。

## 9. Retention class 標註

每表對應 docs/data-retention-schedule-draft.md 類別:users/verifications/consents=帳號存續+N【待核】;sessions/login_attempts=安全事件類;audit_log=5 年封存【待核】;deletion_requests=執行後保留其紀錄列(個資欄清空)。

## 10. 與資料域之邊界

帳號域永不 FK 到 drug/rule/price 表;查詢行為與帳號之關聯僅存在於**去識別聚合統計**(ADR-004),不存在於任何 schema 欄位。
