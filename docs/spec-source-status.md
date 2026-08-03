# Specification and source status

## Current truth

The original **Master Project Prompt v3.2** was received on 2026-08-02 as an in-session upload from the project owner, together with four companion files. A fifth declared file (`statin_table2_only_list.csv`) was received the same day in a concurrent session of the same owner and is recorded below as a supplementary receipt under the same RDL-007 procedure. Receipt is recorded by content hash only.

**Payload location status (updated 2026-08-02):** the four structured CSVs entered governed storage `data/governed/nhi-lipid-2026-09-01-r1/` under the RA's `INTAKE-APPROVE nhi-lipid-2026-09-01-r1 01a4df7` (RDL-012), after the full Stage 1–3 path (provenance, dual-reviewed verification, interpretation ruling); their integrity is machine-verified against the storage manifest. **Every other received payload — the v3.2 prompt, the companion spec, and both attachment PDFs — remains outside the repository tree**, and any further entry requires its own `INTAKE-APPROVE`.

| Received file (declared name) | SHA-256 | Bytes | Lines / records |
| --- | --- | --- | --- |
| `Master_Project_Prompt_v3.2.md` | `3509600f59a6d95284f292113f6b3142f31b4637bb5d4a1cb4202971dbcd3b61` | 88,055 | 3,187 lines |
| `ezetimibe_3month_exception.csv` | `dae9534d1eb31ffaab5a1c4de35c89d3348ad8d8c524eb34f678dc2a704eebb7` | 249 | 4 data rows + header |
| `ezetimibe_statin_combo_3month_exception.csv` | `d4513a6cdd514470b87100352e4d8cca2f17124b1f23b5dc4bff7042a8f15948` | 546 | 10 data rows + header |
| `price_change_seed_20260901.csv` | `a480f90d9dd8d9d3eefaf9d206d94898a1184dc62f3e927041fcac7e2f6c6f1f` | 7,650 | 57 data rows + header |
| `statin_table2_only_list.csv` (supplementary receipt 2026-08-02) | `b258acb48e68db096f74cb53abe89a96a6d2929701c7da89370484c00d2e8388` | 7,651 | 116 data rows + header |
| `README.md` (companion software spec v1.0) | `7e86f6562175b64818b1f6c378d18aac7e7292254b87a8b2e9a869fd98b88d89` | 9,719 | 169 lines |
| 附件1 PDF:全民健康保險藥品已收載項目異動明細表 (supplementary receipt 2026-08-02; upload filename transcoded, original filename to be declared) | `fafaae478dc8e188674c3585d65ef7d480c767fee8f5daa7b8b05458f6b6fe81` | 190,579 | 10 pages |
| 附件2 PDF:「藥品給付規定」修訂對照表 第2節 心臟血管及腎臟藥物 (supplementary receipt 2026-08-02; upload filename transcoded, original filename to be declared) | `6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2` | 325,429 | 13 pages |
| 公告本文網頁擷取 PDF (owner-saved capture of the announcement page, received 2026-08-02) | `792a05655c88b3a2f91a4ceeba6eccaad3bf64b049163222a4557764f7eb0422` | 74,827 | 1 page |
| 藥品給付規定 2.6.1 舊版全文 PDF (prior effective version, last revised 108/2/1; supplementary receipt 2026-08-03, retrieved 2026-07-28 by direct download from the official portal endpoint) | `bd7e96e5b8551c39718f80b3d5fa394581457e34f2dea1f8628a8982201bc79a` | 83,240 | 1 page |

Consistency observations (analysis only; no content imported):

- The received prompt file has exactly 3,187 lines, matching the size this document previously recorded for the unsynchronized original.
- The four received CSV data-row counts (4 / 10 / 57 / 116) all match the expected-volume declarations in Master Project Prompt v3.2 §6.
- The companion files present themselves as derived from 健保審字第 1150671962 號公告 (effective 2026-09-01). This is a claimed provenance, not a verified one.

