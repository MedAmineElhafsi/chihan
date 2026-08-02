"use client";

import { useEffect } from "react";

import { markProfileViewed } from "@/lib/view-actions";

/** Records a profile view once on mount (authenticated visitors only). */
export function RecordProfileView({ profileId }: { profileId: string }) {
  useEffect(() => {
    void markProfileViewed(profileId);
  }, [profileId]);
  return null;
}
