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
| RDL-008 | Block Phase 1 implementation dispatch until the requester approves a Model Routing ADR | v3.2 §21.5 assigns build to a Terra Pro-tier model and independent acceptance to a Sol Pro-tier model, and §21.5.5 forbids silent substitution; mapping those tiers to the concretely available models (currently Codex GPT-5.6 Sol as builder, Claude Fable 5 as dispatcher/acceptor per CONTRIBUTING.md) requires the requester's explicit recorded consent | BLOCKED |

This log is an engineering boundary record, not legal or regulatory advice. Only a designated regulatory authority can approve a change to a BLOCKED decision.
