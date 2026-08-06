import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error The zero-dependency Node ESM generator intentionally has no declaration sidecar.
import { renderItemsModule } from "../../../scripts/items-codegen.mjs";
import {
  ITEM_DATASET_EFFECTIVE_FROM,
  ITEM_DATASET_VERSION,
  ITEM_RECORDS,
  type DrugItemRecord
} from "./generated/items-2026-09-01";

interface ItemsStorageManifest {
  readonly datasetVersion: string;
  readonly approvalRef: { readonly rdlId: string; readonly approvalWording: string };
  readonly files: readonly {
    readonly declaredName: string;
    readonly sha256: string;
    readonly bytes: number;
  }[];
}

type CsvRecord = Readonly<Record<string, string>>;
type MutableDrugItemRecord = { -readonly [Key in keyof DrugItemRecord]: DrugItemRecord[Key] };

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const governedDirectory = path.join(
  repositoryRoot,
  "data",
  "governed",
  "nhi-lipid-2026-09-01-r1"
);
const manifestPath = path.join(governedDirectory, "storage-manifest.json");
const generatedPath = path.join(
  repositoryRoot,
  "packages",
  "domain",
  "src",
  "generated",
  "items-2026-09-01.ts"
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

function parseCsv(text: string): readonly CsvRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows;
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function blankRecord(nhiCode: string, drugNameEn: string): MutableDrugItemRecord {
  return {
    nhiCode,
    drugNameEn,
    ingredient: undefined,
    manufacturer: undefined,
    coverageRule: undefined,
    priceBefore: undefined,
    priceAfter: undefined,
    effectiveDate: undefined,
    tableClassification: undefined,
    ingredientCategory: undefined,
    exceptionNote: undefined
  };
}

function readExpectedRecords(): readonly DrugItemRecord[] {
  const sources = [
    "ezetimibe_3month_exception.csv",
    "ezetimibe_statin_combo_3month_exception.csv",
    "price_change_seed_20260901.csv",
    "statin_table2_only_list.csv"
  ] as const;
  const records = new Map<string, MutableDrugItemRecord>();

  for (const source of sources) {
    const rows = parseCsv(readFileSync(path.join(governedDirectory, source), "utf8"));
    for (const row of rows) {
      const existing = records.get(row.nhi_code);
      const record = { ...(existing ?? blankRecord(row.nhi_code, row.drug_name_en)) };
      if (source === "ezetimibe_3month_exception.csv") {
        record.exceptionNote = row.trial_period_before_combo || undefined;
      } else if (source === "ezetimibe_statin_combo_3month_exception.csv") {
        record.exceptionNote = row.trial_period_before_use || undefined;
      } else if (source === "price_change_seed_20260901.csv") {
        record.ingredient = row.ingredient || undefined;
        record.manufacturer = row.manufacturer || undefined;
        record.coverageRule = row.coverage_rule || undefined;
        record.priceBefore = row.old_price || undefined;
        record.priceAfter = row.new_price || undefined;
        record.effectiveDate = row.effective_date || undefined;
      } else {
        record.tableClassification = row.table_classification || undefined;
        record.ingredientCategory = row.ingredient_category || undefined;
      }
      records.set(row.nhi_code, record);
    }
  }
  return [...records.values()];
}

function expectDeeplyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child);
}

describe("generated governed drug-item module", () => {
  it("reruns generation logic and byte-compares the generated module", () => {
    expect(Buffer.from(renderItemsModule(), "utf8")).toEqual(readFileSync(generatedPath));
  });

  it("merges all four CSV files by nhi_code without changing field text", () => {
    const expectedRecords = readExpectedRecords();
    expect(ITEM_DATASET_VERSION).toBe("nhi-lipid-2026-09-01-r1");
    expect(ITEM_DATASET_EFFECTIVE_FROM).toBe("2026-09-01");
    expect(expectedRecords).toHaveLength(187);
    expect(ITEM_RECORDS).toEqual(expectedRecords);
    expect(new Set(ITEM_RECORDS.map((record) => record.nhiCode)).size).toBe(187);
  });

  it("preserves missing fields as undefined and deeply freezes every record", () => {
    expect(ITEM_RECORDS.filter((record) => record.exceptionNote !== undefined)).toHaveLength(14);
    expect(ITEM_RECORDS.filter((record) => record.priceBefore !== undefined)).toHaveLength(57);
    expect(ITEM_RECORDS.filter((record) => record.tableClassification !== undefined)).toHaveLength(116);
    const withoutPrice = ITEM_RECORDS.find((record) => record.priceBefore === undefined);
    expect(withoutPrice).toBeDefined();
    expect(withoutPrice?.priceBefore).toBeUndefined();
    expect(withoutPrice?.priceAfter).toBeUndefined();
    expect(withoutPrice?.priceBefore).not.toBe(0);
    expectDeeplyFrozen(ITEM_RECORDS);
  });

  it("binds generated provenance to every manifest file and RDL-019", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ItemsStorageManifest;
    for (const file of manifest.files) {
      const rawFile = readFileSync(path.join(governedDirectory, file.declaredName));
      expect(rawFile.byteLength).toBe(file.bytes);
      expect(sha256(rawFile)).toBe(file.sha256);
    }
    const datasetDigest = sha256(
      [...manifest.files]
        .sort((left, right) => left.declaredName.localeCompare(right.declaredName, "en"))
        .map((file) => file.sha256)
        .join(""),
      "ascii"
    );
    expect(datasetDigest).toBe("01a4df7463c76a4f280dfd8f5dc8307c292e797532b98bed3edca85abbf155c5");
    expect(manifest.datasetVersion).toBe(ITEM_DATASET_VERSION);
    expect(manifest.approvalRef).toEqual({
      rdlId: "RDL-012",
      approvalWording: "INTAKE-APPROVE nhi-lipid-2026-09-01-r1 01a4df7"
    });

    const generatedSource = readFileSync(generatedPath, "utf8");
    expect(generatedSource).toContain(`// Dataset digest (SHA-256): ${datasetDigest}\n`);
    expect(generatedSource).toContain("// Record count: 187\n");
    expect(generatedSource).toContain("// Authorization: RDL-019\n");
    expect(generatedSource.startsWith("// GENERATED — DO NOT EDIT\n")).toBe(true);
  });
});

