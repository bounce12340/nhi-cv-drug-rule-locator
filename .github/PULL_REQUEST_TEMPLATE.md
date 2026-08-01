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
