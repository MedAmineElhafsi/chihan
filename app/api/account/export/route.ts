import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** GDPR data export — the signed-in user's own data as JSON. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const uid = user.id;

  const [
    profile,
    listings,
    posts,
    reviews,
    comments,
    likes,
    rsvps,
    blocks,
    mutes,
    groupMemberships,
    ownedGroups,
    notifications,
    viewsAsOwner,
    viewsAsViewer,
    reports,
    subscriptions,
    usage,
    pushSubs,
    stories,
    invites,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", uid),
    supabase.from("listings").select("*").eq("owner_user_id", uid),
    supabase.from("posts").select("*").eq("author_id", uid),
    supabase.from("reviews").select("*").eq("author_id", uid),
    supabase.from("post_comments").select("*").eq("author_id", uid),
    supabase.from("post_likes").select("*").eq("user_id", uid),
    supabase.from("event_rsvps").select("*").eq("user_id", uid),
    supabase.from("user_blocks").select("*").eq("blocker_id", uid),
    supabase.from("user_mutes").select("*").eq("muter_id", uid),
    supabase.from("group_members").select("*").eq("user_id", uid),
    supabase.from("community_groups").select("*").eq("owner_id", uid),
    supabase.from("notifications").select("*").eq("user_id", uid),
    supabase
      .from("profile_views")
      .select("*")
      .in(
        "profile_id",
        (
          await supabase.from("profiles").select("id").eq("user_id", uid)
        ).data?.map((p) => p.id) ?? []
      ),
    supabase.from("profile_views").select("*").eq("viewer_user_id", uid),
    supabase.from("reports").select("*").eq("reporter_id", uid),
    supabase.from("subscriptions").select("*").eq("user_id", uid),
    supabase.from("usage_events").select("*").eq("user_id", uid),
    supabase.from("push_subscriptions").select("id, endpoint, created_at").eq("user_id", uid),
    supabase.from("stories").select("*").eq("author_id", uid),
    supabase.from("app_invites").select("*").eq("inviter_id", uid),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile: profile.data ?? [],
    listings: listings.data ?? [],
    posts: posts.data ?? [],
    reviews: reviews.data ?? [],
    comments: comments.data ?? [],
    likes: likes.data ?? [],
    event_rsvps: rsvps.data ?? [],
    blocks: blocks.data ?? [],
    mutes: mutes.data ?? [],
    group_memberships: groupMemberships.data ?? [],
    owned_groups: ownedGroups.data ?? [],
    notifications: notifications.data ?? [],
    profile_views_received: viewsAsOwner.data ?? [],
    profile_views_made: viewsAsViewer.data ?? [],
    reports_filed: reports.data ?? [],
    subscriptions: subscriptions.data ?? [],
    usage_events: usage.data ?? [],
    push_subscriptions: pushSubs.data ?? [],
    stories: stories.data ?? [],
    invites_sent: invites.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="cihan-data-${user.id}.json"`,
    },
  });
}
