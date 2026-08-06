# 上線執行手冊(RDL-018 範圍:web-only、無帳號、display-only)

> 依 RDL-018 與 §32 偏離紀錄。範圍:雙分頁 web(示範藥品查詢+官方逐字規則查詢)+Worker API。**web 靜態版單獨即可用**(UI 直接引 domain 引擎,不依賴 API);API 為附加查詢面。

## 1. 前置(擇一)

- **A. 由本 session 部署**:環境需有 `CLOUDFLARE_API_TOKEN`(scopes:Workers Scripts:Edit、Cloudflare Pages:Edit、Account Settings:Read)+`CLOUDFLARE_ACCOUNT_ID`;並在 Claude Code 環境允許 `wrangler` 指令(permission rule)。設定後告知即執行。
- **B. 由 RA 本機部署**:本機 `git pull` 後 `npx wrangler login` 一次,跑 §2 兩條指令即完成。

## 2. 部署指令

```bash
pnpm install && pnpm export:web                      # 產出 apps/clinician/dist
pnpm --filter @nhi-cv/api exec wrangler deploy        # API → *.workers.dev
pnpm exec wrangler pages deploy apps/clinician/dist --project-name nhi-cv-lookup   # Web → *.pages.dev(首跑自動建案)
```

自訂網域:部署後於 Cloudflare dashboard 綁定(不擋上線;先用預設網址亦可)。

## 3. 上線煙霧測試(逐項)

| 項 | 驗法 | 通過準則 |
| --- | --- | --- |
| Web 首頁 | 開啟 pages 網址 | 搜尋欄自動聚焦;示範警語+無病人資料聲明可見 |
| 官方規則查詢 | 切換分頁查一筆已知條文 | 逐字條文+「2026-09-01 生效」官方警語+資料集版本顯示 |
| fail-closed | 查不存在代碼/範圍外日期 | NOT_IN_VALIDATED_DATASET+人工覆核旗標,無自動更正 |
| API health | `curl <worker>/health` | 200 |
| API meta | `curl <worker>/v1/meta` | 版本+rulesDataset 正確 |
| API 查詢 | POST /v1/lookup 與 /v1/rules/lookup 各一 | 結果含強制警語;未知欄位被拒(400) |

## 4. 部署後登錄(回本 session)

告知部署完成+實際網址→我登錄:CHANGELOG 部署條目(日期/URL/部署之 commit SHA)、smoke 結果紀錄;後續每次重部署同式登錄。

## 5. 界線(不因上線改變)

真實支付價不顯示(無 governed 主檔);無帳號;無 eligibility;查詢內容不落日誌;B 軌閘門效力不變(Phase 2/送審)。
