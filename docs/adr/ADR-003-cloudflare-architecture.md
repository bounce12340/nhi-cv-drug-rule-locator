# ADR-003: Cloudflare Architecture(§30 #7)

- Status: **ACCEPTED as planning baseline** — production 採用需通過 §17.2 適用性閘門之實測證據;替代方案評估紀錄在案
- 依據:v3.2 §17.1–§17.3、§17.6–§17.7;現況:apps/api 已為 Workers 型態(dry-run only)

## Context

v3.2 §17.1 給定基準架構,並明文「基準不是不可變更結論」;D1 採用前必須驗證資料量、寫入頻率、一致性、延遲、migration/回復與備份需求(§17.2)。

## Decision(基準)

| 元件 | 選型 | 條件/備註 |
| --- | --- | --- |
| Web client | Workers Static Assets | 既定 |
| Backend/API | Cloudflare Workers(TypeScript) | 既定;Phase 0 已建 |
| 關聯資料庫 | **D1(暫定)** | 通過 §17.2 閘門後定案;預估規模(藥品數千筆級、規則條款、醫師帳號)與寫入頻率(低)初判適合。【待實測:併發登入、transaction 需求、查詢延遲、migration 演練】 |
| 官方文件儲存 | R2(非公開 bucket) | 僅官方文件/匯入檔/備份;存取須授權並記錄 |
| 快取 | KV/Cache | 僅非敏感法規文字與版本 metadata;絕不作為帳號狀態/session/同意的真實來源(§17.6);敏感回應 `private, no-store` |
| 真人驗證 | Turnstile | 後端 Siteverify 必驗(§14.1) |
| 非同步 | Queues 或 ctx.waitUntil | 依工作型態 |
| 安全 | WAF、Rate Limiting、Bot 防護 | Phase 5 配置 |
| Secrets | Workers Secrets | 永不入 repo |
| 觀測 | Workers Observability | 搭配 §19.3 遮罩 |

## D1 一致性策略(§17.3)

安全關鍵查詢(帳號狀態、session、權限)一律 primary-first;若啟用 replication,唯讀法規查詢才可用 replica(見 ADR-002 第 2 點)。

## Alternatives considered

- **外部 PostgreSQL/MySQL + Hyperdrive**:若 §17.2 任一閘門不過(transaction 複雜度、資料量成長、備份年限),改採此案並修訂本 ADR——不硬塞 D1。
- 自建 VM/容器:違反 serverless 維運假設與團隊規模,不採。

## 備份與復原(§17.7,Phase 5 落實)

RPO/RTO 由業務負責人核定【待人工確認】;D1 Time Travel 作近期 PITR,但仍需定期還原演練、重大 migration 前 bookmark、超期長期備份、備份加密與權限。

## Consequences

- Phase 1(v3.2 編號)之 schema/migration 設計以 D1 SQLite 方言為前提;若閘門翻案,migration 層需可移植。
- 本 ADR 修訂需 RA 核可(治理文件程序)。
