# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A lookup tool for Taiwan NHI lipid-lowering drugs, for clinicians. Two tabs.

**Drug lookup** answers three questions:

1. Which drugs did the 2026-09-01 announcement reprice, and which did it not?
2. What is the price for each, on the date the clinician asks about?
3. All prices come from NHI's own published data, never invented.

**Risk tier** (added 2026-08) asks the announcement's own ASCVD criteria one at a time and reports
the tier they put a patient in, that tier's payment threshold and treatment targets, the
announcement's own prescribing rule, and the master items behind the drug classes that rule names.
It reaches no conclusion the announcement does not state, and picks no drug.

It used to also carry the 2.6.1–2.6.3 verbatim coverage rules and a prior/current comparison of
them. That whole surface was removed in 2026-08 at the owner's request — the tab, the two rule
datasets, their codegens, `rule-text-lookup`, `rule-comparison`, `rule-diff` and
`rule-drug-identification`.

**2.6.2 and 2.6.3 came back in 2026-08, asked for, and only half of them.** The risk tab now shows
the 建議修訂後給付規定 text for ezetimibe alone and for the combination products, because that is
where the announcement states statin intolerance and the three named lipid disorders — conditions
the tier table says nothing about. What did **not** come back is the comparison: 原給付規定 is not
transcribed, not compiled and not rendered, and 2.6.1 is not either (its content is 表一, already
here). Do not reintroduce the prior/current diff without being asked; the history is in git.

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
- `scripts/risk-transcribe.mjs` — re-derives the risk dataset's three JSONL files from the
  announcement PDF. A one-off tool, not part of CI: it needs poppler's `pdftotext`, which nothing
  else here does. Committed so the transcription is reproducible and diffable rather than typed.

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

### Result paging

Result cards are built **30 at a time**, with a button for the next 30. Measured on the built
bundle: for `statin` the domain lookup over all 607 records takes ~6 ms while rendering its 179
cards takes ~506 ms — the cost is React building cards, not finding them. Paging took that to
**104 ms**. Nothing else moved it: lazily rendering the collapsed price history dropped 69% of the
DOM and changed the time by less than the run-to-run noise, so that idea was measured and dropped
rather than shipped.

The stat tile above the list keeps reporting the **true** match count, never the number rendered.
Dose facets are likewise computed from the whole filtered set, so paging can never hide a filter
option. Paging resets whenever the query, date or either filter changes, by comparing a derived key
during render rather than by remembering to reset it in each handler.

### What the screen owes a reader who cannot see it

The interaction is: type, press a button, and results appear in the other column.
Nothing about that is announced on its own, so each results column carries one
polite `role="status"` region stating the outcome — the match counts for a drug
lookup, the tier or the number of questions still open for a risk assessment. It
carries the counts rather than a bare "done", because the count is the answer.
Silence after pressing the button is the failure these prevent.

The rest is structural and pinned by `render.test.tsx`: every `<input>` has an id
and a `<label for>` pointing at it (`Field` takes a render prop and hands down a
`useId`, because a field's children also hold preset chips and hints and a
wrapping label would make clicking those focus the input); the page has a `<main>`
landmark and a skip link ahead of the header, off screen until focused — on
`:focus`, not `:focus-visible`, so it also appears for focus moved by script or
assistive technology. Switching the interface language sets
`document.documentElement.lang` and `document.title` from the dictionary, or a
screen reader reads English content in a Chinese voice.

### The date the master cannot answer for

The item master's final price period is open-ended — it runs to `9999-12-31` — so
a lookup for 2030 returns a price rather than nothing. That price is the last one
the snapshot recorded, not a statement about 2030. `isAfterMasterSnapshot` asks
whether the requested date is past `2026-08-06`, and the results column says so
once per screen. Narrowing `DRUG_ITEMS_DATASET_EFFECTIVE_TO` instead would make
the lookup fail closed on today's date, and today's price is exactly what the
snapshot does know.

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
| `nhi-lipid-2026-09-01-r1` | The 2026-09-01 announcement: 187 items, 57 of them with before/after prices |
| `nhi-lipid-risk-2026-09-01-r1` | Attachment 2: 6 tiers, 18 criteria, 11 factors, 6 notes, 2 coverage rules |

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

Options offered on screen are computed from every record the current filters match — not from the
page of cards on screen, which is capped — so no option can return nothing. A record whose strength cannot be read falls into a `DRUG_DOSE_UNSPECIFIED_KEY` bucket
rather than out of every filter; no record is in it today, and a test asserts that by measurement so
a later snapshot cannot quietly strand one.

## The one query box

`packages/domain/src/drug-query.ts` reads a single typed line into the controls the
screen already has — a name search, a dose, a repriced/not-repriced filter and an
as-of date. `atorvastatin 40mg 這次調價的` sets all four in one action.

It resolves nothing about a patient and reaches no conclusion. It only decides which
existing control a typed word was meant for. Three properties keep it honest:

1. **Nothing is dropped.** Every character ends in a recognized facet or in the text
   handed to the name search. A word the parser does not understand is searched for.
2. **Nothing is hidden.** Each facet carries the exact substring it came from, and
   `SmartQueryReadout` prints it back. The chips below are the same controls, so the
   clinician can override any reading.
3. **Ambiguity resolves toward the drug.** `10/20mg` is a compound strength, not the
   twentieth of October — the month/day pattern refuses a match followed by a unit.

Filler words (`請`, `幫我`, `查`, `的`…) are removed as `ignored` facets and shown as
set aside. That list exists because every remaining word has to be found: lifting
`這次調價` out of `atorvastatin 40mg 這次調價的` left `的` behind, and the search then
returned nothing. Each word on the list was checked against all 607 records first and
appears in none of them. **和 is deliberately not on it** — it appears in 8 records,
all of the manufacturer 正和.

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

