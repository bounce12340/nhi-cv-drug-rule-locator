# 線上異常處置手冊

本手冊只涵蓋本專案已實際發生的線上或部署異常，不擴寫未驗證的事故情境。部署與網域設定仍以 [上線執行手冊](../launch-runbook.md) 為準；回滾只引用既有 [Backup / Restore / Rollback 計畫](../backup-restore-rollback-plan.md)。

## 1. 已知事故範圍

| 已發生事件 | 已確認成因或判讀 |
| --- | --- |
| 設定 `routes` 後 `*.workers.dev` 回 404 | `workers_dev` 預設轉為 `false`；顯式設回 `true` 並重新部署後恢復。當時 Web 靜態版不依賴 API，仍持續可用 |
| 三層自訂 API 主機名無法取得憑證 | 既有萬用憑證只涵蓋二層主機名；這是主機名層級限制，不是 token 權限問題。改用二層主機名後生效 |
| Pages 部署出現 `ENOENT` | API package filter 改變工作目錄，令相對的 Web 產物路徑解析到不存在的位置；既有 workflow 已改用 `${{ github.workspace }}` 起始的絕對路徑 |
| 部署後第一次驗證讀到舊 bundle hash | CDN 尚在傳播；等待傳播後，部署 URL、Pages alias、自訂網域與加 cache-bust 的自訂網域四處 hash 一致 |

事實來源為 [上線執行手冊](../launch-runbook.md) §2.1、§2.2 與 [CHANGELOG](../../CHANGELOG.md) 的 2026-08-06／07 部署紀錄。

## 2. 查核順序

收到「線上似乎是舊版、404 或部署失敗」回報時，依下列順序蒐證；尚未走完前，不急著回滾。

1. **端點狀態**
   - 分別查 Web 的 deployment-specific URL、`*.pages.dev` alias 與自訂網域是否可讀。
   - 分別查 API 的 `*.workers.dev` 與自訂網域 health 端點。
   - Web 與 API 要分開判讀；本專案的 Web 靜態版直接使用 domain 引擎，API 異常不等於 Web 同時失效。
2. **bundle hash 四處比對**
   - 對同一部署的 deployment-specific Pages URL、`*.pages.dev` alias、自訂 Web 網域，以及加唯一 cache-bust query 的自訂 Web 網域，取得實際載入的 bundle 並計算 hash。
   - 若部署後短時間內只有部分入口仍回舊 hash，先標記為「傳播中」，等待 CDN 傳播後再以同樣四處複驗。**讀到舊 bundle hash 本身不代表部署失敗，不得只憑首次結果回滾。**
   - 不設定未經本專案實測的固定等待分鐘數；保留首次與複驗的時間及四處 hash 是否一致即可，hash 值不需寫入本手冊。
3. **API 煙霧測試**
   - 依 [上線執行手冊](../launch-runbook.md) §3 既有項目檢查 health、meta、核准 fixture 的精確查詢、fail-closed 與未知欄位拒絕。
   - 不為事故測試臨時編造藥品代號或未經核准的資料案例。

## 3. 依既有事故分流

- `*.workers.dev` 在 routes 變更後單獨 404：先按 [上線執行手冊](../launch-runbook.md) §2.1 核對 `workers_dev` 的已知限制，再重新部署並複驗兩個 API 位址。
- 自訂網域卡在憑證發放，且使用三層主機名：按 §2.1 的已知限制改採既有二層命名方式；不得把此現象誤判為 token 權限不足。
- Pages 工作出現 `ENOENT`：按 §2.2 核對 Web 產物是否使用以 `${{ github.workspace }}` 起始的絕對路徑，避免 package filter 工作目錄改變相對路徑。
- 只有 bundle hash 暫時不一致：保留部署，不先回滾；等待傳播並完成四處複驗，再配合 API 煙霧結果下結論。

## 4. 回滾與事故登記

只有在傳播後複驗仍不一致，或端點／API 煙霧持續證明現行版本異常時，才進入 [Backup / Restore / Rollback 計畫](../backup-restore-rollback-plan.md) §3 的 Web rollback 路徑；本手冊不另造一套回滾步驟，也不把該計畫中未演練的內容表述為已驗證。

每次事故都要在 [CHANGELOG](../../CHANGELOG.md) 如實登記：時間、症狀、影響範圍、查核證據、成因、修正、複驗結果，以及執行者自身的流程瑕疵。不得只寫平台問題而省略自己的誤判、過早結論或驗收缺口。
