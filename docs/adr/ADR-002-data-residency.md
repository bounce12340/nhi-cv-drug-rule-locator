# ADR-002: Data Residency(§30 #6)

- Status: **PROPOSED — 關鍵值待人工確認**(RA + 法律/個資人員確認後轉 Accepted;Phase 2 註冊功能實作前必須定案)
- 依據:v3.2 §17.4、§15.8;docs/data-flow-diagram.md 目標態

## Context

Cloudflare 的 APAC Location Hint 是效能與放置提示,**不等於台灣境內資料保存保證**(v3.2 §17.4)。本系統將保存兩類資料:法規/藥品/價格資料(非個資)與醫師帳號個資(Phase 2 起)。個資告知必須誠實揭露利用地區與可能的境外處理(§15.8)。

## Decision(草案)

1. **D1 primary location**:建立時指定 APAC location hint(目標:台灣醫師低延遲);建立後以 API 查證實際 primary location 並記錄於本 ADR。【待人工確認:實際位置與可接受性】
2. **Read replication**:初期**不啟用**——帳號啟用/關閉、session 撤銷等安全關鍵讀取必須讀到最新狀態(§17.3);若日後為效能啟用,僅限法規/藥品唯讀查詢,並採 D1 Sessions API 或 primary-first 策略,另立 ADR 修訂。
3. **R2 bucket**:APAC location hint;僅存官方文件與核准匯入檔(§17.5),不存證件影本。【待人工確認:實際位置】
4. **Logs 與分析資料**:依 Workers Observability 預設地區;以 §19.3 遮罩政策把個資擋在源頭,降低地區敏感性。【待人工確認:保存地區與期間】
5. **對外聲明紅線**:未取得可證明的技術與契約依據前,**不得宣稱「資料只保存在台灣」**;個資告知揭露「可能於境外(Cloudflare 全球基礎設施)處理」。
6. **Data Localization Suite**:暫不採購;若 RA/法務判定需要區域控制,另案評估。【待人工確認】

## Consequences

- Phase 2 個資告知文字必須引用本 ADR 定案後的實際位置結論。
- processor_register(tracker #30)需將 Cloudflare 列為受託處理者並記錄處理地區。
- 本 ADR 之【待人工確認】項目全部結案前,不得對外發布任何資料駐留聲明。
