# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A lookup tool for Taiwan NHI lipid-lowering drugs, for clinicians. It answers four questions:

1. Which drugs were affected by the 2026-09-01 coverage-rule announcement, and which were not?
2. What is the price for each, affected or not?
3. What changed between the old 2.6.1–2.6.3 coverage rules and the new ones?
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
| `nhi-lipid-rules-prior-2026-09-01-r1` | The same three sections as in force before 2026-09-01, one text each |

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

## Comparing rule versions

`compareRuleSectionVersions(section)` returns both texts, a summary of quantitative terms that
appear in only one version, and `diff` — a token-level side-by-side comparison built by
`diffRuleSectionText`.

The diff is a **derived view, not official text**. It aligns the two versions with a
longest-common-subsequence over tokens, which is deterministic; what it does not do is claim that a
paired row means the regulator rewrote the left into the right. The UI says so, because that
misreading is the real risk — not the algorithm.

Three decisions in `rule-diff.ts` were measured against the real sections, and undoing any of them
makes the output wrong rather than merely uglier:

1. **Line breaks are dropped before comparison.** They are layout artifacts in both sources — the
   prior text wraps at the PDF's column width, the current text at its transcription unit
   boundaries. Segmenting on them produced one useless 49-vs-593 hunk for 2.6.1.
2. **Latin runs stay whole as tokens.** Character-level comparison split `statins` into `s` +
   `tatins` and reported the tail as unchanged.
3. **Equal runs shorter than `MIN_EQUAL_RUN` fold into the surrounding change.** Otherwise a single
   「合」 or 「表」 shared by two unrelated sentences is reported as unchanged, which reads as a claim
   that the sentence survived. 2.6.1 goes from 150 shredded hunks to 20.

Case and full/half-width punctuation fold for matching, but both columns are always rendered, so a
row marked unchanged still shows `Statins` beside `statins`. The only display transform is a line
break after each full stop; a wholesale replacement otherwise arrives as one unbroken paragraph.

The prior text comes from the three official PDFs via `pdftotext -layout -enc UTF-8`, with the
trailing page-number line and trailing blank lines dropped; each record carries the source PDF's
SHA-256, which matches `docs/source-register/rule-2.6.*-prior-version-full-text.md`. A Markdown
rendering of those rules was also supplied but is **not** verbatim — it adds words (2.6.2 gains
「限用於」), moves amendment markers across sentence boundaries, and carries an editorial note
asserting what changed. It is not a source; use the PDFs.
