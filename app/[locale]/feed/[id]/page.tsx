// FEATURE-DISABLED when `feed` is off in lib/features.ts, like the feed.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { isEnabled } from "@/lib/features";
import { getCurrentUser } from "@/lib/auth";
import { getPost } from "@/lib/feed";
import { preview, snippet } from "@/lib/og";
import { PostCard } from "@/components/feed/post-card";

/**
 * One post or event on its own — the page a shared link opens, and the one
 * WhatsApp reads to draw the preview: an event shows its title, date and
 * place; a post shows who wrote it and how it starts.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const post = await getPost(id);
  if (!post) return {};

  const t = await getTranslations({ locale, namespace: "Feed" });
  const author = post.author.displayName ?? t("member");
  const title = post.event_title || author;
  const when = post.event_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        new Date(post.event_at)
      )
    : null;
  const description =
    [when, post.event_location, snippet(post.body, 140)]
      .filter(Boolean)
      .join(" · ") || undefined;

  return {
    title,
    description,
    ...preview({
      title,
      description,
      image: post.media[0] ?? null,
      locale,
      type: "article",
    }),
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  if (!isEnabled("feed")) notFound();

  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const post = await getPost(id, user?.id);
  if (!post) notFound();

  const tNav = await getTranslations("Nav");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:max-w-4xl lg:py-8">
      <Link
        href="/feed"
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        ← {tNav("explore")}
      </Link>
      <div className="mt-4">
        <PostCard
          item={post}
          currentUserId={user?.id ?? null}
          canInteract={!!user}
          shareable
        />
      </div>
    </div>
  );
}
