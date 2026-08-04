import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error The zero-dependency Node ESM generator intentionally has no declaration sidecar.
import { renderRulesModule } from "../../../scripts/rules-codegen.mjs";
import {
  RULE_TEXT_DATASET_VERSION,
  RULE_TEXT_EFFECTIVE_FROM,
  RULE_TEXT_UNITS
} from "./generated/rules-2026-09-01";

interface RawRuleTextUnit {
  readonly unit_id: string;
  readonly section: string;
  readonly table_label: string;
  readonly clause_path: readonly string[];
  readonly unit_type: string;
  readonly verbatim_text: string;
  readonly effective_from: string;
  readonly source_anchor: {
    readonly page: number;
    readonly line_start: number;
    readonly line_end: number;
  };
  readonly unit_sha256: string;
  readonly row_index?: number;
  readonly column_labels?: readonly string[];
}

interface RulesStorageManifest {
  readonly datasetVersion: string;
  readonly approvalRef: { readonly approvalWording: string };
  readonly files: readonly {
    readonly declaredName: string;
    readonly sha256: string;
    readonly bytes: number;
  }[];
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const governedDirectory = path.join(
  repositoryRoot,
  "data",
  "governed",
  "nhi-lipid-rules-structured-2026-09-01-r1"
);
const rulesPath = path.join(governedDirectory, "rules-structured.jsonl");
const manifestPath = path.join(governedDirectory, "storage-manifest.json");
const generatedPath = path.join(
  repositoryRoot,
  "packages",
  "domain",
  "src",
  "generated",
  "rules-2026-09-01.ts"
);

function sha256(value: string | Buffer, encoding?: BufferEncoding): string {
  const hash = createHash("sha256");
  if (typeof value === "string") {
    if (encoding === undefined) hash.update(value);
    else hash.update(value, encoding);
  } else {
    hash.update(value);
  }
  return hash.digest("hex");
}

function readRawUnits(): readonly RawRuleTextUnit[] {
  return readFileSync(rulesPath, "utf8").trimEnd().split("\n").map((line) => JSON.parse(line) as RawRuleTextUnit);
}

function mappedUnit(unit: RawRuleTextUnit): Record<string, unknown> {
  return {
    unitId: unit.unit_id,
    section: unit.section,
    tableLabel: unit.table_label,
    clausePath: unit.clause_path,
    unitType: unit.unit_type,
    verbatimText: unit.verbatim_text,
    sourceAnchor: {
      page: unit.source_anchor.page,
      lineStart: unit.source_anchor.line_start,
      lineEnd: unit.source_anchor.line_end
    },
    unitSha256: unit.unit_sha256,
    ...(unit.row_index === undefined
      ? {}
      : { rowIndex: unit.row_index, columnLabels: unit.column_labels })
  };
}

function expectDeeplyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child);
}

describe("generated governed rule-text module", () => {
  it("reruns generation logic and byte-compares the generated module", () => {
    expect(Buffer.from(renderRulesModule(), "utf8")).toEqual(readFileSync(generatedPath));
  });

  it("matches all 67 governed JSONL units field-for-field in original order", () => {
    const rawUnits = readRawUnits();
    expect(rawUnits).toHaveLength(67);
    expect(RULE_TEXT_DATASET_VERSION).toBe("nhi-lipid-rules-structured-2026-09-01-r1");
    expect(RULE_TEXT_EFFECTIVE_FROM).toBe("2026-09-01");
    expect(RULE_TEXT_UNITS).toEqual(rawUnits.map(mappedUnit));
  });

  it("recomputes every verbatim-text unit digest and deeply freezes the generated graph", () => {
    expect(RULE_TEXT_UNITS).toHaveLength(67);
    for (const unit of RULE_TEXT_UNITS) {
      expect(sha256(unit.verbatimText, "utf8")).toBe(unit.unitSha256);
    }
    expectDeeplyFrozen(RULE_TEXT_UNITS);
  });

  it("binds the generated header to the manifest declaration and recomputed dataset digest", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as RulesStorageManifest;
    const rawRules = readFileSync(rulesPath);
    const fileEntry = manifest.files.find((entry) => entry.declaredName === "rules-structured.jsonl");
    expect(fileEntry).toBeDefined();
    expect(rawRules.byteLength).toBe(fileEntry?.bytes);
    expect(sha256(rawRules)).toBe(fileEntry?.sha256);

    const datasetDigest = sha256(
      [...manifest.files]
        .sort((left, right) => left.declaredName.localeCompare(right.declaredName, "en"))
        .map((entry) => entry.sha256)
        .join(""),
      "ascii"
    );
    expect(datasetDigest).toBe("dcb6bd916fc802a18e50e02ec760928e819ef2fa2ef881155b88bca6c8e67c28");
    expect(manifest.datasetVersion).toBe(RULE_TEXT_DATASET_VERSION);
    expect(manifest.approvalRef.approvalWording).toBe(
      "INTAKE-APPROVE nhi-lipid-rules-structured-2026-09-01-r1 dcb6bd9"
    );

    const generatedSource = readFileSync(generatedPath, "utf8");
    expect(generatedSource).toContain(`// Dataset digest (SHA-256): ${datasetDigest}\n`);
    expect(generatedSource).toContain("// Unit count: 67\n");
    expect(generatedSource).toContain("// Authorization: RDL-016\n");
    expect(generatedSource.startsWith("// GENERATED — DO NOT EDIT\n")).toBe(true);
  });
});
