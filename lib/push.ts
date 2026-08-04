import "server-only";

import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

export type PushPayload = {
  title: string;
  body: string;
  link?: string;
};

function vapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

async function loadWebPush(): Promise<typeof import("web-push") | null> {
  if (!vapidConfigured()) return null;
  try {
    const mod = await import("web-push");
    const webpush = mod.default ?? mod;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    return webpush as typeof import("web-push");
  } catch {
    console.warn("[push] web-push package not installed — skipping send");
    return null;
  }
}

/** Persist a browser push subscription for the current user. */
export async function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deletePushSubscription(
  endpoint: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Best-effort web push to all of a user's registered devices. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  const webpush = await loadWebPush();
  if (!webpush) return;
  try {
    const svc = createServiceClient();
    const { data: subs } = await svc
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (!subs?.length) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (row) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: String(row.endpoint),
              keys: {
                p256dh: String(row.p256dh),
                auth: String(row.auth),
              },
            },
            body
          );
        } catch (err: unknown) {
          const status =
            err && typeof err === "object" && "statusCode" in err
              ? Number((err as { statusCode: number }).statusCode)
              : 0;
          if (status === 404 || status === 410) {
            await svc.from("push_subscriptions").delete().eq("id", row.id);
          }
        }
      })
    );
  } catch (err) {
    console.error("[push] send failed:", err);
  }
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  const unique = [...new Set(userIds)];
  await Promise.all(unique.map((id) => sendPushToUser(id, payload)));
}
