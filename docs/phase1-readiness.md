# Phase 1 readiness assessment

Assessment date: 2026-08-02. Status: **NOT READY — BLOCKED.**

This document measures the gap between the Phase 1 gate (docs/phase-plan.md) and the material received on 2026-08-02 (docs/spec-source-status.md). It contains provenance metadata and structural observations only; no rule or price payload is reproduced here or anywhere else in this repository.

## Gate-by-gate status

| Phase 1 gate requirement | Status | Notes |
| --- | --- | --- |
| Original Master Project Prompt v3.2 | RECEIVED, pending confirmation | 3,187 lines, SHA-256 recorded; requester authenticity confirmation and governed intake still required |
| Official source datasets | PARTIAL | 3 of 4 declared CSVs received out-of-repo; the table-two statin list (declared 116 records), 表一/表二 full texts and the raw announcement/attachments are missing |
| Source ownership | MISSING | No custodian or origin channel declared for any received file |
| Update cadence | MISSING | Not defined |
| Retention policy | MISSING | Not defined |
| RA-approved interpretation procedure | MISSING | No RA designated; interpretation procedure undefined |

## P0 blockers before any Phase 1 implementation

1. **RA designation (RDL-005).** Only a designated regulatory authority can approve a change to a BLOCKED decision, and none is designated. The requester must record a designation in the decision log; every intake approval traces to it.
2. **Model routing consent (RDL-008).** v3.2 §21.5 requires a Terra Pro-tier builder and a Sol Pro-tier independent acceptor, and §21.5.5 forbids silent substitution when those tiers are not concretely available. The requester must approve a Model Routing ADR mapping the tiers to actual model identities before build work is dispatched.
3. **Official-class intake capability does not exist yet — by design.** `@nhi-cv/source-intake` accepts `SYNTHETIC_TEST_ONLY` material with an empty default authority registry. Extending intake to official-class material is itself Phase 1 build work that must go through dispatch and independent acceptance; it must not be shortcut by directly committing received files.
4. **Missing sources.** The table-two statin list, 表一/表二 full official texts, the raw announcement and attachments, and per-file provenance (origin, retrieval date, custodian) are absent. Partial data must not be padded, inferred or substituted (fail closed).
5. **Interpretation conflict reserved for RA.** The companion spec flags one combination product as an unresolved classification boundary case, while v3.2 §9.5 prescribes a definitive classification for it and requires an RA record. The conflict must be resolved through the RA procedure and recorded before any software encodes either reading.

## What may proceed while blocked

- v3.2 §30 planning artifacts that import no rule content: ADR drafts, requirement-to-test traceability skeletons, threat-model and privacy-inventory updates, wireframes — each marked 待人工確認 wherever a pending decision is assumed.
- Repository, CI and governance maintenance under the existing deterministic-lookup and demo-data invariants.

## Explicitly not started

- Committing or transcribing any received payload into the repository.
- Extending the domain, API or UI beyond `DEMO_DATA_ONLY` records.
- Any 符合／不符合給付 (eligibility) logic or copy.
- Production deployment of any component.
