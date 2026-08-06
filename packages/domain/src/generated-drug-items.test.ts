import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error The zero-dependency Node ESM generator intentionally has no declaration sidecar.
import { DRUG_ITEM_SOURCE_HEADERS, renderDrugItemsModule, rocDateToIso, validateAndGroupDrugItemRows } from "../../../scripts/drug-items-codegen.mjs";
import {
  DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
  DRUG_ITEMS_DATASET_EFFECTIVE_TO,
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_RECORDS,
  type DrugItemMasterRecord
} from "./generated/drug-items-2026-08-06";

type CsvRecord = Readonly<Record<string, string>>;

interface DrugItemsStorageManifest {
  readonly datasetVersion: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string;
  readonly approvalRef: { readonly rdlId: string; readonly approvalWording: string };
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
  "nhi-drug-items-2026-08-06-r1"
);
const csvPath = path.join(governedDirectory, "drug-items-lipid.csv");
const manifestPath = path.join(governedDirectory, "storage-manifest.json");
const committedGeneratedPath = path.join(
  repositoryRoot,
  "packages",
  "domain",
  "src",
  "generated",
  "drug-items-2026-08-06.ts"
);
const generatedPath = process.env.DRUG_ITEMS_GENERATED_PATH ?? committedGeneratedPath;

function sha256(value: string | Buffer, encoding?: BufferEncoding): string {
  const hash = createHash("sha256");
  if (typeof value === "string") {
    if (encoding === undefined) hash.update(value);
    else hash.update(value, encoding);
  }
  else hash.update(value);
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
        } else quoted = false;
      } else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
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

function independentlyConvertRocDate(raw: string): string {
  const normalized = raw.trim();
  if (normalized === "9991231") return "9999-12-31";
  const year = Number(normalized.slice(0, -4)) + 1911;
  return `${String(year).padStart(4, "0")}-${normalized.slice(-4, -2)}-${normalized.slice(-2)}`;
}

function readExpectedRecords(): readonly DrugItemMasterRecord[] {
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const groups = new Map<string, CsvRecord[]>();
  for (const row of rows) {
    const group = groups.get(row["藥品代號"]);
    if (group === undefined) groups.set(row["藥品代號"], [row]);
    else group.push(row);
  }

  return [...groups.values()].map((group) => {
    const first = group[0]!;
    return {
      nhiCode: first["藥品代號"],
      drugNameEn: first["藥品英文名稱"],
      drugNameZh: first["藥品中文名稱"],
      ingredient: first["成分"],
      specificationAmount: first["規格量"],
      specificationUnit: first["規格單位"],
      singleOrCompound: first["單複方"],
      vendor: first["藥商"],
      manufacturer: first["製造廠名稱"],
      dosageForm: first["劑型"],
      drugCategory: first["藥品分類"],
      classificationGroupName: first["分類分組名稱"],
      atcCode: first["ATC代碼"],
      coverageRuleSection: first["給付規定章節"],
      priceHistory: group
        .map((row) => ({
          paymentPriceRaw: row["支付價"],
          effectiveStartRaw: row["有效起日"],
          effectiveEndRaw: row["有效迄日"],
          startDateIso: independentlyConvertRocDate(row["有效起日"]),
          endDateIso: independentlyConvertRocDate(row["有效迄日"])
        }))
        .sort((left, right) => left.startDateIso.localeCompare(right.startDateIso, "en"))
    };
  });
}

function expectDeeplyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child);
}

function syntheticValues(): Record<string, string> {
  const values = Object.fromEntries(DRUG_ITEM_SOURCE_HEADERS.map((header: string) => [header, "x"]));
  return {
    ...values,
    異動: "",
    藥品代號: "D3M0T00001",
    藥品英文名稱: "Demo tablet 10 mg",
    藥品中文名稱: "示範錠十毫克",
    支付價: "1.00",
    有效起日: "1120101",
    有效迄日: "1121231",
    藥品代碼超連結: "synthetic://item",
    給付規定章節連結: "synthetic://rule"
  };
}

