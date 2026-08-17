"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff, Loader2 } from "lucide-react";

import { subscribePush, unsubscribePush } from "@/lib/push-actions";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Push support never changes at runtime; read it SSR-safely, no state needed. */
const subscribeNoop = () => () => {};
const getSupportSnapshot = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;
const getSupportServerSnapshot = () => false;

export function PushEnableButton() {
  const t = useTranslations("Pwa");
  const [enabled, setEnabled] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // NEXT_PUBLIC_* is inlined at build time, so this is plain derived data.
  const configured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const supported = useSyncExternalStore(
    subscribeNoop,
    getSupportSnapshot,
    getSupportServerSnapshot
  );

  useEffect(() => {
    if (!supported || !configured) return;
    // setState inside the promise callback is fine — it's the synchronous
    // setState in an effect body that causes cascading renders.
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(Boolean(sub)))
      .catch(() => setEnabled(false));
  }, [supported, configured]);

  if (!configured) {
    return (
      <p className="text-sm text-muted-foreground">{t("pushNotConfigured")}</p>
    );
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">{t("pushUnsupported")}</p>
    );
  }

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (enabled) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await unsubscribePush(sub.endpoint);
            await sub.unsubscribe();
          }
          setEnabled(false);
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setError(t("pushDenied"));
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        });
        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          setError(t("pushError"));
          return;
        }
        const res = await subscribePush({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setEnabled(true);
      } catch {
        setError(t("pushError"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-fit gap-2"
        disabled={pending}
        onClick={toggle}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : enabled ? (
          <BellOff className="size-4" />
        ) : (
          <Bell className="size-4" />
        )}
        {enabled ? t("pushDisable") : t("pushEnable")}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
