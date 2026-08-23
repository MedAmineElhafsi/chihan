"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { createGroup } from "@/lib/group-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function GroupForm() {
  const t = useTranslations("Groups");
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  // Private by default — a group made without a thought about privacy
  // should not be the one that leaks.
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await createGroup({ name, description, city, country, isPrivate });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/groups/${res.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-lg flex-col gap-5">
      <div className="space-y-2">
        <Label htmlFor="name">{t("fieldName")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          placeholder={t("namePlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t("fieldDescription")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder={t("descriptionPlaceholder")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">{t("fieldCity")}</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            placeholder="Berlin"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">{t("fieldCountry")}</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={80}
            placeholder="Germany"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <legend className="label-mono px-1">{t("privacyLegend")}</legend>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="privacy"
            checked={isPrivate}
            onChange={() => setIsPrivate(true)}
            className="mt-1 accent-cyan"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-air">{t("privateLabel")}</span>
            <span className="text-xs text-muted-foreground">{t("privateHint")}</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="privacy"
            checked={!isPrivate}
            onChange={() => setIsPrivate(false)}
            className="mt-1 accent-cyan"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-air">{t("publicLabel")}</span>
            <span className="text-xs text-muted-foreground">{t("publicHint")}</span>
          </span>
        </label>
      </fieldset>

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className="gap-2 self-start">
        {loading && <Loader2 className="size-4 animate-spin" />}
        {t("create")}
      </Button>
    </form>
  );
}
