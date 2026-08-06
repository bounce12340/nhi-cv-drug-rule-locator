import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  deriveSubsetFile,
  hasExactTargetChapter,
  matchesNaiveSubstring,
} from "../drug-item-subset-derive.mjs";

describe("drug-item subset exact chapter-token filter", () => {
  it("includes a single exact 2.6.1. token", () => {
    expect(hasExactTargetChapter("2.6.1.")).toBe(true);
  });

  it("includes an exact token from a comma-delimited multi-value field", () => {
    expect(hasExactTargetChapter("2.6.1.,2.6.2.")).toBe(true);
  });

  it("excludes 8.2.6.1. even though substring matching would include it", () => {
    expect(matchesNaiveSubstring("8.2.6.1.")).toBe(true);
    expect(hasExactTargetChapter("8.2.6.1.")).toBe(false);
  });

  it("excludes other chapters that only contain the same numeric sequence", () => {
    for (const chapter of ["1.3.2.6.", "4.2.6.", "6.2.6."]) {
      expect(hasExactTargetChapter(chapter)).toBe(false);
    }
  });

  it("excludes the adjacent 2.6.4. chapter", () => {
    expect(hasExactTargetChapter("2.6.4.")).toBe(false);
  });

  it("excludes an empty chapter field", () => {
    expect(hasExactTargetChapter("")).toBe(false);
  });

  it("trims each token before exact comparison", () => {
    expect(hasExactTargetChapter(" 8.1. ,  2.6.3.  ")).toBe(true);
  });

  it("fails closed on a source hash mismatch without creating output", async () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "drug-item-subset-test-"));
    const syntheticSource = path.join(temporaryDirectory, "source.csv");
    const syntheticOutput = path.join(temporaryDirectory, "subset.csv");
    const syntheticBytes = Buffer.from("\uFEFFchapter\n2.6.1.\n", "utf8");
    writeFileSync(syntheticSource, syntheticBytes);

    try {
      const actualHash = createHash("sha256").update(syntheticBytes).digest("hex");
      const mismatchedHash = `${actualHash.slice(0, -1)}${actualHash.endsWith("0") ? "1" : "0"}`;
      await expect(
        deriveSubsetFile({
          inputPath: syntheticSource,
          derivedPath: syntheticOutput,
          expectedSha256: mismatchedHash,
          expectedHeaders: ["chapter"],
          expectedDataRows: 1,
        }),
      ).rejects.toMatchObject({ code: "hash_mismatch" });
      expect(existsSync(syntheticOutput)).toBe(false);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