## Classification of the received material

All five files are official-looking material supplied mid-session. Under RDL-005 and RDL-007 they:

- are held **out** of this repository and recorded by hash only,
- may enter only through the governed source-intake process with provenance and RA approval,
- must not be pasted into code, tests, fixtures, demo datasets or documentation,
- do not change the `DEMO_DATA_ONLY` status of the `@nhi-cv/domain` dataset.

## Still missing before Phase 1 intake can be considered

1. ~~`statin_table2_only_list.csv` (declared 116 records in v3.2 §6)~~ — received 2026-08-02 as a supplementary receipt (see table above); like every received file it stays out of the repository pending governed intake.
2. ~~The complete official text of 表二 (the announcement reportedly prints 「以下略」)~~ — **RESOLVED 2026-08-03**: the prior effective version of 給付規定 2.6.1 (full text incl. both tables, last revised 108/2/1) was received by hash-only supplementary receipt with full provenance (official portal endpoint, retrieved 2026-07-28); the owner ruled it the authoritative 舊版表二 full text. See docs/source-register/rule-2.6.1-prior-version-full-text.md. The NEW-version full text remains a derivation task for the v3.2 §9.6 procedure (old text + 附件2 revision table), not a further receipt.
3. The complete official text of 表一 — whether 附件2 (received 2026-08-02) contains it is to be confirmed during Stage 3 review; the 2.6.1 prior-version receipt (2026-08-03) contains both 規定表, and whether that fully covers the 表一 gap is part of the same Stage 3 determination.
4. ~~The official announcement and attachments themselves as raw source documents~~ — **RESOLVED 2026-08-02**: both attachment PDFs and the owner-saved capture of the announcement webpage (verified to carry the letter markers 主旨/發文字號/依據) are hash-recorded (see table above). All raw source documents for this announcement are now in custody, out-of-repo pending any future per-dataset `INTAKE-APPROVE`.
5. Per-file provenance: origin channel, retrieval date and custodian for every received file.
6. ~~Requester confirmation that the received prompt bytes are the authentic v3.2 original~~ — **CONFIRMED 2026-08-02**: the owner re-delivered byte-identical content to the dispatcher session (independent second delivery, hash MATCH) and ruled via structured in-session answer that this version IS the authoritative v3.2, withdrawing the earlier "requires an update" statement. See docs/source-register/master-project-prompt-v3.2.md.
7. ~~A designated regulatory authority (RA)~~ — RA designated 2026-08-02 (RDL-009); an RA-approved interpretation procedure is still missing.
8. Source ownership, update cadence and retention policy (phase-plan Phase 1 gate).

## Phase 0.5 preparation-only capability

The isolated Node package `@nhi-cv/source-intake` provides a logical integrity and quarantine gate for `SYNTHETIC_TEST_ONLY` test material only. It checks a fixed manifest schema, a SHA-256 calculated from raw bytes, synthetic source reference and retrieval metadata, an explicitly injected synthetic test authority, and an optional RA review record.

Even when complete synthetic evidence is mechanically marked `VERIFIED`, the result remains logically quarantined: it is not publishable and is not available to downstream lookup. This preparation capability is not a formal source import, does not accept official source material, and does not establish an approved dataset. Extending it to official-class material is Phase 1 implementation work in its own right and must follow the dispatch and acceptance process.

## Consequence

Formal regulatory import and any production release remain **BLOCKED** under RDL-005, with exactly one narrow amendment on record: RDL-012 admits the four hash-locked structured CSVs into governed storage (no product wiring, no deployment). Rule texts, 表二, the announcement letter, and every other dataset or use remain blocked; each future entry requires its own per-dataset `INTAKE-APPROVE`. See `docs/phase1-readiness.md` for the current gap analysis.

No implementation file may substitute memory, a web search, synthetic values or a partial summary for the missing sources.
