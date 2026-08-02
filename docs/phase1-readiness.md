# Phase 1 readiness assessment

Assessment date: 2026-08-02 (updated the same day after the supplementary table-two-list receipt and the RDL-009/ADR-001 resolutions). Status: **NOT READY — BLOCKED.**

This document measures the gap between the Phase 1 gate (docs/phase-plan.md) and the material received on 2026-08-02 (docs/spec-source-status.md). It contains provenance metadata and structural observations only; no rule or price payload is reproduced here or anywhere else in this repository.

## Gate-by-gate status

| Phase 1 gate requirement | Status | Notes |
| --- | --- | --- |
| Original Master Project Prompt v3.2 | RECEIVED, AUTHENTICITY CONFIRMED | 3,187 lines; byte-identical independent re-delivery to the dispatcher session verified 2026-08-02, and the RA ruled the version authoritative (earlier update statement withdrawn) — docs/source-register/master-project-prompt-v3.2.md |
| Official source datasets | PARTIAL | 4/4 CSVs verified and in governed storage (RDL-012); both attachment PDFs and the announcement webpage capture hash-recorded (raw sources complete) — remaining: 舊版表二完整條文 (needed for the v3.2 §9.6 procedure; owner to supply) and confirmation that 附件2 does not contain the full 表一/表二 texts (initial label-count signal says it does not) |
| Source ownership | MISSING | No custodian or origin channel declared for any received file |
| Update cadence | MISSING | Not defined |
| Retention policy | MISSING | Not defined |
| RA-approved interpretation procedure | PARTIAL | RA designated 2026-08-02 (RDL-009); the interpretation procedure is drafted in docs/phase1-intake-runbook.md §9 and awaits RA approval of that runbook |

## P0 blockers before any Phase 1 implementation

1. **RA designation (RDL-005) — RESOLVED 2026-08-02.** RDL-009 records the project owner as the designated RA; every intake approval traces to that designation.
2. **Model routing consent (RDL-008) — RESOLVED 2026-08-02.** ADR-001 records the requester-approved tier mapping; build dispatch is unblocked and the first task contract (TC-20260802-01) has been executed under it.
3. **Official-class intake capability — RESOLVED 2026-08-02.** Built through dispatched task contracts and exercised end-to-end: `OFFICIAL_CANDIDATE` channel (TC-02), governed-storage validation (TC-03), Stage 3 verification with dual review (TC-04), first `INTAKE-APPROVE` recorded as RDL-012 with the dataset entering `data/governed/` under machine verification (TC-05 adds the continuous CI check).
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
