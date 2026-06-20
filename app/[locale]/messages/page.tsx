import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { getConversations } from "@/lib/chat";
import { ChatShell } from "@/components/chat/chat-shell";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const conversations = await getConversations(user.id);

  return (
    <ChatShell
      currentUserId={user.id}
      conversations={conversations}
      activeId={null}
      partnerName={null}
      partnerAvatar={null}
      partnerUserId={null}
      initialMessages={[]}
      initialOtherLastRead={null}
    />
  );
}
