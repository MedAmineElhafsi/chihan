import "server-only";

import { createClient } from "./supabase/server";
import { filterAllowedNotifications } from "./blocks";
import type { AppNotification, NotificationType } from "@/types/notification";

export type CreateNotificationInput = {
  userId: string;
  actorId: string;
  type: NotificationType;
  entityId?: string | null;
  link: string;
};

/** Best-effort insert — never throws into the calling action. */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  await createNotifications([input]);
}

/** Batch insert (e.g. group chat → all other members). */
export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<void> {
  const selfFiltered = inputs.filter((i) => i.userId !== i.actorId);
  if (selfFiltered.length === 0) return;
  const rows = await filterAllowedNotifications(selfFiltered);
  if (rows.length === 0) return;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("notifications").insert(
      rows.map((input) => ({
        user_id: input.userId,
        actor_id: input.actorId,
        type: input.type,
        entity_id: input.entityId ?? null,
        link: input.link,
      }))
    );
    if (error) {
      console.error("[notifications] insert failed:", error.message);
    } else {
      // Best-effort web push (no-op if VAPID / web-push missing).
      const { sendPushToUser } = await import("./push");
      const titles: Record<string, string> = {
        message: "New message",
        group_message: "Group message",
        like: "New like",
        comment: "New comment",
      };
      await Promise.all(
        rows.map((r) =>
          sendPushToUser(r.userId, {
            title: titles[r.type] ?? "Cîhan",
            body: "Open Cîhan to see what’s new.",
            link: r.link,
          })
        )
      );
    }
  } catch (err) {
    console.error("[notifications] insert threw:", err);
  }
}

export async function listNotifications(
  userId: string,
  limit = 40
): Promise<AppNotification[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, actor_id, type, entity_id, link, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];

    const actorIds = [
      ...new Set(
        data
          .map((n) => n.actor_id as string | null)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const actors = new Map<
      string,
      { display_name: string | null; avatar_url: string | null }
    >();
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", actorIds);
      for (const p of profiles ?? []) {
        actors.set(String(p.user_id), {
          display_name: (p.display_name as string | null) ?? null,
          avatar_url: (p.avatar_url as string | null) ?? null,
        });
      }
    }

    const groupIds = [
      ...new Set(
        data
          .filter(
            (n) =>
              (n.type === "group_message" ||
                String(n.link ?? "").startsWith("/groups/")) &&
              n.entity_id
          )
          .map((n) => String(n.entity_id))
      ),
    ];
    const groupNames = new Map<string, string>();
    if (groupIds.length > 0) {
      const { data: groups } = await supabase
        .from("community_groups")
        .select("id, name")
        .in("id", groupIds);
      for (const g of groups ?? []) {
        groupNames.set(String(g.id), String(g.name));
      }
    }

    return data.map((n) => {
      const actor = n.actor_id ? actors.get(String(n.actor_id)) : undefined;
      const type = n.type as NotificationType;
      const link = String(n.link ?? "/");
        const isGroup =
          type === "group_message" || link.startsWith("/groups/");
        return {
          id: String(n.id),
          user_id: String(n.user_id),
          actor_id: (n.actor_id as string | null) ?? null,
          type,
          entity_id: (n.entity_id as string | null) ?? null,
          link,
          read_at: (n.read_at as string | null) ?? null,
          created_at: String(n.created_at),
          actor_name: actor?.display_name ?? null,
          actor_avatar: actor?.avatar_url ?? null,
          context_label:
            isGroup && n.entity_id
              ? (groupNames.get(String(n.entity_id)) ?? null)
              : null,
        };
    });
  } catch {
    return [];
  }
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
