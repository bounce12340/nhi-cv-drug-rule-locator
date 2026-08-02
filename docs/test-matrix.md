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
| Synthetic raw-byte integrity | Declared SHA-256 is calculated against original bytes and a mismatch is rejected | `packages/source-intake/src/index.test.ts` |
| Synthetic provenance | Missing or malformed synthetic source/retrieval provenance fails closed | `packages/source-intake/src/index.test.ts` |
| Synthetic authority registry | The default registry is empty; only an explicitly injected synthetic authority can proceed | `packages/source-intake/src/index.test.ts` |
| Synthetic RA state | Missing approval remains pending and an explicit rejection is rejected | `packages/source-intake/src/index.test.ts` |
| Synthetic quarantine | Every outcome is quarantined, non-publishable and contains no released payload or content | `packages/source-intake/src/index.test.ts` |
| Synthetic fixture safety | Fixtures exclude real drug-code, price, patient and official-authority identifiers | `packages/source-intake/src/index.test.ts` |
| Official schema and provenance | Schema v2 accepts only `OFFICIAL_CANDIDATE`; every Stage 1 provenance field is required and all three official source channels are covered | `packages/source-intake/src/official.test.ts` |
| Official authority isolation | The official registry defaults empty, requires explicit injection, and rejects cross-classification authorities and manifests in both directions | `packages/source-intake/src/official.test.ts` |
| Official RA approval wording | Approval is exact-match bound to dataset version and SHA-256 prefix; wrong version, digest, format, or missing wording remains pending | `packages/source-intake/src/official.test.ts` |
| Official quarantine and governed-storage eligibility | Every outcome remains quarantined and non-releasable; only verified evidence with exact approval wording is governed-storage eligible | `packages/source-intake/src/official.test.ts` |
| Official negative and fixture safety | Hash mismatch, provenance gaps, unknown authority, RA rejection, malformed inputs, and prohibited fixture patterns fail closed | `packages/source-intake/src/official.test.ts` |
| Type integrity | All packages typecheck after generated Worker types | `pnpm typecheck` |
| Web artifact | Expo static web export completes | `pnpm export:web` |
| Worker config | Generated types are current and deploy plan passes dry-run | `pnpm worker:types`, `pnpm worker:dry-run` |
| Governed storage schema | Every `storage-manifest/v1` field and nested field is required, typed, normalized to frozen null-prototype records, and malformed input fails closed | `packages/source-intake/src/storage.test.ts` |
| Governed storage approval | Approval wording exactly binds the dataset version and deterministic seven-character dataset-digest prefix; revoked or invalid manifests are ineligible | `packages/source-intake/src/storage.test.ts` |
| Governed storage integrity | Dataset digests are filename-order deterministic and each stored file must match both its SHA-256 and byte length | `packages/source-intake/src/storage.test.ts` |
| Governed storage path and isolation | Dataset directories reject traversal, and domain, contracts, API, and clinician package manifests cannot depend on `@nhi-cv/source-intake` | `packages/source-intake/src/storage.test.ts` |
| Governed storage fixture safety | Storage fixtures are visibly fictional and exclude prohibited identifier shapes | `packages/source-intake/src/storage.test.ts` |
| Governed repository storage | Every checked-in manifest, dataset directory, declared file hash and byte length, directory allowlist, and revoked eligibility state is verified; empty stores pass explicitly, while hash mismatches and extra files fail | `packages/source-intake/src/governed-store.test.ts` |

iOS and Android simulator/device tests are not in this matrix because the local prerequisites are unavailable; see the build report.
