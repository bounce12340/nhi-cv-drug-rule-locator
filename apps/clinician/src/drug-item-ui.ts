import {
  ITEM_DATASET_EFFECTIVE_FROM,
  findAnnouncementItemByExactCode,
  getDrugItemAnnouncementMembership,
  type DrugItemAnnouncementMembership,
  type DrugItemRecord
} from "@nhi-cv/domain";

export const CLINICIAN_DESKTOP_BREAKPOINT = 768;
export const DRUG_ITEM_MASTER_SNAPSHOT_DATE = "2026-08-06" as const;
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

export type AnnouncementPriceComparison = Readonly<{
  priceBefore: string;
  priceAfter: string;
  effectiveDate: string;
  coverageRule: string;
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

/** Builds a comparison exclusively from the four announcement-row fields. */
export function resolveAnnouncementPriceComparison(
  nhiCode: string
): AnnouncementPriceComparison | undefined {
  const source = resolveAnnouncementItemSource(nhiCode);
  if (source.status !== "FOUND" || !source.membership.priceChanged) return undefined;

  const { priceBefore, priceAfter, effectiveDate, coverageRule } = source.item;
  if (
    priceBefore === undefined ||
    priceAfter === undefined ||
    effectiveDate === undefined ||
    coverageRule === undefined
  ) {
    return undefined;
  }

  return Object.freeze({ priceBefore, priceAfter, effectiveDate, coverageRule });
}

export function shouldShowMasterSnapshotNotice(asOfDate: string, nhiCode: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(asOfDate) &&
    asOfDate >= ITEM_DATASET_EFFECTIVE_FROM &&
    getDrugItemAnnouncementMembership(nhiCode).priceChanged
  );
}
