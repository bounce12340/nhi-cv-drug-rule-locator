/**
 * Token-level comparison between two versions of a rule section.
 *
 * This is a derived view, not official text. It exists because a list of changed
 * quantitative terms does not tell a clinician what the provision now says. The
 * unmodified verbatim text of both versions stays available elsewhere and is
 * never replaced by this.
 *
 * What the algorithm does and does not claim:
 *  - Alignment is a longest-common-subsequence over tokens. It is deterministic,
 *    not a judgement about which provision replaced which.
 *  - A row pairing removed text with added text means the two are adjacent in
 *    the diff, not that the regulator rewrote one into the other.
 *  - Coincidental short matches are suppressed (see MIN_EQUAL_RUN). Without this
 *    a single 「合」 or 「表」 shared by two unrelated sentences is reported as
 *    unchanged, which reads as a claim that the sentence survived.
 */

const CJK_OR_SYMBOL = /[A-Za-z]+|[0-9]+(?:[./][0-9]+)*|[\s\S]/g;

/**
 * Equal runs shorter than this are folded into the surrounding change. Six
 * tokens was chosen against the real sections: below it, 2.6.1 shreds into 150
 * hunks held together by accidental single-character matches; at six it settles
 * to 20 hunks that each correspond to a real block of text.
 */
const MIN_EQUAL_RUN = 6;

const PUNCTUATION_FOLD: readonly (readonly [string, string])[] = Object.freeze([
  ["（", "("],
  ["）", ")"],
  ["，", ","],
  ["：", ":"],
  ["；", ";"],
  ["～", "-"],
  ["~", "-"],
  ["－", "-"],
  ["–", "-"],
  ["—", "-"],
  ["＜", "<"],
  ["＞", ">"],
  ["≧", "≥"],
  ["≦", "≤"]
]);

export type RuleDiffRowKind = "unchanged" | "removed" | "added" | "replaced";

export interface RuleDiffRow {
  readonly kind: RuleDiffRowKind;
  /** Text as it appears in the prior version; empty for a pure addition. */
  readonly prior: string;
  /** Text as it appears in the current version; empty for a pure removal. */
  readonly current: string;
}

export interface RuleDiffSummary {
  readonly rows: readonly RuleDiffRow[];
  readonly unchangedTokens: number;
  readonly removedTokens: number;
  readonly addedTokens: number;
  readonly priorTokens: number;
  readonly currentTokens: number;
}

/**
 * Line breaks are layout artifacts in both sources — the prior text wraps at the
 * PDF's column width, the current text at its transcription unit boundaries — so
 * they are dropped before comparison. Everything else keeps its original form.
 */
function tokenize(text: string): readonly string[] {
  return text.replace(/[\s　]+/g, "").match(CJK_OR_SYMBOL) ?? [];
}

/** Matching key only; the row text always carries the original token. */
function matchKey(token: string): string {
  let key = token.toLocaleLowerCase("en-US");
  for (const [from, to] of PUNCTUATION_FOLD) key = key.split(from).join(to);
  return key;
}

interface Opcode {
  readonly kind: "equal" | "change";
  readonly priorStart: number;
  readonly priorEnd: number;
  readonly currentStart: number;
  readonly currentEnd: number;
}

/** Classic LCS table with backtracking. Sized for these sections: 884 x 3063 at the largest. */
function longestCommonSubsequence(
  prior: readonly string[],
  current: readonly string[]
): readonly Opcode[] {
  const rows = prior.length;
  const columns = current.length;
  const table = new Int32Array((rows + 1) * (columns + 1));
  const width = columns + 1;

  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = columns - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        prior[i] === current[j]
          ? table[(i + 1) * width + (j + 1)]! + 1
          : Math.max(table[(i + 1) * width + j]!, table[i * width + (j + 1)]!);
    }
  }

  const opcodes: Opcode[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (prior[i] === current[j]) {
      const startI = i;
      const startJ = j;
      while (i < rows && j < columns && prior[i] === current[j]) {
        i += 1;
        j += 1;
      }
      opcodes.push({
        kind: "equal",
        priorStart: startI,
        priorEnd: i,
        currentStart: startJ,
        currentEnd: j
      });
    } else {
      const startI = i;
      const startJ = j;
      while (
        i < rows &&
        j < columns &&
        prior[i] !== current[j]
      ) {
        if (table[(i + 1) * width + j]! >= table[i * width + (j + 1)]!) i += 1;
        else j += 1;
      }
      opcodes.push({
        kind: "change",
        priorStart: startI,
        priorEnd: i,
        currentStart: startJ,
        currentEnd: j
      });
    }
  }
  if (i < rows || j < columns) {
    opcodes.push({
      kind: "change",
      priorStart: i,
      priorEnd: rows,
      currentStart: j,
      currentEnd: columns
    });
  }
  return opcodes;
}

/** Folds short equal runs into neighbouring changes, then merges adjacent changes. */
function suppressCoincidentalMatches(opcodes: readonly Opcode[]): readonly Opcode[] {
  const widened = opcodes.map((opcode, index) =>
    opcode.kind === "equal" &&
    opcode.priorEnd - opcode.priorStart < MIN_EQUAL_RUN &&
    index > 0
      ? { ...opcode, kind: "change" as const }
      : opcode
  );

  const merged: Opcode[] = [];
  for (const opcode of widened) {
    const previous = merged[merged.length - 1];
    if (previous !== undefined && previous.kind === "change" && opcode.kind === "change") {
      merged[merged.length - 1] = {
        kind: "change",
        priorStart: previous.priorStart,
        priorEnd: opcode.priorEnd,
        currentStart: previous.currentStart,
        currentEnd: opcode.currentEnd
      };
    } else {
      merged.push(opcode);
    }
  }
  return merged;
}

export function diffRuleSectionText(priorText: string, currentText: string): RuleDiffSummary {
  const priorTokens = tokenize(priorText);
  const currentTokens = tokenize(currentText);
  const opcodes = suppressCoincidentalMatches(
    longestCommonSubsequence(priorTokens.map(matchKey), currentTokens.map(matchKey))
  );

  const rows: RuleDiffRow[] = [];
  let unchanged = 0;
  let removed = 0;
  let added = 0;

  for (const opcode of opcodes) {
    const prior = priorTokens.slice(opcode.priorStart, opcode.priorEnd).join("");
    const current = currentTokens.slice(opcode.currentStart, opcode.currentEnd).join("");
    if (opcode.kind === "equal") {
      unchanged += opcode.priorEnd - opcode.priorStart;
      rows.push(Object.freeze({ kind: "unchanged" as const, prior, current }));
      continue;
    }
    removed += opcode.priorEnd - opcode.priorStart;
    added += opcode.currentEnd - opcode.currentStart;
    const kind: RuleDiffRowKind =
      prior.length === 0 ? "added" : current.length === 0 ? "removed" : "replaced";
    rows.push(Object.freeze({ kind, prior, current }));
  }

  return Object.freeze({
    rows: Object.freeze(rows),
    unchangedTokens: unchanged,
    removedTokens: removed,
    addedTokens: added,
    priorTokens: priorTokens.length,
    currentTokens: currentTokens.length
  });
}
