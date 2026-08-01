# Regulatory decision log

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| RDL-001 | Use only invented `DEMO_DATA_ONLY` medication and price records | No official dataset or RA validation is present | Active |
| RDL-002 | Do not evaluate patient eligibility | Product scope is drug lookup; no patient fields are permitted | Active |
| RDL-003 | Fail closed on unavailable date/version coverage | Prevent an unverified or latest value being represented as applicable | Active |
| RDL-004 | Require manual review for ambiguous/no-coverage results | The system must not silently choose a medication record | Active |
| RDL-005 | Block formal rules, price import and production release | Original v3.2 prompt and official/RA-approved source inputs are absent | BLOCKED |
| RDL-006 | Keep synthetic source-intake results in logical quarantine, including mechanically `VERIFIED` evidence | Manifest, hash, provenance, authority and RA-state checks for `SYNTHETIC_TEST_ONLY` material establish test integrity only; they are not official-source or RA approval and may not publish or feed downstream lookup | Active |

This log is an engineering boundary record, not legal or regulatory advice. Only a designated regulatory authority can approve a change to a BLOCKED decision.
