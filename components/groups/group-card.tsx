import { MapPin, Users } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { CommunityGroup } from "@/types/group";

export function GroupCard({
  group,
  joinedLabel,
  membersLabel,
  distanceLabel,
  isJoined,
}: {
  group: CommunityGroup;
  joinedLabel: string;
  membersLabel: string;
  distanceLabel?: string | null;
  isJoined?: boolean;
}) {
  const place = [group.city, group.country].filter(Boolean).join(", ");

  return (
    <Link
      href={`/groups/${group.id}`}
      className="glass flex flex-col gap-3 rounded-2xl p-5 transition-colors hover:bg-accent/30"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold leading-snug">
          {group.name}
        </h2>
        {isJoined && (
          <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[0.7rem] font-medium text-gold">
            {joinedLabel}
          </span>
        )}
      </div>
      {group.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {group.description}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {place && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5 text-gold" />
            {place}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5 text-gold" />
          {membersLabel}
        </span>
        {distanceLabel && <span>{distanceLabel}</span>}
      </div>
    </Link>
  );
}
