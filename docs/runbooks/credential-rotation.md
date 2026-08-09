# Cloudflare 部署憑證輪替手冊

本手冊只處理本專案實際使用的 Cloudflare 部署 token。憑證存放的三層對照以 [上線執行手冊](../launch-runbook.md) §1.1 為準，GitHub Actions secret 的位置與既有部署流程以同文件 §2.2 為準；此處不重抄存放表、權限表或部署指令。

## 1. 已發生的教訓

2026-08-07／08 曾兩次出現「宣稱舊 token 已撤銷，但以原憑證實測仍有效」。兩次成因相同：用顯示名稱辨認 token，撤銷了名稱相近但不是實際使用中的項目。顯示名稱只能協助閱讀，不能作為撤銷身分依據；唯一比對鍵是 token ID。

另一項必要控制是：撤銷後立即再觸發一次既有部署管線。只驗證舊 token 失效，不足以證明管線已切到新 token；若不做這一步，可能直到下次合併才發現部署憑證已失效。

## 2. 固定輪替順序

1. **建立替代 token**：權限維持 [上線執行手冊](../launch-runbook.md) §2.1 已實測的最小範圍。不要在 issue、PR、對話、文件、日誌或 artifact 貼出值。
2. **先放入新憑證**：更新 repository Actions secret；若個人雲端環境或當次容器仍使用部署 token，再依 §1.1 同步更新對應的受控位置。此時保留舊 token，直到撤銷驗證完成。
3. **驗證新憑證**：以新 token 呼叫帳戶層驗證端點 `GET /client/v4/accounts/{account_id}/tokens/verify`，確認請求成功且狀態為 `active`。回應中的 `result.id` 是後續識別依據，不得寫入 repository、文件、issue、PR、對話或日誌。端點定義見 [Cloudflare Verify Token API](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/)。
4. **在撤銷前證明新憑證可部署**：手動觸發既有 `Deploy` workflow，並依 [上線執行手冊](../launch-runbook.md) §3 完成部署後煙霧測試。失敗時停止輪替；不得先撤銷舊 token。
5. **以 ID 鎖定舊 token**：以舊 token 呼叫同一 verify 端點取得其 `result.id`，只撤銷與該 ID 完全相同的項目。不得以名稱、建立時間或列表位置代替 ID 比對。
6. **驗證舊 token 確實失效**：再以舊 token 呼叫 verify 端點；若仍可通過並回報 `active`，撤銷尚未完成，立即停止並重新按 ID 查核，不得宣稱完成。
7. **撤銷後再驗部署管線**：再次手動觸發 `Deploy` workflow，並重跑 §3 煙霧測試。這一次成功才證明實際部署路徑仍使用新 token。

固定順序是「新憑證入位 → 新憑證驗證與部署 → 以 token ID 撤銷舊憑證 → 舊憑證失效驗證 → 撤銷後部署複驗」。顛倒順序可能使部署中斷。

## 3. 完成紀錄

只記錄輪替日期、執行者角色、兩次部署 workflow 結果、煙霧測試結果，以及舊 token 已經由 ID 比對且不再有效。不得記錄憑證值、帳號 ID、token ID、回應全文或任何可推導憑證的特徵。
