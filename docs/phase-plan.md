# Phase plan

## Phase 0 — foundation (this repository state)

- pnpm workspace and shared TypeScript core.
- Expo client for Web/iOS/Android with an immediately focused search field.
- Worker-only API surface: `/health`, `/v1/meta`, `POST /v1/lookup`; no deployment.
- Obvious `DEMO_DATA_ONLY` invented records, deterministic lookup and audit-facing metadata.

## Phase 0.5 — synthetic intake preparation (implemented, synthetic-only)

- Isolated Node-only `@nhi-cv/source-intake` package and tests for a synthetic manifest, raw-byte SHA-256, provenance, injected test authority and RA review state.
- Every result remains in logical quarantine, including mechanically `VERIFIED` synthetic evidence; nothing may be published or used by downstream lookup.
- No database, API route, user interface, deployment, official-data parser or file persistence is introduced by this phase.

## Phase 1 — governed source intake (blocked)

Requires original Master Project Prompt v3.2, official source datasets, source ownership, update cadence, retention policy, and RA-approved interpretation procedure.

## Phase 2 — verified rules and pricing (blocked)

Requires a versioned import pipeline, source/hash/provenance record, effective dating, two-person review, exception handling, regression corpus and regulatory sign-off. Any output remains informational until approved for the intended use.

## Phase 3 — controlled release (blocked)

Requires privacy/security review, clinical UX review, accessibility test, production observability and approved release authority. Patient-level eligibility remains out of scope unless separately designed and approved.
