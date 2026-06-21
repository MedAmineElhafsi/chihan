import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Basic GDPR data export — the signed-in user's own data as JSON. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const [profile, listings, posts, reviews, comments] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id),
    supabase.from("listings").select("*").eq("owner_user_id", user.id),
    supabase.from("posts").select("*").eq("author_id", user.id),
    supabase.from("reviews").select("*").eq("author_id", user.id),
    supabase.from("post_comments").select("*").eq("author_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile: profile.data ?? [],
    listings: listings.data ?? [],
    posts: posts.data ?? [],
    reviews: reviews.data ?? [],
    comments: comments.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="cihan-data-${user.id}.json"`,
    },
  });
}
