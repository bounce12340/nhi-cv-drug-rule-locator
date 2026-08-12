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

The UI is plain DOM and plain CSS. It used to be written against React Native primitives aliased to
`react-native-web`, a leftover from the app's Expo origins; that dependency, its type shim and the
Vite alias are gone, which is what makes the current layout (CSS grid, sticky column, `<details>`
disclosures, real media queries) expressible at all. The bundle lost 109 KB with it.

Inside `apps/clinician`:

- `App.tsx` — layout only. It contains **no prose**: every string comes from the dictionary, and a
  test fails on any Chinese string literal that appears in the file.
- `src/copy.ts` — the zh/en dictionary, one entry per message.
- `src/app.css` — the whole stylesheet. Colours are custom properties on `:root`, swapped by
  `[data-theme]`; no component names a colour. The themed wrapper sets `color` and `background`
  itself, because `body` sits outside it and its children would otherwise inherit an
  already-resolved light value — that bug rendered dark mode near-black on near-black.
- `src/*.ts` — pure helpers (`as-of-date`, `drug-item-ui`, `rule-text-tree`, `ui-preferences`,
  `drug-review-presentation`). No JSX, so they are testable directly.

### Testing the UI

App tests render with `renderToStaticMarkup` and assert on the markup. There is no jsdom and no
testing library — `react-dom/server` needs neither, so this costs no dependency. Components the
tests render in isolation are exported from `App.tsx` and wrapped in the exported `UiProvider`.

They replaced 153 assertions that grepped `App.tsx`'s **source text** for strings like
`type="date"`. That regime had the failure mode backwards: a purely visual change broke 40 of them,
while the real defect they should have caught — the same official-warning paragraph rendered inside
every result card, 55 copies and 59 warning lines on one screen — passed all 153. Assert on what the
screen renders, not on how the file is written.

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
file, not a list of currently-reimbursed items. **Drug lookups leave those rows out** and report how
many were excluded, so an exact code that returns nothing says why rather than looking like a typo.
The exclusion is per requested date, so an item priced 0.00 today still resolves for a date when it
had a price. A price that does not parse as a number is kept, not treated as zero — the master holds
11 periods whose price is literally `-`.

Rule-text code identification deliberately uses the **complete** master, zero-priced rows included.
Rule 2.6.1 cites one code that is now priced 0.00; resolving it there is meaningful, and reporting
「主檔查無此代碼」 for a code the master does hold would be a lie.

## Doses

A clinician treats each strength as its own group, so drug results carry a dose filter. The
strengths are derived, because the master cannot supply them directly: `specificationAmount` and
`specificationUnit` are **empty on 595 of the 607 records**, and the 12 that are populated hold pack
sizes, not strengths.

`packages/domain/src/drug-dose.ts` reads them from two fields and unions the results:

| Field | Example | What it states |
| --- | --- | --- |
| `ingredient` | `ATORVASTATIN (CALCIUM) 10 MG` | structured, present on every record |
| `drugNameEn` | `Atotin F.C. Tablets 10mg` | the label strength |

Measured: 524 records state a dose in both, 83 in the ingredient only, 0 in the name only —
**607/607 yield at least one**, so nothing is guessed. The union is what makes it correct on the 21
records where the two fields disagree, all of which are salt forms or compounds:

- `FLUVASTATIN SODIUM 21.06 MG` / `LESCOL CAPSULES 20MG` — only the name has the 20 mg a clinician types
- `EZETIMIBE 10 MG+SIMVASTATIN 20 MG` / `Agitin Tablets 10/20mg` — only the ingredient has ezetimibe's 10 mg

Taking either field alone drops one of those. Three things this must keep doing:

1. **Never reconcile a salt weight into a label strength.** 10.85 mg and 10 mg are both offered for
   Caduet, because the master states both. Rounding one into the other invents a number.
2. **Keep a concentration's denominator.** `CHOLESTYRAMINE 444.4 MG/GM` becomes `444.4 mg/g`, never
   `444.4 mg` — it is a powder, not a 444.4 mg tablet, and a 444.4 mg filter must not reach it.
3. **Units are part of the filter key**, so `4 g` never matches `4 mg`.

Options offered on screen are computed from the records currently displayed, so no option can return
nothing. A record whose strength cannot be read falls into a `DRUG_DOSE_UNSPECIFIED_KEY` bucket
rather than out of every filter; no record is in it today, and a test asserts that by measurement so
a later snapshot cannot quietly strand one.

## Dates

Official texts use ROC years: **民國 115 = 2026** (ROC + 1911). So 115/9/1 is 2026-09-01, 94/6/1 is
2005-06-01, 108/2/1 is 2019-02-01. The prior-rules dataset stores both the ROC strings as published
and the converted `lastRevisionEffectiveFrom`.

The drug tab's as-of date defaults to **today**, via `todayIso()` in
`apps/clinician/src/as-of-date.ts`. It formats from local calendar components, never
`toISOString()` — Taiwan is UTC+8, so between local midnight and 08:00 the UTC date is still
yesterday and the clinician would silently get the previous day's prices, mornings only.

The rule tab stays on `RULE_TEXT_EFFECTIVE_FROM` (2026-09-01) and must not default to today: the
rules engine returns `NOT_IN_VALIDATED_DATASET` for any earlier date, so every rule query would fail
until that date passes.

The master is a 2026-08-06 snapshot and does not yet carry the prices the 2026-09-01 announcement
introduces. Choosing a date on or after the effective date therefore still shows the snapshot price;
`shouldShowMasterSnapshotNotice` surfaces that, and the new price stays where it actually is — the
announcement's before/after comparison.

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

### The drug listing 2.6.1 gained

One region is held out of the diff's **input**: the drug listing that begins at 「成分名稱／健保代碼／
藥品名稱」 inside unit `2.6.1-001`. That header appears exactly once across all 67 current units, and
in none of the prior sections.

It is excluded because the prior text has no listing at all, so it can only ever align as one
undifferentiated block. Measured: 2.6.1's current text is 8,045 characters of which the listing is
5,098, and it landed in a single diff row whose current cell was **5,080 characters, marked
`replaced`** — which reads as a claim that the regulator rewrote the old criteria table into a list
of products. It did not; the list is new.

Removing it **changes no alignment decision**. The diff still produces 14 rows with the same 7
unchanged / 7 replaced split; only that one cell shrinks, to 709 characters. `rule-comparison.test.ts`
asserts all of those numbers, so a future change to `rule-diff.ts` that made the exclusion start
moving rows would fail rather than quietly alter what the screen claims.

Nothing leaves the tool. Three things must stay true, and are tested:

- the unit's **verbatim text is unaltered** — all 5,266 characters are still rendered in the rule tree
- the excluded region carries **no duration and no lipid threshold**, so the term summary is complete
- all **116 codes** in it are still resolved against the master and listed above the comparison

`RuleSectionComparison.excludedDrugListings` reports the unit, the character count and the code count
so the screen can say what is missing and where to read it. Excluding a region silently would be the
actual violation; this is a labelled trim of a derived view.

The prior text comes from the three official PDFs via `pdftotext -layout -enc UTF-8`, with the
trailing page-number line and trailing blank lines dropped; each record carries the source PDF's
SHA-256, which matches `docs/source-register/rule-2.6.*-prior-version-full-text.md`. A Markdown
rendering of those rules was also supplied but is **not** verbatim — it adds words (2.6.2 gains
「限用於」), moves amendment markers across sentence boundaries, and carries an editorial note
asserting what changed. It is not a source; use the PDFs.
