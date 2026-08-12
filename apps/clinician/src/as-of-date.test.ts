import { ITEM_DATASET_EFFECTIVE_FROM } from "@nhi-cv/domain";
import { describe, expect, it } from "vitest";
import { isIsoDate, resolveAsOfDatePresets, toIsoDate, todayIso } from "./as-of-date";

describe("as-of date", () => {
  it("formats from local calendar components, not UTC", () => {
    // 00:30 on 2026-08-11 in Taiwan (UTC+8) is still 2026-08-10 in UTC.
    // toISOString() would report the previous day, and only between midnight and 08:00.
    const localMidnightish = new Date(2026, 7, 11, 0, 30, 0);
    expect(toIsoDate(localMidnightish)).toBe("2026-08-11");
    expect(toIsoDate(new Date(2026, 7, 11, 23, 59, 59))).toBe("2026-08-11");
  });

  it("pads single-digit months and days", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toIsoDate(new Date(2026, 8, 1))).toBe("2026-09-01");
  });

  it("produces a date the engine accepts", () => {
    expect(isIsoDate(todayIso(new Date(2026, 7, 11)))).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-8-11")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  it("offers today and the announcement effective date", () => {
    const presets = resolveAsOfDatePresets(ITEM_DATASET_EFFECTIVE_FROM, new Date(2026, 7, 11));
    expect(presets.map((preset) => preset.key)).toEqual(["today", "announcement"]);
    expect(presets[0]!.value).toBe("2026-08-11");
    expect(presets[1]!.value).toBe("2026-09-01");
  });

  it("keeps offering the announcement date once it is in force", () => {
    // After 2026-09-01 the two presets can coincide; the announcement preset stays
    // so the label still names the date a clinician is reasoning about.
    const presets = resolveAsOfDatePresets(ITEM_DATASET_EFFECTIVE_FROM, new Date(2026, 11, 25));
    expect(presets[0]!.value).toBe("2026-12-25");
    expect(presets[1]!.value).toBe("2026-09-01");
  });

  it("returns frozen values so a caller cannot rewrite a preset", () => {
    const presets = resolveAsOfDatePresets(ITEM_DATASET_EFFECTIVE_FROM);
    expect(Object.isFrozen(presets)).toBe(true);
    expect(Object.isFrozen(presets[0])).toBe(true);
  });

});
