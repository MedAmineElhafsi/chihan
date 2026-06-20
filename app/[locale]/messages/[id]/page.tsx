import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import {
  getConversationPartner,
  getConversations,
  getMessages,
} from "@/lib/chat";
import { ChatShell } from "@/components/chat/chat-shell";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const [conversations, messages, partnerInfo] = await Promise.all([
    getConversations(user.id),
    getMessages(id),
    getConversationPartner(id, user.id),
  ]);

  // Not a participant (or unknown id) → back to the list.
  if (!conversations.some((c) => c.id === id)) {
    redirect(`/${locale}/messages`);
  }

  return (
    <ChatShell
      currentUserId={user.id}
      conversations={conversations}
      activeId={id}
      partnerName={partnerInfo.partner?.displayName ?? null}
      partnerAvatar={partnerInfo.partner?.avatarUrl ?? null}
      partnerUserId={partnerInfo.partner?.userId ?? null}
      initialMessages={messages}
      initialOtherLastRead={partnerInfo.otherLastReadAt}
    />
  );
}
