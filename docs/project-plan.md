# Project plan

## Product outcome

建立醫師診間可快速查詢的台灣健保心血管／降血脂藥品資料工具，讓同一 deterministic 核心運行在 Web、iOS 與 Android。資料、法規與價格必須可追溯，且系統不接觸病人資料。

## Delivery gates

| Gate | Required evidence | Status |
| --- | --- | --- |
| Phase 0 foundation | Demo-only core, app, API, tests, security documents; native runtime remains unverified | Completed locally — see `docs/phase-0-build-report.md` |
| Source intake | Original v3.2 prompt, official source files, provenance and RA approval | BLOCKED |
| Verified dataset | Dual review, effective-date/version handling, reconciliation | BLOCKED |
| Clinical workflow review | Explicit non-eligibility UX and privacy review | BLOCKED |
| Production release | Security, legal/RA, deployment approval and release checklist | BLOCKED |

No gate may be skipped by substituting inferred regulation, scraped price, or synthetic record for an approved source.
