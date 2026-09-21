import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { GlobePlaceholder } from "@/components/globe/globe-placeholder";

/*
 * What each section looks like before its data arrives.
 *
 * Every skeleton copies its page's container and spacing exactly, so the real
 * page replaces it in place instead of jumping. What the page knows without
 * asking the database — its title, its subtitle — is shown for real; only
 * what depends on data is a placeholder. When a page changes shape, change
 * its skeleton with it: each one names the page it mirrors.
 */

/** The one sentence assistive tech hears; the blocks themselves stay silent. */
function Status() {
  const t = useTranslations("Loading");
  return (
    <p role="status" className="sr-only">
      {t("label")}
    </p>
  );
}

/*
 * The layout marks the viewer as a member or a visitor, so a skeleton can
 * promise only what that viewer will actually get — a visitor is never shown
 * a composer that will not arrive. Pure CSS, so server and client agree.
 */
function MemberOnly({ children }: { children: ReactNode }) {
  return (
    <div className="hidden group-data-[viewer=member]/viewer:contents">
      {children}
    </div>
  );
}

function VisitorOnly({ children }: { children: ReactNode }) {
  return (
    <div className="hidden group-data-[viewer=visitor]/viewer:contents">
      {children}
    </div>
  );
}

/** Chips whose labels are known but whose state is not. Widths are the
 *  English chips' measured widths, so the rows wrap where the real ones do
 *  and nothing below them moves when they arrive. */
function ChipRow({
  widths,
  className,
}: {
  widths: number[];
  className: string;
}) {
  return (
    <>
      {widths.map((w, i) => (
        <Skeleton key={i} className={className} style={{ width: w }} />
      ))}
    </>
  );
}

/** Every route without a skeleton of its own, sign-in included — unchanged
 *  in look from the spinner that used to be the only loading state. */
export function SpinnerLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Status />
      <Loader2
        aria-hidden="true"
        className="text-cyan size-7 animate-spin motion-reduce:animate-none"
      />
    </div>
  );
}

/** `/` — mirrors GlobeHome: the globe sits right of the hero on desktop.
 *  The hero copy keeps its own entrance when the page arrives. */
export function LandingLoading() {
  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
      <div className="absolute inset-0 lg:translate-x-[22%]">
        <GlobePlaceholder />
      </div>
    </div>
  );
}

/** `/explore` — mirrors ExploreClient: the globe, and the results panel where
 *  it will open. */
export function ExploreLoading() {
  const t = useTranslations("Explore");

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
      <GlobePlaceholder />

      {/* On a phone the panel is anchored to the bottom and fills to 55dvh
          once results arrive, so the skeleton takes that height too — a
          shorter one would put the heading 166px lower than it lands. */}
      <div className="panel-solid absolute inset-x-4 bottom-4 z-10 flex h-[55dvh] flex-col overflow-hidden rounded-md md:inset-x-auto md:start-4 md:top-4 md:bottom-auto md:h-auto md:w-[340px]">
        <div className="border-border/60 flex flex-col gap-3 border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg font-semibold">{t("title")}</h1>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ChipRow
              widths={[57, 81, 110, 87, 80]}
              className="h-[1.625rem] rounded-full"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One post, as PostCard lays it out. */
function PostSkeleton({ media = false }: { media?: boolean }) {
  return (
    <div className="social-surface overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 px-4 sm:px-5">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      {media && <Skeleton className="mt-3 h-64 w-full rounded-none" />}
      <div className="border-border/70 mt-3 grid grid-cols-2 gap-1 border-t px-2 py-1.5">
        <Skeleton className="mx-auto h-5 w-16" />
        <Skeleton className="mx-auto h-5 w-20" />
      </div>
    </div>
  );
}

/** `/feed` — mirrors the feed page's Posts tab. */
export function FeedLoading() {
  const t = useTranslations("Feed");
  const tNav = useTranslations("Nav");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:max-w-4xl lg:py-8">
      <Status />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {tNav("explore")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ChipRow widths={[43, 146]} className="h-[2.125rem] rounded-md" />
        </div>
      </div>

      <div className="border-border bg-card/40 mt-5 flex gap-1 rounded-lg border p-1">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-9 flex-1 rounded-md" />
        ))}
      </div>

      <MemberOnly>
        <div className="social-surface mt-4 flex gap-3.5 px-3 py-3 sm:px-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex w-[5rem] shrink-0 flex-col items-center gap-1.5"
            >
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        <div className="social-surface mt-3 flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex gap-2">
            <ChipRow widths={[72, 72, 88]} className="h-8 rounded-md" />
          </div>
          <Skeleton className="h-[5.5rem] w-full rounded-md" />
          <Skeleton className="h-10 w-24 self-end rounded-md" />
        </div>
      </MemberOnly>
      <VisitorOnly>
        <div className="social-surface mt-3 flex items-center justify-between gap-3 p-3.5">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </VisitorOnly>

      <div className="mt-3 flex flex-col gap-3">
        <PostSkeleton media />
        <PostSkeleton />
      </div>
    </div>
  );
}

