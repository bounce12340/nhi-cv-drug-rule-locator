import {
  findAnnouncementItemByExactCode,
  getDrugItemAnnouncementMembership,
  type DrugItemAnnouncementMembership,
  type DrugItemRecord
} from "@nhi-cv/domain";

export const CLINICIAN_DESKTOP_BREAKPOINT = 768;
export const ANNOUNCEMENT_ITEM_NOT_FOUND_TEXT =
  "此主檔代碼未列於 2026-09-01 公告資料集。" as const;

export type ClinicianLayoutMode = "desktop" | "mobile";

export type AnnouncementItemSourceView =
  | Readonly<{
      status: "FOUND";
      item: DrugItemRecord;
      membership: DrugItemAnnouncementMembership;
    }>
  | Readonly<{
      status: "NOT_FOUND";
      message: typeof ANNOUNCEMENT_ITEM_NOT_FOUND_TEXT;
    }>;

export function getClinicianLayoutMode(width: number): ClinicianLayoutMode {
  return Number.isFinite(width) && width >= CLINICIAN_DESKTOP_BREAKPOINT
    ? "desktop"
    : "mobile";
}

/** Resolves the separately displayed announcement row using an exact source code only. */
export function resolveAnnouncementItemSource(nhiCode: string): AnnouncementItemSourceView {
  const item = findAnnouncementItemByExactCode(nhiCode);
  if (item === undefined) {
    return Object.freeze({
      status: "NOT_FOUND",
      message: ANNOUNCEMENT_ITEM_NOT_FOUND_TEXT
    });
  }
  return Object.freeze({
    status: "FOUND",
    item,
    membership: getDrugItemAnnouncementMembership(nhiCode)
  });
}
