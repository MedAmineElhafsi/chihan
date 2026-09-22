"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { isAdmin } from "./moderation";
import { classifiedsReady } from "./schema-ready";
import { isEnabled } from "./features";
import {
  BOARD_PHOTO_BUCKET,
  CLASSIFIED_PHOTOS_MAX,
  HOUSING_TYPES,
  JOB_TYPES,
  PAY_UNITS,
  RENT_KINDS,
} from "@/types/classified";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const schema = z.object({
  kind: z.enum(["job", "housing"]),
  title: z.string().trim().min(6).max(140),
  description: z.string().trim().min(20).max(3000),
  city: z.string().trim().max(80).optional().default(""),
  district: z.string().trim().max(80).optional().default(""),
  housingType: z.string().optional(),
  rent: z.number().int().min(0).max(100000).optional().nullable(),
  rentKind: z.string().optional(),
  sizeM2: z.number().int().min(1).max(1000).optional().nullable(),
  rooms: z.number().min(0.5).max(20).optional().nullable(),
  availableFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  deposit: z.number().int().min(0).max(100000).optional().nullable(),
  employer: z.string().trim().max(120).optional().default(""),
  jobType: z.string().optional(),
  pay: z.number().int().min(0).max(100000).optional().nullable(),
  payUnit: z.string().optional(),
  languages: z.array(z.string().max(40)).max(4).optional().default([]),
  photos: z
    .array(z.string().max(160))
    .max(CLASSIFIED_PHOTOS_MAX)
    .optional()
    .default([]),
});

export type ClassifiedInput = z.input<typeof schema>;

const oneOf = <T extends string>(list: readonly T[], v: unknown) =>
  typeof v === "string" && (list as readonly string[]).includes(v)
    ? (v as T)
    : null;

/**
 * Posting. Only a verified member gets this far — the policy says so — and
 * whatever is sent here, the database reads the text again and decides for
 * itself whether the post goes up or waits for a human.
 */
export async function createClassified(
  input: ClassifiedInput
): Promise<Result<{ id: string; held: boolean }>> {
  if (!isEnabled("jobsHousing") || !(await classifiedsReady())) {
    return { ok: false, error: "unavailable" };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  const photoPattern = new RegExp(
    `^${user.id}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp)$`,
    "i"
  );
  const photos = v.kind === "housing" ? v.photos : [];
  if (photos.some((p) => !photoPattern.test(p))) {
    return { ok: false, error: "photo" };
  }

  const row =
    v.kind === "housing"
      ? {
          housing_type: oneOf(HOUSING_TYPES, v.housingType),
          rent_cents: v.rent != null ? v.rent * 100 : null,
          rent_kind: oneOf(RENT_KINDS, v.rentKind),
          size_m2: v.sizeM2 ?? null,
          rooms: v.rooms ?? null,
          available_from: v.availableFrom || null,
          deposit_cents: v.deposit != null ? v.deposit * 100 : null,
          photos,
        }
      : {
          employer: v.employer || null,
          job_type: oneOf(JOB_TYPES, v.jobType),
          pay_cents: v.pay != null ? v.pay * 100 : null,
          pay_unit: oneOf(PAY_UNITS, v.payUnit),
          languages: v.languages.slice(0, 4),
        };

  const { data, error } = await supabase
    .from("classifieds")
    .insert({
      author_id: user.id,
      kind: v.kind,
      title: v.title,
      description: v.description,
      city: v.city || null,
      district: v.district || null,
      ...row,
    })
    .select("id, status")
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: /row-level security/.test(error?.message ?? "")
        ? "needs_verification"
        : "failed",
    };
  }

  revalidatePath(v.kind === "housing" ? "/housing" : "/jobs");
  return {
    ok: true,
    id: String(data.id),
    held: String(data.status) === "held",
  };
}

/** The author says it is taken, takes it down, or gives it another 30 days. */
export async function setClassifiedStatus(
  id: string,
  action: "filled" | "removed" | "renew"
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  const patch =
    action === "renew"
      ? {
          status: "open",
          expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
        }
      : { status: action };

  const { error } = await supabase
    .from("classifieds")
    .update(patch)
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/jobs");
  revalidatePath("/housing");
  revalidatePath(`/jobs/${id}`);
  revalidatePath(`/housing/${id}`);
  return { ok: true };
}

/** An administrator lifts a hold, or takes a post down for good. */
export async function decideClassified(
  id: string,
  decision: "release" | "remove"
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return { ok: false, error: "forbidden" };
  }
  const { error } = await supabase
    .from("classifieds")
    .update({ status: decision === "release" ? "open" : "removed" })
    .eq("id", id);
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/admin");
  revalidatePath("/jobs");
  revalidatePath("/housing");
  return { ok: true };
}

/** Deleting takes the photos with it. */
export async function deleteClassified(id: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  const { data: row } = await supabase
    .from("classifieds")
    .select("photos")
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("classifieds")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: "failed" };

  const photos = Array.isArray(row?.photos)
    ? (row.photos as unknown[]).filter(
        (p): p is string => typeof p === "string"
      )
    : [];
  if (photos.length) {
    await supabase.storage.from(BOARD_PHOTO_BUCKET).remove(photos);
  }
  revalidatePath("/jobs");
  revalidatePath("/housing");
  return { ok: true };
}
