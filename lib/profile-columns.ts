import "server-only";

import { PROFILE_COLUMNS, PROFILE_COLUMNS_BASE } from "@/types/profile";

/**
 * `profession` arrives in migration 0008. Until that migration is applied the
 * column doesn't exist and selecting it would fail every profile query, making
 * the app look broken. We detect that once and fall back for the rest of the
 * process, so the site keeps working pre-migration.
 */
let hasProfession: boolean | null = null;

export function profileColumns(): string {
  return hasProfession === false ? PROFILE_COLUMNS_BASE : PROFILE_COLUMNS;
}

/** True when the error was a missing `profession` column (caller should retry). */
export function isMissingProfession(
  error: { message?: string; code?: string } | null
): boolean {
  if (!error) return false;
  const missing =
    /profession/i.test(error.message ?? "") &&
    (error.code === "42703" ||
      /does not exist|schema cache|column/i.test(error.message ?? ""));
  if (missing) hasProfession = false;
  return missing;
}