## Risk stratification

`packages/domain/src/risk-stratification.ts` turns answers into a tier. One rule governs the file:
**an unanswered question is unknown, not no.** Reading a blank as "no" under-rates the patient and
hands back a tier with a higher payment threshold than they qualify for, so every predicate is
three-valued and `stratifyRisk` returns either a tier with the criterion it matched or an explicit
list of what is still missing. It is the same stance as the drug lookup's "found nothing".

Four things it must keep doing:

1. **A prerequisite is not decoration.** 極高風險 and 非常高風險 are "prerequisite AND one of the
   alternatives". `一年內曾經歷心肌梗塞` alone does not qualify without 冠狀動脈疾病. 高風險's four
   entries genuinely are flat.
2. **Precedence is the announcement's own numbering**, and a lower tier cannot settle the question
   while a higher one is open — 糖尿病 with 極高風險 unanswered is undetermined across three tiers,
   not 高風險.
3. **LDL-C≧190mg/dL is a criterion, not just a threshold**, and is read off the entered number so a
   typed value and a ticked box cannot disagree. Consequence, and correct: with LDL-C blank, 高風險
   cannot be ruled out, so no factor-count tier is ever named.
4. **代謝性症候群 counts three of five** and contributes one factor, not three.
5. **One clinical fact is one question.** The announcement states 冠狀動脈疾病 twice — as
   極高風險 (一)'s prerequisite and again as an alternative under (二) — so answering either
   answers both, and the screen never asks it a second time. Before that, a patient marked as not
   having it could still be handed 極高風險 by ticking it the second time. The pairing is exact
   string equality once the source's trailing `。` is dropped, never a similarity judgement; two
   answers that disagree make the fact **unknown** rather than letting one win.

### What the tier table does not say

表一 gives a tier its threshold, its targets and its prescribing rule. Three things a clinician
needs are printed elsewhere in the same attachment, and all three are now carried.

`packages/domain/src/assessment-advice.ts` holds the ●各風險等級評估建議 items and the standalone
non-HDL-C note. The advice reaches a tier because the heading **names** it — `極高風險、非常高風險：`
split on 、 and matched to `labelZh` by exact string equality — never because of where the group sits.
That is what keeps the 24-hour blood draw in front of 極高風險 and away from 高風險, and it is why
`no-factors`, which neither heading names, gets `null` and a screen that says so. The non-HDL-C note
names no tier at all, so `appliesToTierIds` is `null` and it is shown verbatim beside the secondary
target rather than filtered or paraphrased into a condition the tool would then be asserting.

`packages/domain/src/coverage-rule.ts` holds 2.6.2 and 2.6.3. Two properties matter:

1. **2.6.3 gets no connective it did not write.** 2.6.2 restricts ezetimibe to three named disorders
   and then asks for 下列條件之一; 2.6.3 numbers three requirements with no such wording. Its
   `restrictionRaw` is `null` and the screen prints nothing in its place — an "any one of" would turn
   three requirements into three alternatives.
2. **The 健保代碼 tables are read for codes only.** The names beside them are already in the master,
   and a second spelling could drift. The 14 codes are cross-checked against the two exception CSVs
   in `nhi-lipid-2026-09-01-r1`, transcribed independently and earlier; `coverage-rule.test.ts`
   re-runs that comparison every CI run.

The transcription decisions are in
`data/governed/nhi-lipid-risk-2026-09-01-r1/TRANSCRIPTION.md` — read it before touching the JSONL.
The load-bearing ones: prescription rules are paired to tiers by the heading the source text carries
(the 處方規定 column does not line up with the tier rows beside it), rejoining hard-wrapped lines may
add spaces but never change a character, the 0-factor row's missing secondary target and missing
prescribing rule are recorded as `null` rather than borrowed from the row above, and the two-column
sections are split **geometrically** (`pdftotext -x 0 -W`) rather than by character index — `-layout`
pads to visual width while JavaScript indexes code points, and CJK is double width, so no fixed
offset separates the columns. Each crop is proved by moving it 4pt either way and getting identical
text.

One place the space-restoring join is wrong is named rather than papered over. 表一 prints
`經起始治療 6~8 週後`; everywhere else the document prints `單一治療3個月未達` with no spaces. 2.6.3
wraps after `6-8` so the rule would produce `6-8 週`, while 2.6.2 wraps the same sentence one
character earlier and the hyphen rule already produces `6-8週`. `WRAP_NO_SPACE` names that one
boundary and the build fails if the entry stops matching. The whitespace-stripped identity assertion
cannot catch this class of error — it strips exactly the character in dispute.

`packages/domain/src/drug-class.ts` groups master items by the class a rule names. Measured, and
these numbers belong in tests rather than in prose that can drift: **396** records name a statin,
**27** name ezetimibe, **19** name both, **203** name neither. All 396 STATIN hits are the seven real
statins, so nothing like nystatin is swept in. The rules also name PCSK9 monoclonals, siRNA and ATP
citrate lyase inhibitors — the master holds **zero** of those, so any listing is partial and the
screen says so. The tool never maps an item onto 中至高強度: the rule states an intensity, the master
records none, and inventing that mapping would be the tool prescribing.

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
5. **No identifying patient data anywhere** — no names, no record numbers, no free text — in the
   UI, code, tests, or docs. The risk tab does take clinical values (an LDL-C number, yes/no answers
   to the announcement's criteria), so the older blanket "takes no patient data" no longer holds.
   What replaced it has to stay true: values live in React state only, are never written to
   `localStorage` and never leave the tab, and the screen says exactly that. `authored-copy.test.ts`
   pins the wording.

When changing lookup behavior, add the negative test alongside it (no auto-correct, no auto-select,
fails closed). That is how these stay true.
