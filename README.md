# NHI lipid-lowering drug lookup

> **中文:** [README.zh-TW.md](README.zh-TW.md) ｜ This is the English version.

A chairside lookup tool for Taiwan's National Health Insurance (健保) lipid-lowering
drugs, for clinicians. Live at <https://nhi.uic-ai.com/>.

It is a static site on Cloudflare Pages. No server, no API, no database, no accounts.
Every dataset is compiled into the bundle and all of it runs in the browser — what you
type goes nowhere and is not recorded. The interface is bilingual (Chinese/English) with
light and dark themes, and has two tabs: **drug lookup** and **risk tier**. Desktop puts
the query on the left and results on the right; phones collapse to one column.

The disclaimer and the data-source notice appear **once per screen** — one at the top, one
in a disclosure at the foot of the results — never reprinted on every result card.

## Drug lookup: three questions

**1. Which drugs did the 2026-09-01 announcement reprice, and which did it not?**

Of the 607 items in the master file, that announcement repriced **57**; the other **550**
were not repriced. Results filter by 全部 / 本次調價 / 本次未調價 (all / repriced /
not repriced).

**2. What is each item's price?**

Repriced items show the announcement's own **原支付價 → 初核價格** (price before → price
after) comparison. Every item can expand its full price history — 4,048 price periods
across the master file.

The lookup date **defaults to today** and can be set to any date with a picker, plus
one-tap presets for today and for the announcement's effective date (2026-09-01). The
price shown is the one for the period covering that date. It **does not fall back** to the
nearest period: an invalid or out-of-range date returns nothing rather than a guess.

**One typed line can set every control**: `atorvastatin 40mg 這次調價的`,
`pravastatin 20mg 未調價`, `rosuvastatin 10mg 115/9/1` all work. Dose, the repriced
filter and the date are routed to the controls that already exist, and the screen prints
back **what it read and the exact substring it read it from**, so you can check it; the
chips below override any reading. A word the parser does not recognise is searched for as
a name or ingredient rather than dropped. Filler words (請, 幫我, 的) are marked as set
aside, visibly.

Results can be **filtered by strength** — each strength is its own prescribing group, so
searching atorvastatin gives you the item counts for 5 / 10 / 20 / 40 mg separately. The
options are computed from the current result set, so no option can return nothing. See
below for where strengths come from.

Note: the master file is a 2026-08-06 snapshot and **does not yet carry the prices that
took effect on 9/1**. Choosing a date on or after then still shows the snapshot's price;
the screen says so, and the new price is where it actually lives — in the announcement's
before/after comparison.

**3. The prices are the NHIA's data, not invented.**

