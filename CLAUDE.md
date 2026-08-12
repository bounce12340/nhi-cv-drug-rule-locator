# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A lookup tool for Taiwan NHI lipid-lowering drugs, for clinicians. It answers three questions:

1. Which drugs did the 2026-09-01 announcement reprice, and which did it not?
2. What is the price for each, on the date the clinician asks about?
3. All prices come from NHI's own published data, never invented.

It used to also carry the 2.6.1–2.6.3 verbatim coverage rules and a prior/current comparison of
them. That whole surface was removed in 2026-08 at the owner's request — the tab, the two rule
datasets, their codegens, `rule-text-lookup`, `rule-comparison`, `rule-diff` and
`rule-drug-identification`. Do not reintroduce any of it without being asked; the history is in git
if it is ever wanted back.

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
- `apps/clinician` — the UI. A single screen: query panel on the left, results on the right.
  Imports `@nhi-cv/domain` directly and makes no network calls at all.
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
- `src/*.ts` — pure helpers (`as-of-date`, `drug-item-ui`, `ui-preferences`,
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

Two, compiled into `packages/domain/src/generated/`. They are transcriptions of official NHI
publications, and `data/governed/` holds the sources they were generated from.

| Dataset | Contents |
| --- | --- |
| `nhi-drug-items-2026-08-07-r2` | Item master: 607 records, 4,048 price periods |
| `nhi-lipid-2026-09-01-r1` | The 2026-09-01 announcement: 187 changed items, before/after prices |

`docs/source-register/` records where each source came from and its SHA-256. That is what backs the
claim that prices are real rather than invented — keep it accurate if datasets change.

A note on prices: 370 of the 607 master records currently show `0.00`. In every case that is the
final, open-ended price period following a real earlier price — the master is a full historical item
file, not a list of currently-reimbursed items. **Drug lookups leave those rows out** and report how
many were excluded, so an exact code that returns nothing says why rather than looking like a typo.
The exclusion is per requested date, so an item priced 0.00 today still resolves for a date when it
had a price. A price that does not parse as a number is kept, not treated as zero — the master holds
11 periods whose price is literally `-`.

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

Official texts use ROC years: **民國 115 = 2026** (ROC + 1911). So 115/9/1 is 2026-09-01 — the date
the announcement takes effect, and the one the screen offers as a one-click preset.

The as-of date defaults to **today**, via `todayIso()` in
`apps/clinician/src/as-of-date.ts`. It formats from local calendar components, never
`toISOString()` — Taiwan is UTC+8, so between local midnight and 08:00 the UTC date is still
yesterday and the clinician would silently get the previous day's prices, mornings only.

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
4. **Official transcribed text is never edited.** The datasets' own warnings are rendered verbatim —
   not reformatted, not summarized, not excerpted. Collapsing them behind a disclosure is fine;
   altering them is not. They appear **once per screen**, never once per result card.
5. **No patient data anywhere** — not in the UI, code, tests, or docs. The tool takes a drug query
   and nothing else, and says so on screen.

When changing lookup behavior, add the negative test alongside it (no auto-correct, no auto-select,
fails closed). That is how these stay true.
