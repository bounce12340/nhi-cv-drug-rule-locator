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
