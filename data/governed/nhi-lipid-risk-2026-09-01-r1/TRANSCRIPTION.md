# nhi-lipid-risk-2026-09-01-r1 — how these files were derived

Six JSONL files transcribed from the 2026-09-01 announcement's attachment 2, which already lives in
this repository:

```
data/governed/nhi-lipid-rules-2026-09-01-r1/attachment-2-rule-revision-table.pdf
SHA-256 6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2
```

Re-derive with `node scripts/risk-transcribe.mjs` (needs poppler's `pdftotext`); verify with
`--check`. The script re-hashes the PDF before reading it and stops on a mismatch.

| File | Source section | Records |
| --- | --- | --- |
| `risk-tiers.jsonl` | 表一 | 6 — the table's six rows |
| `tier-criteria.jsonl` | ●ASCVD 風險等級定義 | 18 — 極高 7, 非常高 7, 高 4 |
| `risk-factors.jsonl` | ●心血管風險因子定義 | 11 — 6 factors, 5 metabolic-syndrome sub-criteria |
| `assessment-advice.jsonl` | ●各風險等級評估建議 + the non-HDL-C bullet | 6 — 2 + 3 tier-scoped items, 1 note |
| `coverage-rules.jsonl` | 2.6.2, 2.6.3 (建議修訂後給付規定 only) | 2 |
| `coverage-rule-conditions.jsonl` | the numbered items under each | 5 — 2.6.2 has 2, 2.6.3 has 3 |

## The extraction, and the four things that had to be got right

`pdftotext -layout` keeps the table's columns aligned. Without `-layout` the table collapses into a
single text flow — that is what made the removed `nhi-lipid-rules-structured` dataset unusable, and
it is why that one must not be reached for here.

**1. Prescription rules are paired by the heading the text carries, never by row position.** The
處方規定 column is one flowing block whose lines do not line up with the tier rows printed beside
them: the text sitting level with 中風險 is still part of 高風險's paragraph. The column labels
itself — `極高、非常高風險：`, `高風險：`, `中、低風險：` — so each block is sliced on its own
heading and `prescriptionHeadingRaw` records which heading a tier was matched to. Reading the
pairing off row order would be the same class of error as inferring a drug's code from an adjacent
row, which this project forbids.

**2. Joining hard-wrapped lines only ever inserts spaces.** The source wraps mid-term, and the wrap
eats the space: `siRNA、ATP citrate` / `lyase 抑制劑。`. Concatenating gives `citratelyase`, a string
that appears nowhere in the document — a silent edit of official text. Each tier therefore stores
both `prescriptionRuleLines` (the untouched source lines) and `prescriptionRuleText` (the joined
paragraph). A space is restored when one side of the join is a Latin letter or digit and neither
side is full-width punctuation or a hyphen, which leaves `包含：ezetimibe` and `non-statin` alone
while fixing `ATP citrate lyase` and `PCSK9 單株抗體`. `risk-codegen.mjs` asserts the two forms are
identical once all whitespace is removed, so the join can add spaces but can never change a
character.

**3. Criteria are two-level and are not flattened.** 極高風險 and 非常高風險 each state a
prerequisite and then a list of alternatives under it — `冠狀動脈疾病合併下列任一臨床狀況：`. A
patient with only `一年內曾經歷心肌梗塞` and no 冠狀動脈疾病 does **not** meet it. Every row carries
`groupHeadingRaw` (verbatim) and `prerequisiteLabelZh` (the heading with its trailing
`合併下列任一臨床狀況：` or `，包含：` removed, so the screen has something short to ask). 高風險's
four entries are a genuinely flat list and carry no prerequisite.

**4. A dropped superscript is put back.** `pdftotext` prints the ² of `1.73m²` on a line of its own.
Left alone it vanishes and the CKD criterion reads `eGFR<60mL/min/1.73m 至少持續3個月`. The digit is
reinserted into the following line at the column it was printed at.

## The second column, and why it is cropped rather than sliced

Everything below 表一 sits in a two-column comparison layout — 建議修訂後給付規定 on the left,
原給付規定 on the right. **Only the left column is transcribed.** The tool states the rule that takes
effect on 2026-09-01; the prior/current comparison surface was removed from the app in 2026-08 and
none of this brings it back.

The split is geometric. `pdftotext -layout` pads to visual columns while JavaScript indexes code
points, and CJK runs are double width, so no fixed character offset separates the two — on page 12
the right column starts at character 44 on some lines and 47 on others. `pdftotext -x 0 -W <width>`
lets poppler do the separation instead, and each crop is checked by moving it 4pt either way: a
boundary standing in the gutter yields identical text, one that clips a glyph does not.

| Page | Content | Stable range | Used |
| --- | --- | --- | --- |
| 11 | 評估建議 and the non-HDL-C note | 410–426pt | 421 |
| 12 | 2.6.2, and 2.6.3's heading | 295–304pt | 300 |
| 13 | the rest of 2.6.3 | 295–310pt | 300 |

The widths differ because the table's own rule does: page 11's left cell runs to 416pt with an empty
cell beside it, pages 12 and 13 end at 295pt. As a second guard the script fails if wording carried
only by the right column — `如 Ezetrol`, `本案藥品`, `符合全民健康保險降血脂藥物給付` — appears in a
crop, since the revised rule writes 本類藥品 where the prior one writes 本案藥品.

## One wrap the space rule gets wrong, named rather than papered over

Point 2 above restores a space when one side of a join is Latin. That is right in 表一, which prints
`經起始治療 6~8 週後`, and wrong everywhere else in the document, which prints `單一治療3個月未達`
with no spaces — four unwrapped instances say so.

The conflict shows up once. 2.6.3 wraps after `6-8`, so the rule would produce `6-8 週`; 2.6.2 wraps
the same sentence one character earlier, after the hyphen, so the hyphen rule already produces
`6-8週`. The same sentence, resolved two ways. `WRAP_NO_SPACE` in the transcriber names that one
boundary, and the build fails if the entry ever stops matching, so a stale exception cannot sit
there silently. The whitespace-stripped identity assertion cannot catch this class of error — it
strips exactly the character in dispute — which is why the exception is written down instead.

## The 健保代碼 tables are read for codes only

Both rules end in a table of NHI codes with drug names beside them, and both are pointed at by the
rules' own 下表所列項目. Only the **codes** are transcribed: the names are already in the item master,
and a second spelling of the same fact could drift from the first.

The 14 codes are checked against `data/governed/nhi-lipid-2026-09-01-r1/`'s two exception CSVs, which
were transcribed independently and earlier. 2.6.2's four and 2.6.3's ten match both CSVs exactly, and
`coverage-rule.test.ts` re-runs that comparison on every CI run against the compiled datasets.

## 2.6.3 gets no connective it did not write

2.6.2 restricts the drug to three named conditions and then asks for `下列條件之一`. 2.6.3 numbers
three requirements with no such wording. `restrictionRaw` is therefore `null` for 2.6.3 and the
screen prints nothing in its place — supplying 2.6.2's "any one of" would turn three requirements
into three alternatives.

## What is deliberately absent

**The 非藥物治療 column is not transcribed.** It is merged across rows, and `pdftotext` returns only
fragments (`處置各`, `管風險`, `生活型`…). Reassembling which fragment belongs to which tier would
mean inferring cell boundaries from row position — the one inference this dataset exists to avoid.
The column is in the source PDF for anyone who needs it.

**`no-factors` has no secondary target and no prescription rule.** The table's last row states
`LDL-C≧160mg/dL` and `LDL-C<160mg/dL` and nothing else, and no 處方規定 block names it. Both are
recorded as `null`. Borrowing 中、低風險's rule because that row sits above it would be exactly the
row-order inference ruled out above; if the announcement means it to apply, the announcement does
not say so.

## Checks that fail closed

`scripts/risk-transcribe.mjs` stops rather than writing on any of: a PDF hash mismatch, a missing
heading, a prescription block that does not begin with its own heading or does not end in `。`, a
group heading whose wording it does not recognise, a nested criterion outside a group, or a rejoin
that changed anything but whitespace.

The threshold and target cells are written out in the script and checked back against each tier's
own row window — the transcription is the assertion, so a changed announcement fails the run
instead of being quietly mis-read.
