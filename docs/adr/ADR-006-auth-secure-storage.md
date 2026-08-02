# ADR-006: Authentication 與 Native Secure Storage(§30 #12)

- Status: **ACCEPTED as requirements baseline**(實作於 Phase 2/4;具體套件與 Passkey 方案於實作派工前定案【待人工確認】)
- 依據:v3.2 §12、§13、§14、§18.2、§18.5

## Context

使用者為醫師,需資格確認但**不得過度蒐集**;原生 App 的憑證保存與深鏈是行動端最大攻擊面。

## Decision

1. **註冊資料**:必填=真實姓名、email、醫師證書字號、登入憑證、個資+條款同意、Turnstile;選填=執業機構/科別/電話,**前後端都不得實質必填化**;禁蒐清單依 §12.3(不建證件影本上傳 API)。
2. **資格確認**:姓名+證書字號由管理員經衛福部正式查詢服務人工確認;只存驗證結果/來源類型/日期/驗證者,不存截圖或影本;不自動爬取官方系統(§12.4)。
3. **帳號狀態機**:採 §13.1 十態;完整啟用=email 驗證+資格 VERIFIED+管理員核准+ACTIVE 四條件缺一不可;關閉帳號立即撤銷全部 session 並寫不可刪 audit log;SoD:管理員不得自核自升,高風險操作需第二核准者(§13.4)。
4. **Turnstile**:註冊/登入/忘記密碼/重寄驗證/改 email/高風險管理操作全覆蓋;後端 Siteverify 必驗(success、過期、重放、hostname、action);服務異常不得默認放行(§14.1)。
5. **Session**:Secure+HttpOnly+SameSite、rotation、idle+absolute timeout、伺服器端撤銷;高風險操作 step-up;管理員強制 MFA/Passkey,醫師可選啟用(§14.3)。
6. **原生憑證保存**:token 僅存 iOS Keychain/Android Keystore backed storage;**禁存**:AsyncStorage、未加密 SQLite、plain preferences、localStorage、原始碼、crash log、analytics(§14.4);生物辨識僅解鎖本機憑證,不取代伺服器端驗證。
7. **驗證連結與深鏈**:email 驗證/密碼重設/刪除確認等一律走網域驗證之 Universal Links/App Links + Web fallback;驗證 host/path/action/state/token,拒未知參數;URL 不含姓名/證書字號/電話/病人資料;單一連結不得直接執行不可逆操作;敏感 token 不走可攔截的自訂 URL scheme(§14.5)。
8. **帳號刪除**:App 內+Web 皆有入口,重新驗證+二次確認,說明保存期限,完成通知;停用≠刪除(§14.6)。
9. **證書字號與電話保護**:不入 URL/一般 log/第三方;清單遮罩;加密保存+keyed lookup token(HMAC 類),金鑰入 Secrets 且可輪替(§18.2)。

## Consequences

- Phase 2 的 D1 schema(users/sessions/consents 等,§7.3–§7.4)以本 ADR 為欄位邊界。
- Token/email token 的實作參數(效期、長度、速率限制數值)於 Phase 2 派工單定案【待人工確認】。
- 測試矩陣需含 §25「帳號與個資」全部負向案例。
