import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const workflow = readFileSync(
  path.join(repositoryRoot, ".github", "workflows", "drug-item-refresh.yml"),
  "utf8",
);

describe("drug item refresh workflow safety boundary", () => {
  it("uses minimum declared permissions, artifact-only payload, and metadata-only PR paths", () => {
    expect(workflow).toMatch(/permissions:\n  contents: write\n  pull-requests: write\n/u);
    expect(workflow).toContain('cron: "17 3 2 * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("retention-days: 90");
    expect(workflow).toContain("draft: true");
    expect(workflow).toContain("scratchpad/drug-item-refresh/drug-items-lipid.csv");
    expect(workflow).not.toContain("data/governed/");
    expect(workflow).not.toMatch(/(^|\s)git(\s|$)/mu);

    const addPaths = workflow.match(/          add-paths: \|\n((?:            .+\n)+)/u)?.[1];
    expect(addPaths?.trim().split("\n").map((line) => line.trim())).toEqual([
      "docs/source-register/drug-item-master.registry.json",
      "docs/source-register/nhi-drug-item-master-20260806.md",
      "docs/stage3/drug-item-refresh-${{ steps.check.outputs.fetched_at }}.md",
    ]);
  });
});
