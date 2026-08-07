import { ITEM_DATASET_VERSION, ITEM_RECORDS } from "@nhi-cv/domain";
import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_ITEM_NOT_FOUND_TEXT,
  CLINICIAN_DESKTOP_BREAKPOINT,
  getClinicianLayoutMode,
  resolveAnnouncementItemSource
} from "./drug-item-ui";

describe("clinician drug-item integration helpers", () => {
  it("switches layout at the authorized 768px breakpoint", () => {
    expect(CLINICIAN_DESKTOP_BREAKPOINT).toBe(768);
    expect(getClinicianLayoutMode(767)).toBe("mobile");
    expect(getClinicianLayoutMode(768)).toBe("desktop");
    expect(getClinicianLayoutMode(1200)).toBe("desktop");
  });

  it("returns a separately versioned announcement row for an exact shared code", () => {
    const item = ITEM_RECORDS[0]!;
    const view = resolveAnnouncementItemSource(item.nhiCode);
    expect(ITEM_DATASET_VERSION).toBe("nhi-lipid-2026-09-01-r1");
    expect(view.status).toBe("FOUND");
    if (view.status === "FOUND") expect(view.item).toBe(item);
    expect(Object.isFrozen(view)).toBe(true);
  });

  it("uses the fixed no-row text when the exact code is absent", () => {
    expect(resolveAnnouncementItemSource("ZZZZZZZZZZ")).toEqual({
      status: "NOT_FOUND",
      message: ANNOUNCEMENT_ITEM_NOT_FOUND_TEXT
    });
  });

  it("does not attach a near-code announcement row", () => {
    const code = ITEM_RECORDS[0]!.nhiCode;
    const nearCode = `${code.slice(0, -1)}${code.endsWith("0") ? "1" : "0"}`;
    expect(resolveAnnouncementItemSource(nearCode)).toEqual({
      status: "NOT_FOUND",
      message: ANNOUNCEMENT_ITEM_NOT_FOUND_TEXT
    });
  });
});
