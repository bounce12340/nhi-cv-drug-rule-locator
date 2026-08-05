# M2 P2:ADR-006 細部定案設計(提案)

> **PROPOSED — 供 Phase 2 派工單直接引用;逐項【待核】由 RA 於實作派工前核定。** 本文件補齊 ADR-006 之【待人工確認】細部;不寫程式、不改 ADR 本文。
>
> **2026-08-05 RA 裁示(A1,RDL-017)**:§1–§3 提案值**全數照案核定**——自建選型、PBKDF2-HMAC-SHA256 迭代 600,000、`@simplewebauthn/server`(仍以 Phase 2 首單之 Workers 相容性 PoC 為前提)、§3 九項 token/速率參數。本核定為 RA 側裁示;v3.2 §32 之法律/資安專業審閱仍為 B 軌待辦,Phase 2 進入條件不因此變更。

## 1. Auth 實作選型(提案)

| 選項 | 評估 | 提案 |
| --- | --- | --- |
| 自建輕量(Worker+D1) | 完全貼合 ADR-006 §3–§5 狀態機/session 規格;零新增個資處理者;Workers WebCrypto 原生 | **✔ 建議** |
| 第三方 IdP(Auth0/Clerk 等) | 新增個資受託處理者(醫師身分外流面)、狀態機客製受限、費用 | ✘ 不建議 |
| Cloudflare Access | 面向企業 SSO,非公眾註冊模型 | ✘ 不適用 |

- 密碼雜湊:**PBKDF2-HMAC-SHA256(WebCrypto 原生,Workers 相容)**,迭代 600,000【待核;OWASP 2023 建議值】,per-user salt 128-bit;升級路徑欄位 `hash_scheme` 預留(未來 Argon2id via WASM【待評估】)
- Session:伺服器端 D1 紀錄為權威(§5 rotation/撤銷);cookie 僅載 opaque session id

## 2. Passkey 方案(提案)

- 標準:WebAuthn Level 2;平台認證器優先(Face ID/Touch ID/Windows Hello),漫遊金鑰(USB security key)相容
- 庫選型:`@simplewebauthn/server`【待核:零 native 依賴、Workers 相容性 PoC 隨 Phase 2 首單實測】
- 政策:管理員**強制**(MFA 之一形式);醫師**選用**;生物辨識僅解鎖本機憑證(ADR-006 §6)
- 憑證表:見 P3 `passkey_credentials`

## 3. Token 與速率參數表(建議值,全數【待核】)

| 參數 | 建議值 | 依據 |
| --- | --- | --- |
| email 驗證 token | 128-bit、一次性、24h | §14.5 |
| 密碼重設 token | 128-bit、一次性、30min | 攻擊窗最小化 |
| session idle timeout | 30min | §14.3 |
| session absolute timeout | 12h(管理員 4h) | §14.3 |
| session rotation | 登入/提權時強制輪替 | §14.3 |
| 重寄驗證信 | 冷卻 60s、每日 5 次 | 濫用防護 |
| 登入失敗鎖定 | 帳號+IP 混合 5 次/15min,漸進延遲 | §14.1 |
| Turnstile 點位 | 註冊/登入/忘記密碼/重寄/改 email/高風險管理操作 | §14.1(ADR-006 §4 全覆蓋) |
| step-up 重驗證窗 | 高風險操作前 5min 內需重驗 | §14.3 |

## 4. 深鏈與驗證連結(定案化)

- 一律網域驗證之 Universal Links(iOS)/App Links(Android)+Web fallback;驗證 host/path/action/state/token,未知參數拒絕
- 敏感 token 永不走自訂 URL scheme;URL 永不含姓名/證書字號/電話
- 單一連結不得直接執行不可逆操作(§14.5)——連結僅導向確認頁

## 5. 與其他文件之鏈結

- 欄位落地:docs/m2-account-schema-detail.md(P3)
- 保存期:docs/data-retention-schedule-draft.md(值【待核】)
- 告知/同意:docs/privacy/(P1 三草案)
- 實作閘門:Phase 2 進入條件+正式 STRIDE review(threat model 擴充版所定)+v3.2 §32