See [Data sources](#data-sources). Every source file's provenance and SHA-256 is recorded.

## Risk tier: the announcement's own criteria, and it says so when it cannot decide

The second tab puts 表一 (Table 1) of the 2026-09-01 announcement's attachment 2 on
screen and asks its criteria one at a time. The clinician answers; the tool reports the
ASCVD risk tier, that tier's **payment threshold**, **primary and secondary treatment
targets**, the **announcement's own prescribing rule** verbatim, and the master items
behind the drug classes that rule names.

Three things the same attachment states outside 表一 are carried too, verbatim: that
tier's **assessment advice** (including completing the lipid panel within 24 hours of an
acute patient's admission), **when non-HDL-C may serve as the secondary target**, and the
revised **coverage rules 2.6.2 / 2.6.3 for ezetimibe** — statin intolerance, three named
lipid disorders, and the 14 items the rules' own tables single out as needing three
months of monotherapy rather than six to eight weeks. Only the 建議修訂後給付規定
(post-revision) column is transcribed; the prior/current comparison is not rebuilt.

Questions and options are **the announcement's own text**, group headings included
(「(一)冠狀動脈疾病合併下列任一臨床狀況:」). The prescribing rule is split on the
numbering the source itself wrote (一、二、三) into three cards, **not one word
reworded**, with the whole unsplit paragraph behind a disclosure.

### Three things it does not do

- **No AI.** No API key, no server. The rules come from governed datasets, not from
  hard-coded if/else. The whole site is still static files on Cloudflare Pages.
- **No drug selection.** The announcement says 中至高強度 statin (moderate-to-high
  intensity); the master file has no intensity column. Mapping items onto an intensity
  would be the tool prescribing. The screen groups by ingredient and says so plainly.
- **No guessing.** An unanswered question is **unknown**, never **no**. Treating it as no
  under-rates the patient — into a tier with a higher payment threshold than they qualify
  for.

### "Unknown is not no" is the point of this tab

Until the answers settle it, no tier is named. Instead the screen lists **what is still
missing** and **which tiers are still possible**. Direct consequences:

- Ticking 一年內曾經歷心肌梗塞 (MI within a year) without confirming 冠狀動脈疾病
  (coronary artery disease) does **not** make it 極高風險 — the announcement says 合併
  ("together with")
- Ticking diabetes while the two higher tiers are unanswered gives "one of these three
  tiers", not 高風險
- **A blank LDL-C cannot rule out 高風險**, because LDL-C≧190mg/dL is itself one of that
  tier's criteria

Conversely, questions that can no longer change the answer are not asked: a patient who
meets 極高風險 is never asked about risk factors at all.

### The matching items

Of the 607 master records, **396** name a statin in their ingredient, **27** name
ezetimibe (**19** of those are combinations of both), and the remaining **203** — fibrates,
probucol, cholestyramine — name neither. All 396 statin hits are the seven real statins
(atorva / rosuva / simva / prava / lova / pitava / fluva); nothing like nystatin is swept
in.

The prescribing rules also name PCSK9 monoclonals, siRNA and ATP citrate lyase inhibitors.
The master holds **none of them**, so the screen says plainly that the list covers only
part of what the rule mentions rather than letting it read as the complete set.

## Data sources

| Dataset | Source |
| --- | --- |
| `nhi-drug-items-2026-08-07-r2` | NHIA 健保用藥品項查詢項目檔 (Taiwan open-data platform): 607 items, 4,048 price periods |
| `nhi-lipid-2026-09-01-r1` | The 2026-09-01 announcement's 藥品已收載品目異動明細表: 187 items |
| `nhi-lipid-risk-2026-09-01-r1` | The 2026-09-01 announcement's attachment 2: 6 tiers, 18 criteria, 11 risk factors, 6 assessment notes, 2 coverage rules |

Every price comes from the NHIA's published data; none is generated. Each source file's
provenance and SHA-256 is recorded in [`docs/source-register/`](docs/source-register/).

### Where strengths come from

**The master's specification columns are unusable**: 595 of the 607 records have empty
`規格量` / `規格單位`, and the 12 that are populated hold pack sizes, not strengths.
Strengths are read from two other columns and **unioned**:

| Column | Example |
| --- | --- |
| ingredient | `ATORVASTATIN (CALCIUM) 10 MG` |
| English name | `Atotin F.C. Tablets 10mg` |

Measured: 524 records state a strength in both, 83 in the ingredient only, 0 in the name
only — **all 607 yield at least one**, so nothing is guessed. The union is what makes it
correct on the 21 records where the two disagree, all salt forms or combinations:
`FLUVASTATIN SODIUM 21.06 MG` — only the name carries the 20mg a clinician types;
`EZETIMIBE 10 MG+SIMVASTATIN 20 MG` — only the ingredient keeps ezetimibe's 10mg. Taking
either column alone drops one of those.

Three things this must keep doing:

- **Never reconcile a salt weight into a label strength.** Caduet's 10.85 mg and 10 mg are
  both offered, because the master states both. Converting one into the other invents a
  number.
- **Keep a concentration's denominator.** `CHOLESTYRAMINE 444.4 MG/GM` is `444.4 mg/g`,
  not a 444.4 mg tablet, and a 444.4 mg filter must not reach it.
- **Units are part of the filter key**, so `4 g` is never matched by `4 mg`.

### Items priced 0.00

370 of the 607 master records currently show a payment price of `0.00`. In every case that
is the item's **final, open-ended** price period following a real earlier price — the
master is a full historical item file, not a list of currently reimbursed items.

**Drug lookups leave these out** and report how many were excluded (searching pravastatin
shows 19 items, 32 excluded). So an exact code that returns nothing says why, instead of
looking like a typo.

The exclusion is **per requested date**, so an item priced 0.00 today still resolves for a
date when it had a price. A price that does not parse as a number is kept rather than
treated as zero — the master holds 11 periods whose price is literally `-`.

## What this is not

Not an NHIA system. Results are not a basis for claims; the NHIA's own announcements
govern the actual items, prices and coverage rules. The tool decides no patient's coverage,
and the risk tier is computed from the announcement's criteria — it is not a diagnosis.

**No identifying patient data** — do not enter names or record numbers. The clinical values
the risk tab needs (LDL-C, the yes/no answers) live in React state only: never written to
`localStorage`, never sent anywhere, gone on reload.

It also no longer offers verbatim coverage-rule lookup. The 2.6.1–2.6.3 rule text and the
prior/current comparison were here once and were removed in 2026-08; for the rule text,
read the NHIA's announcement.

## Development

Node >= 22, pnpm workspace, ESM throughout.

```bash
pnpm install
pnpm typecheck                       # tsc across both workspace projects
pnpm test                            # vitest
pnpm export:web                      # vite build → apps/clinician/dist
pnpm --filter @nhi-cv/clinician dev  # local dev server
```

- `packages/domain` — all lookup logic and the compiled datasets. Pure functions, frozen
  data, no I/O
- `apps/clinician` — the interface (Vite + React, plain DOM and plain CSS, zero network
  calls)
  - `App.tsx` is layout only and holds no prose; every string lives in `src/copy.ts`
    (one Chinese, one English)
  - `src/app.css` is the whole stylesheet; colours are declared once as custom properties
    and swapped by `[data-theme]`
- `data/governed` — the source files each dataset was generated from
- `scripts/*-codegen.mjs` — regenerate `packages/domain/src/generated/` from
  `data/governed/`

CI runs typecheck, test and build. Merging to `main` deploys to Cloudflare Pages.

### When the NHIA publishes new data

1. Put the new source files in `data/governed/<dataset version>/`
2. Update that directory's `storage-manifest.json` (file hashes, byte counts)
3. **Update the constants pinned at the top of the codegen script** — `DATASET_VERSION`,
   `EXPECTED_FILE_SHA256`, `EXPECTED_RECORD_COUNT` and so on. These are pinned on purpose:
   if the data changes and the numbers do not, the codegen exits 1 instead of quietly
   producing something wrong
4. Run the matching codegen

```bash
node scripts/drug-items-codegen.mjs    # item master
node scripts/items-codegen.mjs         # announcement change detail
node scripts/risk-codegen.mjs          # risk tiers (run risk-transcribe first)
```

The risk dataset is **transcribed** from the announcement PDF rather than supplied as a
table. To re-derive it:

```bash
node scripts/risk-transcribe.mjs          # PDF → the JSONL files (needs poppler's pdftotext)
node scripts/risk-transcribe.mjs --check  # verify only, write nothing
```

The transcription decisions — why prescribing rules are paired to tiers by the heading the
text carries rather than by row order, why rejoining wrapped lines only ever adds spaces,
which column is deliberately not transcribed — are in
[`data/governed/nhi-lipid-risk-2026-09-01-r1/TRANSCRIPTION.md`](data/governed/nhi-lipid-risk-2026-09-01-r1/TRANSCRIPTION.md).
Read it before touching those JSONL files.

5. Update the provenance records in [`docs/source-register/`](docs/source-register/), and
   the record counts in [CLAUDE.md](CLAUDE.md) and in this file

**Never hand-edit `packages/domain/src/generated/` — always regenerate.**

---

Before changing lookup behaviour, read "Rules that protect correctness" in
[CLAUDE.md](CLAUDE.md). Those rules exist because breaking them shows a clinician wrong
drug information. See also [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

The code and the data are licensed **differently**:

| | Licence | Notes |
| --- | --- | --- |
| This project's code | [Apache License 2.0](LICENSE) | Free to use, modify and sell, closed-source included; keep the copyright notice and mark modified files |
| The NHI data compiled in | 政府資料開放授權條款第 1 版 (Open Government Data License) | Source: NHIA 健保用藥品項查詢項目檔, Taiwan open-data platform |
| The transcribed announcement text | The announcement's own text; copyright remains with the issuing agency | Transcribed verbatim, unreworded; provenance and hashes in [`docs/source-register/`](docs/source-register/) |

Copyright 2026 Universal Integrated Corp. (Josh Tsai)

Fork it and change it freely, but note one thing: this tool's value is that **it says only
what the NHIA's data says**. Before changing the lookup or tiering logic, read "Rules that
protect correctness" in [CLAUDE.md](CLAUDE.md).
