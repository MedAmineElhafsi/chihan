"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MessageCircle } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { startConversation } from "@/lib/chat-actions";
import { Button } from "@/components/ui/button";
import { UpgradeDialog } from "@/components/people/upgrade-dialog";
import { cn } from "@/lib/utils";

export function MessageButton({
  targetUserId,
  size = "default",
  variant = "default",
  className,
}: {
  targetUserId: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive";
  className?: string;
}) {
  const t = useTranslations("Chat");
  const router = useRouter();
  const [pending, startT] = useTransition();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  function onClick() {
    startT(async () => {
      const res = await startConversation(targetUserId);
      if (res.ok) {
        router.push(`/messages/${res.conversationId}`);
      } else if ("locked" in res && res.locked) {
        setUpgradeOpen(true);
      }
    });
  }

  return (
    <>
      <Button
        onClick={onClick}
        disabled={pending}
        size={size}
        variant={variant}
        className={cn("gap-1.5", className)}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MessageCircle className="size-4" />
        )}
        {t("message")}
      </Button>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
