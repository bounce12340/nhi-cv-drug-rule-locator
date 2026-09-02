# Security policy

## Scope

This is a static site on Cloudflare Pages. There is no server, no API, no database and no
accounts. Every dataset is compiled into the bundle and all lookups run in the visitor's
browser, so there is no request path to attack and nothing typed here reaches a backend.

The risk-tier tab does take clinical values — an LDL-C number and yes/no answers to the
announcement's criteria. Those live in React state only: never written to `localStorage`,
never transmitted, gone on reload. The tool accepts **no identifying patient data** —
no names, no record numbers, no free text.

## Reporting a concern

Do not put patient data, real credentials, undisclosed vulnerability detail, or official
source files into a public issue. Contact the maintainer through GitHub's private
vulnerability reporting on this repository, or privately by other means, and give the
maintainer a chance to fix it before disclosing.

## Safeguards that must hold

- **No secrets in this repository.** Deployment credentials live only in the repository's
  GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) and are read as
  `${{ secrets.* }}`. Never commit a token, and never paste one into an issue, a pull
  request or a log.
- **The dataset gates are not bypassable.** Codegen scripts pin the dataset version, each
  file's SHA-256 and its record count, and exit 1 on a mismatch rather than emitting
  something wrong. Never edit `packages/domain/src/generated/` by hand.
- **Lookups fail closed.** An unknown code, an invalid or out-of-range date, or an unknown
  dataset version returns `NOT_IN_VALIDATED_DATASET` — never the nearest or latest data.
  See "Rules that protect correctness" in [CLAUDE.md](CLAUDE.md).

---

# 安全政策

## 範圍

本站是掛在 Cloudflare Pages 上的靜態網站。沒有伺服器、沒有 API、沒有資料庫、沒有帳號。
所有資料集都編譯進前端 bundle,查詢全部在瀏覽器裡完成,因此沒有可攻擊的請求路徑,輸入的
內容也不會送到任何後端。

風險分級分頁確實會收臨床數值(LDL-C 數字、公告判定條件的是/否)。這些值只存在 React state
裡:不寫 `localStorage`、不送出、重新整理即消失。工具**不接受任何可識別病人資料**——不收
姓名、病歷號或自由文字。

## 通報方式

請勿把病人資料、真實憑證、尚未公開的弱點細節或官方來源檔貼進公開 issue。請透過本 repo 的
GitHub 私密弱點通報功能聯繫維護者,或以其他私下管道告知,並在公開揭露前給維護者修補的時間。

## 必須維持的防護

- **本 repo 不放任何 secret。** 部署憑證只存在 repository 的 GitHub Actions secrets
  (`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`),以 `${{ secrets.* }}` 取用。永遠不要
  提交 token,也不要貼進 issue、PR 或日誌。
- **資料集閘門不可繞過。** codegen 腳本寫死資料集版本、各檔案的 SHA-256 與筆數,不符就以
  離開碼 1 中止,而不是產生錯的東西。`packages/domain/src/generated/` 一律不得手改。
- **查詢一律 fail closed。** 未知代碼、無效或超出範圍的日期、未知的資料集版本,一律回
  `NOT_IN_VALIDATED_DATASET`,絕不改用最接近或最新的資料。理由見 [CLAUDE.md](CLAUDE.md)
  的「Rules that protect correctness」。
