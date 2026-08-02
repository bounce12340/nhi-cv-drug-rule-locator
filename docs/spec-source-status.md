# Specification and source status

## Current truth

The original **Master Project Prompt v3.2** was received on 2026-08-02 as an in-session upload from the project owner, together with four companion files. Receipt is recorded by content hash only; **none of the received payload has been committed to this repository**, and the files remain outside the repository tree.

| Received file (declared name) | SHA-256 | Bytes | Lines / records |
| --- | --- | --- | --- |
| `Master_Project_Prompt_v3.2.md` | `3509600f59a6d95284f292113f6b3142f31b4637bb5d4a1cb4202971dbcd3b61` | 88,055 | 3,187 lines |
| `ezetimibe_3month_exception.csv` | `dae9534d1eb31ffaab5a1c4de35c89d3348ad8d8c524eb34f678dc2a704eebb7` | 249 | 4 data rows + header |
| `ezetimibe_statin_combo_3month_exception.csv` | `d4513a6cdd514470b87100352e4d8cca2f17124b1f23b5dc4bff7042a8f15948` | 546 | 10 data rows + header |
| `price_change_seed_20260901.csv` | `a480f90d9dd8d9d3eefaf9d206d94898a1184dc62f3e927041fcac7e2f6c6f1f` | 7,650 | 57 data rows + header |
| `README.md` (companion software spec v1.0) | `7e86f6562175b64818b1f6c378d18aac7e7292254b87a8b2e9a869fd98b88d89` | 9,719 | 169 lines |

Consistency observations (analysis only; no content imported):

- The received prompt file has exactly 3,187 lines, matching the size this document previously recorded for the unsynchronized original.
- The three received CSV data-row counts (4 / 10 / 57) match the expected-volume declarations in Master Project Prompt v3.2 §6.
- The companion files present themselves as derived from 健保審字第 1150671962 號公告 (effective 2026-09-01). This is a claimed provenance, not a verified one.

## Classification of the received material

All five files are official-looking material supplied mid-session. Under RDL-005 and RDL-007 they:

- are held **out** of this repository and recorded by hash only,
- may enter only through the governed source-intake process with provenance and RA approval,
- must not be pasted into code, tests, fixtures, demo datasets or documentation,
- do not change the `DEMO_DATA_ONLY` status of the `@nhi-cv/domain` dataset.

## Still missing before Phase 1 intake can be considered

1. `statin_table2_only_list.csv` (declared 116 records in v3.2 §6) — not supplied.
2. The complete official text of 表二 (the announcement reportedly prints 「以下略」; the companion spec commits to a later delivery).
3. The complete official text of 表一 (the companion spec §4.2 directs verbatim capture from the announcement attachment; no attachment file was supplied).
4. The official announcement and attachments themselves (健保審字第 1150671962 號) as raw source documents.
5. Per-file provenance: origin channel, retrieval date and custodian for every received file.
6. Requester confirmation that the received prompt bytes are the authentic v3.2 original.
7. A designated regulatory authority (RA) and an RA-approved interpretation procedure.
8. Source ownership, update cadence and retention policy (phase-plan Phase 1 gate).

## Phase 0.5 preparation-only capability

The isolated Node package `@nhi-cv/source-intake` provides a logical integrity and quarantine gate for `SYNTHETIC_TEST_ONLY` test material only. It checks a fixed manifest schema, a SHA-256 calculated from raw bytes, synthetic source reference and retrieval metadata, an explicitly injected synthetic test authority, and an optional RA review record.

Even when complete synthetic evidence is mechanically marked `VERIFIED`, the result remains logically quarantined: it is not publishable and is not available to downstream lookup. This preparation capability is not a formal source import, does not accept official source material, and does not establish an approved dataset. Extending it to official-class material is Phase 1 implementation work in its own right and must follow the dispatch and acceptance process.

## Consequence

Formal regulatory import and any production release remain **BLOCKED**. Receipt of the v3.2 prompt satisfies one precondition of the Phase 1 gate; it does not by itself approve intake, unblock RDL-005, or authorize committing any received content. See `docs/phase1-readiness.md` for the current gap analysis.

No implementation file may substitute memory, a web search, synthetic values or a partial summary for the missing sources.
