"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, LogIn, LogOut, Users } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { joinGroup, leaveGroup } from "@/lib/group-actions";
import { Button } from "@/components/ui/button";

export function JoinLeaveButton({
  groupId,
  isMember,
  isOwner,
  isAuthenticated,
}: {
  groupId: string;
  isMember: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("Groups");
  const router = useRouter();
  const [member, setMember] = useState(isMember);
  const [pending, startT] = useTransition();

  if (!isAuthenticated) {
    return (
      <Button asChild className="gap-2">
        <Link href="/login">
          <LogIn className="size-4" />
          {t("signInToJoin")}
        </Link>
      </Button>
    );
  }

  if (isOwner) {
    return (
      <Button variant="secondary" disabled className="gap-2">
        <Users className="size-4" />
        {t("youOwn")}
      </Button>
    );
  }

  function toggle() {
    startT(async () => {
      if (member) {
        const res = await leaveGroup(groupId);
        if (res.ok) {
          setMember(false);
          router.refresh();
        }
      } else {
        const res = await joinGroup(groupId);
        if (res.ok) {
          setMember(true);
          router.refresh();
        }
      }
    });
  }

  return (
    <Button
      onClick={toggle}
      disabled={pending}
      variant={member ? "outline" : "default"}
      className="gap-2"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : member ? (
        <LogOut className="size-4" />
      ) : (
        <Users className="size-4" />
      )}
      {member ? t("leave") : t("join")}
    </Button>
  );
}