/** `/reels` — one reel-shaped frame, where ReelsEmpty puts its own. Whether
 *  reels exist is exactly what is not known yet, so this promises the shape
 *  of a reel and no more: it matches the empty tab in place, and grows into
 *  the player when there are reels — growing reads as arriving, where a
 *  full-screen player shrinking to an empty frame would read as loss. */
export function ReelsLoading() {
  const t = useTranslations("Reels");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <Status />
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-air text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
      </div>
      <MemberOnly>
        <Skeleton className="h-10 w-full rounded-md" />
      </MemberOnly>
      <div className="flex flex-col items-center py-6">
        <div className="flex aspect-[9/16] w-40 items-center justify-center rounded-xl border border-[color:var(--border-strong)]">
          <Skeleton className="size-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** `/profile` — mirrors the owner's view of ProfileView and the two panels
 *  under it. Only members get here; a visitor is sent to sign in, so a
 *  visitor sees the plain spinner rather than a profile that is not theirs. */
export function ProfileLoading() {
  return (
    <>
      <MemberOnly>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
          <Status />
          <div className="panel overflow-hidden rounded-lg">
            <div className="h-28 bg-[radial-gradient(120%_140%_at_50%_-20%,color-mix(in_oklab,var(--cyan)_30%,transparent),transparent_70%)]" />
            <div className="px-6 pb-6">
              <div className="-mt-12 flex items-end justify-between gap-4">
                <Skeleton className="ring-card size-24 rounded-full ring-4" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <Skeleton className="mt-3 h-8 w-44" />
              <Skeleton className="mt-2 h-4 w-36" />
              <div className="mt-4 flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      </MemberOnly>
      <VisitorOnly>
        <SpinnerLoading />
      </VisitorOnly>
    </>
  );
}

/** One request, as RequestCard lays it out. */
function RequestSkeleton() {
  return (
    <div className="bg-depth-1 flex flex-col gap-3 p-5">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-4/5" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/** `/help` — mirrors the help board. Requests are members-only, so a visitor
 *  is shown the shape of the sentence that replaces them, not cards. */
export function HelpLoading() {
  const t = useTranslations("Help");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Status />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[0.6875rem] w-44" />
        <h1 className="font-display text-air text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-xl">{t("subtitle")}</p>
      </div>

      <div className="mt-8">
        <MemberOnly>
          <Skeleton className="h-12 w-48 rounded-md" />
        </MemberOnly>
        <VisitorOnly>
          <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-md p-5">
            <Skeleton className="h-4 w-64 max-w-full" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </VisitorOnly>
      </div>

      <div className="border-border mt-8 flex flex-col gap-3 border-b pb-5">
        <div className="flex flex-wrap gap-2">
          <ChipRow
            widths={[39, 96, 111, 77, 106, 85, 107, 84, 77, 104, 80]}
            className="h-[2.125rem] rounded-sm"
          />
        </div>
        <div className="flex gap-2">
          <ChipRow widths={[58, 81]} className="h-[2.125rem] rounded-sm" />
        </div>
      </div>

      <MemberOnly>
        <div className="bg-border mt-6 grid gap-px sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <RequestSkeleton key={i} />
          ))}
        </div>
      </MemberOnly>
      <VisitorOnly>
        <div className="flex flex-col items-center gap-3 py-20">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-72 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </VisitorOnly>
    </div>
  );
}

/** `/directory` — mirrors the directory grid with cards that have no photo,
 *  the common case and the shorter one, so the grid only ever grows. */
export function DirectoryLoading() {
  const t = useTranslations("Directory");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Status />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      <div className="-mx-4 mt-6 flex gap-2 overflow-hidden px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <ChipRow
          widths={[43, 124, 98, 109, 99, 128, 124, 84]}
          className="h-[2.125rem] shrink-0 rounded-full"
        />
      </div>

      <div className="mt-6 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="panel flex flex-col overflow-hidden rounded-lg"
          >
            <div className="h-0.5 w-full" />
            <div className="flex flex-col gap-2.5 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** `/messages` — mirrors ChatShell with no conversation open. Members only;
 *  a visitor is sent to sign in. */
export function MessagesLoading() {
  const t = useTranslations("Chat");

  return (
    <>
      <MemberOnly>
        <div className="flex h-[calc(100dvh-4rem)] w-full overflow-hidden">
          <Status />
          <aside className="border-border bg-card/40 flex w-full flex-col border-e md:w-[22rem]">
            <div className="border-border border-b px-4 py-3">
              <h1 className="font-display text-lg font-semibold">
                {t("title")}
              </h1>
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border-border/50 flex items-center gap-3 border-b px-3.5 py-3"
              >
                <Skeleton className="size-12 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </aside>
          <section className="bg-muted/15 hidden flex-1 flex-col md:flex">
            <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center">
              {t("selectConversation")}
            </div>
          </section>
        </div>
      </MemberOnly>
      <VisitorOnly>
        <SpinnerLoading />
      </VisitorOnly>
    </>
  );
}

/** `/search` — mirrors the search page before a query: the field is what
 *  arrives, so the field is what is shown. */
export function SearchLoading() {
  const t = useTranslations("Search");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Status />
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-sm" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}
