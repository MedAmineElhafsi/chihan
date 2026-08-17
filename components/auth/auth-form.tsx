"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/env";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function AuthForm({
  mode,
  defaultEmail = "",
}: {
  mode: "login" | "signup";
  defaultEmail?: string;
}) {
  const t = useTranslations("Auth");
  const tc = useTranslations("Common");
  const locale = useLocale();

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supabaseConfigured) {
      setError(t("notConfigured"));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Hard navigation so auth cookies are always sent on the next request
        // (avoids soft-nav races when the Auth API is slow/timeouts).
        window.location.assign(`/${locale}/dashboard`);
        return;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}/dashboard`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          window.location.assign(`/${locale}/dashboard`);
          return;
        } else {
          setSent(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    if (!supabaseConfigured) {
      setError(t("notConfigured"));
      return;
    }
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/dashboard`,
        },
      });
      if (oauthError) throw oauthError;
      // The browser is redirected to Google on success.
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
      setGoogleLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-cyan">
          <MailCheck className="size-6" />
        </div>
        <h3 className="font-display text-lg font-semibold">
          {t("checkEmailTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("checkEmailBody", { email })}
        </p>
      </div>
    );
  }

  const busy = loading || googleLoading;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        className="h-11 gap-2.5"
        onClick={handleGoogle}
        disabled={busy}
      >
        {googleLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon className="size-4" />
        )}
        {t("continueWithGoogle")}
      </Button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {tc("or")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={6}
          dir="ltr"
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2 overflow-hidden rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Button type="submit" className="h-11" disabled={busy}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {isLogin ? t("signInCta") : t("signUpCta")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? t("noAccount") : t("haveAccount")}{" "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-medium text-cyan hover:underline"
        >
          {isLogin ? t("signUpLink") : t("signInLink")}
        </Link>
      </p>
    </form>
  );
}
