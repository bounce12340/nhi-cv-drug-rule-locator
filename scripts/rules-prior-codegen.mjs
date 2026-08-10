#!/usr/bin/env node

// Regenerates packages/domain/src/generated/rules-prior.ts from
// data/governed/nhi-lipid-rules-prior-2026-09-01-r1/rules-prior.jsonl.
//
// The JSONL itself is produced by extracting the three official prior-version
// PDFs with `pdftotext -layout -enc UTF-8`, then dropping the trailing
// page-number line and trailing blank lines. Each record carries the SHA-256 of
// the PDF it came from, so the chain back to the official file is checkable.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATASET_VERSION = "nhi-lipid-rules-prior-2026-09-01-r1";
const EFFECTIVE_TO = "2026-08-31";
const EXPECTED_SECTIONS = ["2.6.1", "2.6.2", "2.6.3"];

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const governedDirectory = path.join(repositoryRoot, "data", "governed", DATASET_VERSION);
const jsonlPath = path.join(governedDirectory, "rules-prior.jsonl");
const manifestPath = path.join(governedDirectory, "storage-manifest.json");
const outputPath = path.join(
  repositoryRoot,
  "packages",
  "domain",
  "src",
  "generated",
  "rules-prior.ts"
);

const jsonlRaw = readFileSync(jsonlPath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const declaredFile = manifest.files.find((file) => file.declaredName === "rules-prior.jsonl");
const actualSha256 = createHash("sha256").update(jsonlRaw, "utf8").digest("hex");
if (declaredFile === undefined || declaredFile.sha256 !== actualSha256) {
  throw new Error(
    `rules-prior.jsonl does not match the manifest. manifest=${declaredFile?.sha256} actual=${actualSha256}`
  );
}

const records = jsonlRaw
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line));

const sections = records.map((record) => record.section);
if (sections.join(",") !== EXPECTED_SECTIONS.join(",")) {
  throw new Error(`unexpected sections: ${sections.join(",")}`);
}

const header = `// GENERATED — DO NOT EDIT
// Source dataset: ${DATASET_VERSION}
// Source file SHA-256: ${actualSha256}
// Extraction: ${manifest.extraction.tool}; ${manifest.extraction.normalization}
// Generator: scripts/rules-prior-codegen.mjs
`;

const body = `
export interface PriorRuleSectionRecord {
  readonly section: string;
  readonly verbatimText: string;
  readonly revisionDates: readonly string[];
  readonly lastRevisionEffectiveFrom: string;
  readonly sourcePdfDeclaredName: string;
  readonly sourcePdfSha256: string;
  readonly sourcePdfBytes: number;
}

export const PRIOR_RULE_DATASET_VERSION = ${JSON.stringify(DATASET_VERSION)} as const;
export const PRIOR_RULE_DATASET_EFFECTIVE_TO = ${JSON.stringify(EFFECTIVE_TO)} as const;

const generatedPriorRuleSections: PriorRuleSectionRecord[] = ${JSON.stringify(records, null, 2)};

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const PRIOR_RULE_SECTIONS: readonly PriorRuleSectionRecord[] = deepFreeze(
  generatedPriorRuleSections
);
`;

writeFileSync(outputPath, `${header}${body}`, "utf8");
console.log(
  `wrote ${path.relative(repositoryRoot, outputPath)} — ${records.length} sections, source sha256 ${actualSha256.slice(0, 12)}`
);
