import { ITEM_DATASET_VERSION, ITEM_RECORDS } from "@nhi-cv/domain";
import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_ITEM_NOT_FOUND_TEXT,
  CLINICIAN_DESKTOP_BREAKPOINT,
  DRUG_ITEM_MASTER_SNAPSHOT_DATE,
  getClinicianLayoutMode,
  isAfterMasterSnapshot,
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

describe("dates the master snapshot cannot speak to", () => {
  it("says nothing for the snapshot date itself or anything before it", () => {
    expect(isAfterMasterSnapshot(DRUG_ITEM_MASTER_SNAPSHOT_DATE)).toBe(false);
    expect(isAfterMasterSnapshot("2026-08-05")).toBe(false);
    expect(isAfterMasterSnapshot("2024-04-01")).toBe(false);
  });

  it("flags every date after it, including ones the lookup still answers", () => {
    // The master's last price period runs to 9999-12-31, so these all return a
    // price. The point is that the price is the snapshot's last entry, not a
    // statement about the date asked for.
    for (const date of ["2026-08-07", "2026-09-01", "2030-01-01", "9999-12-31"]) {
      expect(isAfterMasterSnapshot(date), date).toBe(true);
    }
  });

  it("does not flag a malformed date, which fails closed elsewhere", () => {
    for (const date of ["", "not-a-date", "2026-8-7", "9999/12/31"]) {
      expect(isAfterMasterSnapshot(date), date).toBe(false);
    }
  });
});
