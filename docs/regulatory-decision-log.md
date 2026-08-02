# Regulatory decision log

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| RDL-001 | Use only invented `DEMO_DATA_ONLY` medication and price records | No official dataset or RA validation is present | Active |
| RDL-002 | Do not evaluate patient eligibility | Product scope is drug lookup; no patient fields are permitted | Active |
| RDL-003 | Fail closed on unavailable date/version coverage | Prevent an unverified or latest value being represented as applicable | Active |
| RDL-004 | Require manual review for ambiguous/no-coverage results | The system must not silently choose a medication record | Active |
| RDL-005 | Block formal rules, price import and production release | Original v3.2 prompt and official/RA-approved source inputs are absent | BLOCKED |
| RDL-006 | Keep synthetic source-intake results in logical quarantine, including mechanically `VERIFIED` evidence | Manifest, hash, provenance, authority and RA-state checks for `SYNTHETIC_TEST_ONLY` material establish test integrity only; they are not official-source or RA approval and may not publish or feed downstream lookup | Active |
| RDL-007 | Record the 2026-08-02 in-session receipt of Master Project Prompt v3.2 and four companion files by SHA-256 only; hold all received payload out of the repository | Official-looking material supplied mid-session may enter only through governed source intake with provenance and RA approval (RDL-005). Receipt satisfies the v3.2-prompt precondition of the Phase 1 gate, but no RA is designated, provenance is unverified, and declared companion sources are incomplete (see docs/spec-source-status.md) | Active |
| RDL-008 | Block Phase 1 implementation dispatch until the requester approves a Model Routing ADR | v3.2 §21.5 assigns build to a Terra Pro-tier model and independent acceptance to a Sol Pro-tier model, and §21.5.5 forbids silent substitution; mapping those tiers to the concretely available models (currently Codex GPT-5.6 Sol as builder, Claude Fable 5 as dispatcher/acceptor per CONTRIBUTING.md) requires the requester's explicit recorded consent | Resolved 2026-08-02 — requester/RA consent recorded in ADR-001 (docs/adr/ADR-001-model-routing.md) |
| RDL-009 | Designate the project owner as the regulatory authority (RA) for this project | Recorded 2026-08-02 from the project owner's explicit in-session structured answer. All future approvals of changes to BLOCKED decisions (including any change to RDL-005) and every governed-intake approval step trace to this designation. The designation covers project governance authority; it does not waive the v3.2 §32 professional sign-offs required before production release | Active |

This log is an engineering boundary record, not legal or regulatory advice. Only a designated regulatory authority can approve a change to a BLOCKED decision.
