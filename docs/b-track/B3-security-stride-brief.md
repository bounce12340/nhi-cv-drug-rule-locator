# B3:正式 STRIDE 資安審閱——委任摘要

> 交付對象:資安審查者(外部顧問或具資格之獨立內部審查者;**不得為實作建置者**,SoD 原則同 CONTRIBUTING §4)。目的:完成 threat-model.md 明文之 **Phase 2 進入閘門=正式 STRIDE review**。完成前不進入帳號功能實作。

## 1. 審查範圍(auth/帳號資料面)

| 面 | 設計文件 |
| --- | --- |
| 認證與密碼/Passkey | docs/adr/ADR-006-auth-secure-storage.md+docs/m2-auth-detail-design.md(A1 已核參數:PBKDF2 600k、@simplewebauthn 候選、token/速率表) |
| Session 管理 | 同上 §1/§3(伺服器端權威、rotation、step-up) |
| 帳號資料模型 | docs/m2-account-schema-detail.md(十表;HMAC lookup+加密雙欄;enum-only audit) |
| API 面 | docs/api-specification.md(allowlist 防火牆、/v1 additive) |
| 基礎架構 | docs/adr/ADR-003-cloudflare-architecture.md、ADR-002(residency)、docs/data-flow-diagram.md 目標態 |
| 既有威脅模型 | docs/threat-model.md(現況面+Phase 2/3 目標態草稿——本次審查之底稿) |

## 2. 審查要求

1. 對每一面跑 **STRIDE 六類**,產出:威脅、現設計對策、殘餘風險、處置建議(接受/緩解/設計變更)。
2. 特別驗證點:醫師資格驗證流程之假冒面(SoD 雙核設計)、session 撤銷之時效(ADR-002 不啟用 replication 之安全理由)、audit log 不可否認性(enum-only+不可刪)、速率限制參數之充分性(m2-auth-detail-design §3)、HMAC 金鑰輪替待決項之風險定價(A2 遞延項)。
3. 邊界確認:查詢內容不落資料庫、無病人資料——請以攻擊者視角驗證此隔離在設計上是否可被繞過。

## 3. 交付物

STRIDE 報告(逐面×六類矩陣)+風險登記表(嚴重度、處置、負責人)+一頁結論:Phase 2 實作可否進入、附帶條件。

## 4. 回登

依 [README.md](README.md) §2:報告入台帳→threat-model.md 由草稿升版(引用報告)→設計變更類建議轉為 Phase 2 派工單前置項→Phase 2 進入條件於 phase-plan 重評(尚需 B2)。
