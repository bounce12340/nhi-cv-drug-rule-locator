# 上線執行手冊(RDL-018 範圍:web-only、無帳號、display-only)

> 依 RDL-018 與 §32 偏離紀錄。範圍:雙分頁 web(示範藥品查詢+官方逐字規則查詢)+Worker API。**web 靜態版單獨即可用**(UI 直接引 domain 引擎,不依賴 API);API 為附加查詢面。

## 1. 前置(擇一)

- **A. 由 session 部署**(2026-08-06 首次部署採此途徑):需 `CLOUDFLARE_API_TOKEN`(scopes:Workers Scripts:Edit、Cloudflare Pages:Edit、Account Settings:Read)+`CLOUDFLARE_ACCOUNT_ID`。
- **B. 由 RA 本機部署**:本機 `git pull` 後 `npx wrangler login` 一次,跑 §2 兩條指令即完成。

### 1.1 憑證存放規則(RDL-011 同式;**值一律不入本文件、不入 repo**)

| 位置 | 效力 | 用途 |
| --- | --- | --- |
| 個人雲端環境之環境變數設定(claude.ai/code 環境設定) | **跨 session 持久**——容器回收後仍在 | 正式存放處;僅專案負責人可設定 |
| 容器內使用者層級 `~/.claude/settings.json` 之 `env` | 僅該容器存續期間 | session 內即用;容器回收即消失,需重設 |
| repo 內 `.claude/settings.json` | — | **禁用**:該檔為 git 追蹤檔,寫入即等於提交祕密 |

`.gitignore` 已涵蓋 `.claude/settings.local.json` 與 `.claude/*.local.json`,以防本機層級設定挾帶祕密被提交。憑證輪替或外洩時:於 Cloudflare dashboard 撤銷該 token 後重發,並更新上述兩處。

## 2. 部署指令

```bash
pnpm install && pnpm export:web                      # 產出 apps/clinician/dist
pnpm --filter @nhi-cv/api exec wrangler deploy        # API → *.workers.dev
pnpm exec wrangler pages deploy apps/clinician/dist --project-name nhi-cv-lookup   # Web → *.pages.dev(首跑自動建案)
```

### 2.1 自訂網域(RA 2026-08-06 裁示 N1A/N2A)

| 面 | 主機名 | 綁定方式 |
| --- | --- | --- |
| Web | `nhi.uic-ai.com` | Pages 專案 custom domain(已登記)+ **CNAME `nhi` → `nhi-cv-lookup.pages.dev`(proxied)** |
| API | `api.nhi.uic-ai.com` | wrangler.jsonc `routes` 之 `custom_domain: true`;部署時自動建立 DNS 與憑證 |

預設位址 `*.pages.dev` / `*.workers.dev` 於綁定後仍然有效,不影響既有連結。

**權限要求**:自訂網域綁定需部署憑證具 **Zone → DNS → Edit** 與 **Zone → Workers Routes → Edit**(範圍限本 zone);僅有 Workers/Pages 權限時,Pages 自訂網域會停在 `pending` 而 DNS 不會自動建立,Worker 端部署則會失敗。

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
