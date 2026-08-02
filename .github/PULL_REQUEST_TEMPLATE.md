## Scope

What changed, and which Phase plan item does it serve?

## Safety checklist

- [ ] No patient data field, eligibility decision or clinical recommendation was added.
- [ ] No official-looking rule or price was added without documented approved source and RA review.
- [ ] Demo records remain visibly `DEMO_DATA_ONLY` with the required warning.
- [ ] No secret is included.
- [ ] Date/version behavior fails closed and ambiguity has no automatic selection.

## Evidence

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm export:web`
- [ ] `pnpm worker:types`
- [ ] `pnpm worker:dry-run`

State any blocked platform checks and why.

## Commit-level merge gate

- Exact head commit SHA: `<!-- paste SHA -->`
- Dispatched scope and acceptance criteria (set by Claude Fable 5 at dispatch): <!-- summary or link -->
- [ ] Codex GPT-5.6 Sol (xhigh reasoning) completed the build for this SHA within the dispatched scope.
- [ ] Claude Fable 5 independently accepted this exact SHA as **PASS** against the dispatched acceptance criteria; the builder did not self-accept, and the acceptor is not the builder of this SHA.
- [ ] All required GitHub CI checks succeeded for this exact SHA: typecheck, test, Expo Web export, Worker types, and Worker dry-run.
- [ ] This head SHA has not changed since acceptance and CI completed.
- [ ] Gate result is **PASS**. **FAIL** or **BLOCKED** means this PR must not merge.

Only a PASS for the exact head SHA, with all required CI successful, may be merged to `main`. A new commit, amend, rebase, or any other head SHA change invalidates earlier acceptance and requires fresh acceptance and CI. If a head SHA was built by Claude Fable 5 itself, acceptance for that SHA must come from the user or another designated independent acceptor. After an authorized agent submits and merges a passing PR, report the resulting merge commit SHA.
