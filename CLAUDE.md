# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A lookup tool for Taiwan NHI lipid-lowering drugs, for clinicians. It answers four questions:

1. Which drugs were affected by the 2026-09-01 coverage-rule announcement, and which were not?
2. What is the price for each, affected or not?
3. What changed between the old 2.6.1–2.6.3 coverage rules and the new ones? *(not built yet — see "Open work")*
4. All prices come from NHI's own published data, never invented.

It is a **static site**. No server, no API, no database, no accounts, no patient data. Everything runs
in the browser from data compiled into the bundle. It deploys to Cloudflare Pages and nothing else.

## Commands

pnpm workspace, Node >= 22, ESM throughout.

```bash
pnpm install
pnpm typecheck                      # tsc across both workspace projects
pnpm test                           # vitest
pnpm test:watch
pnpm export:web                     # vite build → apps/clinician/dist
pnpm --filter @nhi-cv/clinician dev # local dev server
```

CI runs typecheck, test, build. Deploy runs on merge to `main` and pushes `dist` to Cloudflare Pages.

## Layout

Two workspace projects. No build step for the library: `@nhi-cv/domain` exports TypeScript source
directly (`"exports": { ".": "./src/index.ts" }`), and Vite compiles it as part of the app.

- `packages/domain` — all lookup logic and the compiled datasets. Pure functions, frozen data, no I/O.
- `apps/clinician` — the UI. One screen, two tabs (drug lookup, verbatim rule lookup). Imports
  `@nhi-cv/domain` directly and makes no network calls at all.
- `scripts/*-codegen.mjs` — regenerate `packages/domain/src/generated/*` from `data/governed/*`.
  Run these when NHI publishes new data; never hand-edit the generated files.

The UI is written against React Native primitives (`View`, `Text`, `Pressable`, `StyleSheet`) which
Vite aliases to `react-native-web`. `apps/clinician/src/react-native-web.d.ts` supplies the types,
since react-native-web ships none. This is a leftover from the app's Expo origins — porting the JSX
to plain DOM elements would let `react-native-web` be dropped entirely.

## Datasets

Three, compiled into `packages/domain/src/generated/`. They are transcriptions of official NHI
publications, and `data/governed/` holds the sources they were generated from.

| Dataset | Contents |
| --- | --- |
| `nhi-drug-items-2026-08-07-r2` | Item master: 607 records, 4,048 price periods |
| `nhi-lipid-2026-09-01-r1` | The 2026-09-01 announcement: 187 changed items, before/after prices |
| `nhi-lipid-rules-structured-2026-09-01-r1` | Rules 2.6.1–2.6.3 as 67 verbatim units |

`docs/source-register/` records where each source came from and its SHA-256. That is what backs the
claim that prices are real rather than invented — keep it accurate if datasets change.

A note on prices: 370 of the 607 master records currently show `0.00`. In every case that is the
final, open-ended price period following a real earlier price — the master is a full historical item
file, not a list of currently-reimbursed items.

## Rules that protect correctness

These exist because breaking them shows a clinician wrong drug information. They are not process.

1. **Codes match exactly.** Normalize NFKC → trim → uppercase → strip spaces/hyphens, check
   `^[A-Z0-9]{10}$`, then exact-match only. A code one character off returns
   `NOT_IN_VALIDATED_DATASET` — never a correction, never a suggestion. Note the second character may
   be a digit; narrowing the pattern to letters-then-digits silently drops legitimate codes.
2. **Never auto-select among multiple matches.** Return `MULTIPLE_MATCHES` with every candidate.
3. **Fail closed.** An invalid date, an out-of-range date, or an unknown dataset version returns
   `NOT_IN_VALIDATED_DATASET`. Never substitute the nearest or latest data.
4. **Never pair a drug name with a code by position.** Rule 2.6.1's verbatim text contains a table
   that was flattened into one column, so names wrap after their codes. Reconstructing that pairing
   from row order was measured at 100/108 correct — 8 wrong, including rows where one drug's name
   absorbed a different drug's code. `identifyRuleDrugMasterRecords` therefore returns only
   `{ nhiCode, masterItem }`; look names up in the master, never read them out of the rule text.
5. **Official transcribed text is never edited.** Not reformatted, not summarized, not "corrected"
   against the master, and never excerpted in a collapsed header — a truncation point chosen by the
   tool can misrepresent the rule. Collapsing it behind a disclosure control is fine; altering it is not.
6. **No patient data anywhere** — not in the UI, code, tests, or docs. The tool takes a drug query
   and nothing else, and says so on screen.

When changing lookup behavior, add the negative test alongside it (no auto-correct, no auto-select,
fails closed). That is how these stay true.

## Open work

Requirement 3 — diffing old rules against new — is not built. The old 2.6.1–2.6.3 PDFs are recorded
in `docs/source-register/rule-2.6.*-prior-version-full-text.md` with their hashes, but only as
provenance; no dataset was generated from them, and the rules engine currently holds one version
only. The Markdown of those rules supplied earlier is **not** verbatim (it adds words, alters
punctuation, and carries editorial comments), so a diff built on it would report transcription noise
as rule changes. Transcribing from the PDFs is the prerequisite.
