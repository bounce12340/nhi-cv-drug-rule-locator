# nhi-lipid-risk-2026-09-01-r1 — how these files were derived

Three JSONL files transcribed from **表一** of the 2026-09-01 announcement's attachment 2, which
already lives in this repository:

```
data/governed/nhi-lipid-rules-2026-09-01-r1/attachment-2-rule-revision-table.pdf
SHA-256 6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2
```

Re-derive with `node scripts/risk-transcribe.mjs` (needs poppler's `pdftotext`); verify with
`--check`. The script re-hashes the PDF before reading it and stops on a mismatch.

| File | Records |
| --- | --- |
| `risk-tiers.jsonl` | 6 — the table's six rows |
| `tier-criteria.jsonl` | 18 — 極高 7, 非常高 7, 高 4 |
| `risk-factors.jsonl` | 11 — 6 factors, 5 metabolic-syndrome sub-criteria |

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