describe("generated governed drug-item master module", () => {
  it("reruns codegen and byte-compares the generated module", () => {
    expect(Buffer.from(renderDrugItemsModule(), "utf8")).toEqual(readFileSync(generatedPath));
  });

  it("preserves all 606 items and all 4,047 price periods field-for-field", () => {
    const expected = readExpectedRecords();
    expect(DRUG_ITEM_MASTER_RECORDS).toEqual(expected);
    expect(DRUG_ITEM_MASTER_RECORDS).toHaveLength(606);
    expect(
      DRUG_ITEM_MASTER_RECORDS.reduce((total, item) => total + item.priceHistory.length, 0)
    ).toBe(4_047);
    expect(new Set(DRUG_ITEM_MASTER_RECORDS.map((item) => item.nhiCode)).size).toBe(606);
  });

  it("sorts every complete price history by effective start and deeply freezes the graph", () => {
    for (const item of DRUG_ITEM_MASTER_RECORDS) {
      expect(item.priceHistory.map((period) => period.startDateIso)).toEqual(
        [...item.priceHistory].map((period) => period.startDateIso).sort()
      );
    }
    expectDeeplyFrozen(DRUG_ITEM_MASTER_RECORDS);
  });

  it("converts ROC dates across the century, at month end, and at the no-end sentinel", () => {
    expect(rocDateToIso("  991231", 2, "date")).toBe("2010-12-31");
    expect(rocDateToIso("1000101", 3, "date")).toBe("2011-01-01");
    expect(rocDateToIso("1130229", 4, "date")).toBe("2024-02-29");
    expect(rocDateToIso("9991231", 5, "date")).toBe("9999-12-31");
    expect(() => rocDateToIso("1120229", 6, "date")).toThrow(/row 6 has an invalid date/);
  });

  it("fails closed with row locations when a grouped non-price field differs", () => {
    const first = syntheticValues();
    const second = {
      ...syntheticValues(),
      成分: "different synthetic ingredient",
      有效起日: "1130101",
      有效迄日: "1131231"
    };
    expect(() =>
      validateAndGroupDrugItemRows([
        { rowNumber: 2, values: first },
        { rowNumber: 3, values: second }
      ])
    ).toThrow(/rows 2 and 3 differ in non-price field 成分/);
    try {
      validateAndGroupDrugItemRows([
        { rowNumber: 2, values: first },
        { rowNumber: 3, values: second }
      ]);
    } catch (error) {
      expect(String(error)).not.toContain(first.藥品代號);
    }
  });

  it("validates even a discarded URL field before grouping", () => {
    const first = syntheticValues();
    const second = {
      ...syntheticValues(),
      有效起日: "1130101",
      有效迄日: "1131231",
      藥品代碼超連結: "synthetic://different-item"
    };
    expect(() =>
      validateAndGroupDrugItemRows([
        { rowNumber: 8, values: first },
        { rowNumber: 9, values: second }
      ])
    ).toThrow(/rows 8 and 9 differ in non-price field 藥品代碼超連結/);
  });

  it("binds manifest, source bytes, generated provenance, and the size budget", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as DrugItemsStorageManifest;
    const rawCsv = readFileSync(csvPath);
    const generatedSource = readFileSync(committedGeneratedPath, "utf8");
    expect(manifest).toMatchObject({
      datasetVersion: DRUG_ITEMS_DATASET_VERSION,
      effectiveFrom: DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
      effectiveTo: DRUG_ITEMS_DATASET_EFFECTIVE_TO,
      approvalRef: {
        rdlId: "RDL-020",
        approvalWording: "INTAKE-APPROVE nhi-drug-items-2026-08-06-r1 de376fe"
      }
    });
    expect(manifest.files).toEqual([
      {
        declaredName: "drug-items-lipid.csv",
        sha256: "e4783015aa0e84be62a9a27eff3dd6090f5019786771d389bc4498bc52b6e9f5",
        bytes: 1_843_720
      }
    ]);
    expect(rawCsv.byteLength).toBe(1_843_720);
    expect(sha256(rawCsv)).toBe(manifest.files[0]?.sha256);
    expect(sha256(manifest.files[0]!.sha256, "ascii")).toBe(
      "de376fec6c11203fe030389e37663b715ada502259dcd2b041020c88d996970f"
    );
    expect(generatedSource.startsWith("// GENERATED — DO NOT EDIT\n")).toBe(true);
    expect(generatedSource).toContain("// Authorization: RDL-021\n");
    expect(generatedSource).toContain("// Record count: 606\n");
    expect(generatedSource).toContain("// Price-period count: 4047\n");
    expect(generatedSource).toContain("The two source URL columns are omitted");
    expect(generatedSource).not.toContain("https://");
    expect(Buffer.byteLength(generatedSource)).toBeLessThanOrEqual(1_200_000);
  });

  it("fails before rendering when the authorized source hash is forced to mismatch", () => {
    expect(() => renderDrugItemsModule({ forceHashMismatch: true })).toThrow(
      /SHA-256 does not match both manifest and authorization/
    );
  });
});
