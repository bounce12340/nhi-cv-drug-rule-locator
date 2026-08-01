# Phase 0 build report

**Completed:** 2026-08-01T08:47:45+08:00  
**Fail-closed coverage update:** 2026-08-01T09:03:55+08:00  
**Scope:** Local-only Phase 0 build. No GitHub write, Cloudflare deployment, production data import, or patient-data workflow was performed.

## Delivered

- pnpm workspace with a shared pure TypeScript domain core and API transport contracts.
- Expo SDK 57 clinician application for Web/iOS/Android, using one search-first screen and no patient/clinical input fields.
- Cloudflare Worker configured through `wrangler.jsonc` with the approved compatibility date/flag and only `/health`, `/v1/meta`, and `POST /v1/lookup`.
- Deterministic code/name lookup safeguards, explicit traceability metadata, a finite 2026-08-01–2026-08-31 demo coverage window, `DEMO_DATA_ONLY` invented records, and the mandatory Chinese warning in UI/API/results.
- Project governance, privacy inventory, threat model, source-status disclosure, contribution/security guidance, PR and issue templates.

## Verification evidence

| Requirement | Command | Actual final output |
| --- | --- | --- |
| Dependency installation and lockfile | `pnpm install` | `Done in 3.6s using pnpm v10.30.1` |
| TypeScript | `pnpm typecheck` | `packages/contracts ... Done`; `packages/domain ... Done`; `apps/clinician ... Done`; `apps/api ... Done` |
| Unit tests | `pnpm test` | `Test Files 2 passed (2)`; `Tests 11 passed (11)` |
| Far-future fail-closed regression | `pnpm exec vitest run packages/domain/src/index.test.ts -t "fails closed beyond the finite demo dataset coverage" --reporter=verbose` | `1 passed (1)`; the test asserts `2099-12-31` returns `NOT_IN_VALIDATED_DATASET`, manual review, coverage warning, and no candidates/price |
| Expo dependency alignment | `pnpm --filter @nhi-cv/clinician exec expo install --check` | `Dependencies are up to date` (offline local dependency-map validation) |
| Web production export | `pnpm export:web` | `Exported: dist` |
| Worker types | `pnpm worker:types` | `Types at worker-configuration.d.ts are up to date.` |
| Worker no-deploy validation | `pnpm worker:dry-run` | `--dry-run: exiting now.` |

The eleven tests cover code normalization, near-code non-correction, name-detail preservation, multiple-candidate non-selection, date/version fail-closed behavior including the finite coverage boundary and `2099-12-31`, demo warning/status, API health, metadata, and lookup/extra-field rejection.

## Environment limitations

- `xcodebuild -version` reports that the active developer directory is CommandLineTools and requires full Xcode. iOS simulator/device startup is **BLOCKED**.
- `adb` is not found. Android emulator/device startup is **BLOCKED**.
- The original Master Project Prompt v3.2 export and official/RA-approved rule and price sources are absent; formal import and production release are **BLOCKED**.

## Notes

- The initial restricted-network install and restricted Wrangler run could not access the package registry/local Wrangler runtime facilities. Both passed after explicitly approved, scoped execution; no external deployment occurred.
- Expo's dependency checker was able to use its local SDK 57 dependency map but reported that full online validation was unavailable. It still reported the installed packages as up to date.
- Generated `apps/api/worker-configuration.d.ts` is intentionally ignored and produced only by `wrangler types`; it is not hand-maintained.
