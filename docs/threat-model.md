# Threat model

## Assets and safety properties

- No patient data may enter, persist in, or leave the system.
- Demo data may never be mistaken for official rules or payment prices.
- A query must not yield an inferred code, silently selected candidate or untraceable effective date/version.
- Worker configuration must not contain secrets.

## Main threats and mitigations

| Threat | Mitigation in Phase 0 | Residual risk |
| --- | --- | --- |
| User enters patient information | UI warning; API allowlist rejects unknown fields; no persistence | Free-text `query` cannot technically prove intent, so policy and UX remain needed |
| Demo result used for claim | Persistent Chinese warning in app/API/result plus demo status fields | Human misuse cannot be eliminated; no deployment is allowed |
| Near-match drug error | 10-character exact code lookup; no fuzzy correction | User can still choose an incorrect query |
| Ambiguous name match | Return all candidates and set `manualReviewRequired` | Reviewer must make an external decision |
| Stale/unknown data | Dataset version/date gate fails closed | Official refresh pipeline does not yet exist |
| Secret leakage | No secret configuration; `.dev.vars` and env files ignored | Future bindings need secret-store review |
| API abuse / misleading error | Structured generic errors and no-store responses | Auth/rate limits are deferred until a sanctioned deployment design |

## Phase 1+ additions (current surface)

Assets added since Phase 0: governed datasets under `data/governed/` (integrity + provenance chain), the task-contract/attestation governance chain, and builder/dispatcher credentials (env-only, never in repo or chat).

| Threat | Mitigation (in place) | Residual risk |
| --- | --- | --- |
| Tampering with a governed dataset after INTAKE-APPROVE | Per-file SHA-256 + byte length + directory purity verified in CI on every run (governed-store.test.ts); append-only policy (RDL-013) | A compromised writer could also edit the manifest; mitigated by PR review + SHA-bound acceptance |
| Unapproved official-looking content entering the repo | governance-scan CI tripwire (code shapes, announcement numbers, price wordings, patient keywords) on added lines and untracked files | Regex tripwire only — paraphrased content can pass; RA review remains the real gate |
| Builder (Codex) exceeding dispatched scope | Sandbox workspace-write, network off, read-only `.git`; dispatcher re-verifies diff against contract before commit | Prompt-injection via contract inputs; mitigated by dispatcher-authored contracts and independent acceptance |
| Attestation forgery or drift | Fixed schema (docs/schemas/), task-contract SHA-256 binding, session-record links; merge gate binds PASS to exact head SHA | CI machine-validation of attestations not yet wired (dispatched later) |
| Credential leakage (builder auth) | Env-only storage (RDL-011); never pasted into repo/chat; classifier+scan guards | Rotation cadence not yet defined 【待核】 |

## Phase 2/3 target-state threats (planning; STRIDE review before Phase 2 【待人工確認】)

| Threat | Planned mitigation | Source |
| --- | --- | --- |
| Credential stuffing / session theft | Rate limits + Turnstile, short-lived sessions, secure storage per platform | ADR-006; api-specification.md |
| Fake physician registration | Verification workflow with recorded result/source/verifier; no document images stored | ADR-006; db-schema #32 |
| Email verification abuse (enumeration, bombing) | Neutral responses, per-address throttling, token expiry | api-specification.md 【待核:閾值】 |
| Injection via lookup/price queries | Parameterized D1 statements only; allowlist firewall already rejects unknown fields | db-schema #32 |
| Price/rule data poisoning between intake and serving | Serve only from datasets whose digest matches the governed manifest; version pinned in every response | storage.ts chain; api rule 2 |
| Query-content leakage via logs/analytics | Structured logs without query content (existing rule), de-identified aggregates only, no session replay | ADR-004 |
| Dependency / supply-chain compromise | Lockfile-pinned installs, CI-only builds; SBOM and audit cadence 【待核】 | CONTRIBUTING |
| DoS on lookup/price endpoints | Cloudflare-layer rate limiting + budget alarms 【待核:額度】 | ADR-003 |

Review cadence: this file is re-reviewed at every phase gate; the Phase 2 entry gate requires a completed formal STRIDE pass over the auth/data surface.
