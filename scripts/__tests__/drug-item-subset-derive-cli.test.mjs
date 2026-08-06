import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  EXPECTED_SOURCE_HEADERS,
  deriveSubsetFromArguments,
} from "../drug-item-subset-derive.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const scratchpadRoot = path.join(repositoryRoot, "scratchpad");
const temporaryDirectories = [];

function createFixture() {
  mkdirSync(scratchpadRoot, { recursive: true });
  const directory = mkdtempSync(path.join(scratchpadRoot, "drug-item-derive-cli-test-"));
  temporaryDirectories.push(directory);
  const values = Object.fromEntries(
    EXPECTED_SOURCE_HEADERS.map((header) => [header, "SYNTHETIC_TEST_ONLY"]),
  );
  values["給付規定章節"] = "2.6.1.";
  const row = EXPECTED_SOURCE_HEADERS.map((header) => values[header]);
  const sourceBytes = Buffer.from(
    `\uFEFF${EXPECTED_SOURCE_HEADERS.join(",")}\n${row.join(",")}\n`,
    "utf8",
  );
  const sourcePath = path.join(directory, "source.csv");
  const outputPath = path.join(directory, "custom-output.csv");
  writeFileSync(sourcePath, sourceBytes);
  return {
    sourceBytes,
    sourcePath,
    outputPath,
    sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"),
  };
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe("drug item subset derivation CLI flags", () => {
  it("accepts custom source, expected hash, expected row count, and output path", async () => {
    const fixture = createFixture();
    const result = await deriveSubsetFromArguments([
      "--source",
      fixture.sourcePath,
      "--expect-sha256",
      fixture.sourceSha256,
      "--expect-rows",
      "1",
      "--out",
      fixture.outputPath,
    ]);

    expect(result).toMatchObject({
      mode: "write-once",
      source: { sha256: fixture.sourceSha256, dataRows: 1, fields: 20 },
      subset: { dataRows: 1 },
    });
    expect(existsSync(fixture.outputPath)).toBe(true);
  });

  it("keeps the custom expected-hash gate fail closed with zero output", async () => {
    const fixture = createFixture();
    const mismatchedSha256 = `${fixture.sourceSha256.slice(0, -1)}${
      fixture.sourceSha256.endsWith("0") ? "1" : "0"
    }`;
    await expect(
      deriveSubsetFromArguments([
        "--source",
        fixture.sourcePath,
        "--expect-sha256",
        mismatchedSha256,
        "--expect-rows",
        "1",
        "--out",
        fixture.outputPath,
      ]),
    ).rejects.toMatchObject({ code: "hash_mismatch" });
    expect(existsSync(fixture.outputPath)).toBe(false);
  });
});
