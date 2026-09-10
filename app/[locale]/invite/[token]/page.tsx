import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserPlus } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getInviteByToken } from "@/lib/invites";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Invite");

  const invite = await getInviteByToken(token);
  // This is an async Server Component rendered per-request, so reading the
  // clock here is correct — the purity rule targets client components.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const expired =
    !invite ||
    invite.status !== "pending" ||
    new Date(invite.expires_at).getTime() < now;

  if (!invite || expired) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-13rem)] w-full max-w-md flex-col justify-center px-4 py-12">
        <Card className="panel-solid border-border/70 shadow-elev-3">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">
              {t("invalidTitle")}
            </CardTitle>
            <CardDescription>{t("invalidBody")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/signup">{t("signupAnyway")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const name = invite.inviter.displayName?.trim() || t("someone");
  const initial = name.charAt(0).toUpperCase() || "?";
  const signupHref = `/signup?email=${encodeURIComponent(invite.email)}`;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-13rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <Card className="panel-solid animate-rise border-border/70 shadow-elev-3 ring-1 ring-cyan/20">
        <CardHeader className="items-center text-center">
          <Avatar className="mb-2 size-16 ring-2 ring-cyan/50">
            {invite.inviter.avatarUrl && (
              <AvatarImage src={invite.inviter.avatarUrl} alt={name} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-cyan to-depth-4 text-xl text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="font-display text-2xl">
            {t("landingTitle")}
          </CardTitle>
          <CardDescription>
            {t("landingBody", { name })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground" dir="ltr">
            {t("emailHint", { email: invite.email })}
          </p>
          <Button asChild className="glow w-full gap-2">
            <Link href={signupHref}>
              <UserPlus className="size-4" />
              {t("signupCta")}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("haveAccount")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
