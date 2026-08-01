# Test matrix

| Area | Assertion | Automated evidence |
| --- | --- | --- |
| Code normalization | NFKC, trim, uppercase, spaces and hyphens normalize deterministically | `packages/domain/src/index.test.ts` |
| Near code | One changed character is never auto-corrected | `packages/domain/src/index.test.ts` |
| Ambiguity | Multiple candidates are returned without a selected default | `packages/domain/src/index.test.ts` |
| Dates/versions | Out-of-range date or unknown version fails closed | `packages/domain/src/index.test.ts` |
| Demo warning | Lookup and price status are explicitly demo-only | `packages/domain/src/index.test.ts` |
| API health | Health is structured and warns about demo data | `apps/api/src/index.test.ts` |
| API metadata | Dataset version/status can be read | `apps/api/src/index.test.ts` |
| API lookup | Exact lookup works and extra patient fields are rejected | `apps/api/src/index.test.ts` |
| Type integrity | All packages typecheck after generated Worker types | `pnpm typecheck` |
| Web artifact | Expo static web export completes | `pnpm export:web` |
| Worker config | Generated types are current and deploy plan passes dry-run | `pnpm worker:types`, `pnpm worker:dry-run` |

iOS and Android simulator/device tests are not in this matrix because the local prerequisites are unavailable; see the build report.
