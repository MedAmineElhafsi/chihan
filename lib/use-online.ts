"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/env";

/**
 * Realtime presence: the set of profile ids currently online.
 *
 * Every open tab subscribes to one shared presence channel; signed-in members
 * with a profile also announce themselves on it (keyed by profile id, the same
 * id used by globe points and `/u/[id]`). No database table involved — presence
 * lives in the Realtime server and expires automatically when a tab closes.
 */
export function useOnlineProfiles(): Set<string> {
  const [online, setOnline] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    let cancelled = false;

    const channel = supabase.channel("online-members");

    channel.on("presence", { event: "sync" }, () => {
      const ids = new Set<string>();
      for (const entries of Object.values(channel.presenceState())) {
        for (const entry of entries as Array<{ profile_id?: string }>) {
          if (entry.profile_id) ids.add(entry.profile_id);
        }
      }
      setOnline(ids);
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED" || cancelled) return;
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.id && !cancelled) {
        await channel.track({ profile_id: profile.id });
      }
    });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return online;
}
