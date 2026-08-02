# Phase 1 readiness assessment

Assessment date: 2026-08-02 (updated the same day after the supplementary table-two-list receipt and the RDL-009/ADR-001 resolutions). Status: **NOT READY — BLOCKED.**

This document measures the gap between the Phase 1 gate (docs/phase-plan.md) and the material received on 2026-08-02 (docs/spec-source-status.md). It contains provenance metadata and structural observations only; no rule or price payload is reproduced here or anywhere else in this repository.

## Gate-by-gate status

| Phase 1 gate requirement | Status | Notes |
| --- | --- | --- |
| Original Master Project Prompt v3.2 | RECEIVED, superseded-pending | 3,187 lines, SHA-256 recorded; the owner stated on 2026-08-02 that this version requires an update — authenticity confirmation deferred to the superseding version (docs/source-register/master-project-prompt-v3.2.md) |
| Official source datasets | PARTIAL | 4 of 4 declared CSVs received out-of-repo (table-two statin list added by supplementary receipt 2026-08-02, 116 records matching §6); 表一/表二 full texts and the raw announcement/attachments are still missing |
| Source ownership | MISSING | No custodian or origin channel declared for any received file |
| Update cadence | MISSING | Not defined |
| Retention policy | MISSING | Not defined |
| RA-approved interpretation procedure | PARTIAL | RA designated 2026-08-02 (RDL-009); the interpretation procedure is drafted in docs/phase1-intake-runbook.md §9 and awaits RA approval of that runbook |

## P0 blockers before any Phase 1 implementation

1. **RA designation (RDL-005) — RESOLVED 2026-08-02.** RDL-009 records the project owner as the designated RA; every intake approval traces to that designation.
2. **Model routing consent (RDL-008) — RESOLVED 2026-08-02.** ADR-001 records the requester-approved tier mapping; build dispatch is unblocked and the first task contract (TC-20260802-01) has been executed under it.
3. **Official-class intake capability does not exist yet — by design.** `@nhi-cv/source-intake` accepts `SYNTHETIC_TEST_ONLY` material with an empty default authority registry. Extending intake to official-class material is itself Phase 1 build work that must go through dispatch and independent acceptance; it must not be shortcut by directly committing received files.
4. **Missing sources.** The 表一/表二 full official texts, the raw announcement and attachments, and per-file provenance (origin, retrieval date, custodian) are absent; the table-two statin list itself was received 2026-08-02 (hash-recorded, held out of repo). Partial data must not be padded, inferred or substituted (fail closed).
5. **Interpretation conflict reserved for RA.** The companion spec flags one combination product as an unresolved classification boundary case, while v3.2 §9.5 prescribes a definitive classification for it and requires an RA record. The conflict must be resolved through the RA procedure and recorded before any software encodes either reading.

## What may proceed while blocked

- v3.2 §30 planning artifacts that import no rule content: ADR drafts, requirement-to-test traceability skeletons, threat-model and privacy-inventory updates, wireframes — each marked 待人工確認 wherever a pending decision is assumed.
- Repository, CI and governance maintenance under the existing deterministic-lookup and demo-data invariants.

## Explicitly not started

- Committing or transcribing any received payload into the repository.
- Extending the domain, API or UI beyond `DEMO_DATA_ONLY` records.
- Any 符合／不符合給付 (eligibility) logic or copy.
- Production deployment of any component.
