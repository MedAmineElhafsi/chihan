import "server-only";

import { PROFILE_COLUMNS, PROFILE_COLUMNS_BASE } from "@/types/profile";

/**
 * Optional columns arrive in later migrations. Until applied, selecting them
 * fails every profile query — detect once and fall back for the process.
 */
let useBaseColumns: boolean | null = null;

export function profileColumns(): string {
  return useBaseColumns === true ? PROFILE_COLUMNS_BASE : PROFILE_COLUMNS;
}

/** True when an optional profile column is missing (caller should retry). */
export function isMissingProfession(
  error: { message?: string; code?: string } | null
): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  const missingCol =
    (/profession|is_verified|origin_region|interests|looking_for|offering/i.test(
      msg
    ) &&
      (error.code === "42703" ||
        /does not exist|schema cache|column/i.test(msg))) ||
    false;
  if (missingCol) useBaseColumns = true;
  return missingCol;
}
