# ADR-001: Model routing — builder and independent acceptance

- Status: **Accepted** (2026-08-02)
- Deciders: project owner (requester, and designated RA per RDL-009)
- Source requirements: Master Project Prompt v3.2 §21.5, §21.5.5, §23 (received 2026-08-02; receipt recorded in docs/spec-source-status.md)

## Context

v3.2 assigns implementation work to a "Terra Pro"-tier model and independent acceptance to a "Sol Pro"-tier model. Neither tier name is a concrete, verifiable model identity in this environment, and §21.5.5 forbids silent substitution: any concrete mapping requires the requester's explicit recorded consent, otherwise the affected work is BLOCKED (this was RDL-008).

## Decision

With the requester's explicit consent recorded on 2026-08-02 (in-session structured answer to a direct question), the tiers map as follows:

| v3.2 tier | Role | Concrete model | Where pinned |
| --- | --- | --- | --- |
| Terra Pro | Implementation builder | Codex GPT-5.6 Sol, reasoning effort xhigh (`gpt-5.6-sol`) | `.codex/config.toml` |
| Sol Pro | Independent acceptance | Claude Fable 5 | CONTRIBUTING.md merge governance |

Claude Fable 5 additionally dispatches work and sets acceptance criteria at dispatch time, which v3.2 assigns to the main model. The tier names are roles from the received prompt; the "Sol" substring appearing in the builder's product name has no bearing on the tier mapping above.

## Invariants preserved

- The acceptor must never be the builder of the head SHA under review. A SHA authored by Claude Fable 5 itself (for example dispatcher-authored governance records) cannot be accepted by Claude Fable 5; acceptance falls to the user or another designated independent acceptor (CONTRIBUTING.md).
- The builder never self-approves. Acceptance binds to an exact head commit SHA and is invalidated by any new commit, amend or rebase.
- If either mapped model is unavailable, the affected work is BLOCKED — no silent substitution (v3.2 §21.5.5). Replacing a mapped model requires new explicit requester consent and an update to this ADR.
- The acceptance side must not modify the code under review within the same acceptance procedure; doing so voids the acceptance and returns the change to the builder flow (v3.2 §21.5.3).

## Attestation requirements

Per v3.2 §21.5.4, every build and every acceptance must be traceable by: role, required tier, provider, model display name, exact model identifier/version, run identifier, task-contract reference, repository, branch, commit SHA, start/end time, tool permissions and result. A display name alone is insufficient.

Recording locations for this repository:

- PR descriptions carry the human-readable summary (role, model display name, head SHA, evidence, gate result).
- The builder's exact identifier is pinned in `.codex/config.toml` (`gpt-5.6-sol`, `xhigh`).
- Acceptance-side exact identifiers and run identifiers are preserved in the session execution records linked from each PR (the session URL footer), which the RA can audit; CI check runs bind results to the exact SHA.

## Consequences

- RDL-008 is resolved; build tasks may be dispatched to the builder under the dispatched-scope process.
- Resolution of RDL-008 does not loosen RDL-005: official rules, prices and production release remain blocked until the RA approves governed intake and the missing sources are supplied (docs/phase1-readiness.md).
- v3.2 §30 planning artifacts are authored by the main model per §30 and, like any SHA, require non-builder acceptance.
