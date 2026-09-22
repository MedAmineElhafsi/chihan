import "server-only";

import { createClient } from "./supabase/server";
import { ticketsConfigured } from "./stripe";
import { ticketsReady } from "./schema-ready";

export type Ticket = {
  id: string;
  event_id: string;
  quantity: number;
  amount_cents: number;
  currency: string;
  code: string;
  status: "paid" | "refunded" | "cancelled";
  checked_in_at: string | null;
  created_at: string;
  event_title: string | null;
  event_at: string | null;
  event_location: string | null;
};

export type SellingEvent = {
  id: string;
  title: string | null;
  event_at: string | null;
  price_cents: number;
  capacity: number;
  currency: string;
  sold: number;
  checked_in: number;
  gross_cents: number;
};

export type PayoutAccount = {
  stripe_account_id: string | null;
  charges_enabled: boolean;
  details_submitted: boolean;
};

/** Tickets can be sold at all: Stripe Connect is on and 0035 has run. */
export async function ticketsAvailable(): Promise<boolean> {
  return ticketsConfigured() && (await ticketsReady());
}

/** How many places are already taken, for a screenful of events. */
export async function soldFor(
  eventIds: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (eventIds.length === 0 || !(await ticketsReady())) return out;
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("tickets_sold_many", {
      p_events: eventIds,
    });
    for (const row of (data ?? []) as Array<{
      event_id: string;
      sold: number;
    }>) {
      out.set(String(row.event_id), Number(row.sold));
    }
  } catch {
    // pre-migration
  }
  return out;
}

export async function getPayoutAccount(
  userId: string
): Promise<PayoutAccount | null> {
  if (!(await ticketsReady())) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("payout_accounts")
      .select("stripe_account_id, charges_enabled, details_submitted")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return null;
    const row = data as {
      stripe_account_id: string | null;
      charges_enabled: boolean;
      details_submitted: boolean;
    };
    return {
      stripe_account_id: row.stripe_account_id ?? null,
      charges_enabled: Boolean(row.charges_enabled),
      details_submitted: Boolean(row.details_submitted),
    };
  } catch {
    return null;
  }
}

/** What this member has bought, newest first. */
export async function getMyTickets(userId: string): Promise<Ticket[]> {
  if (!(await ticketsReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tickets")
      .select(
        "id, event_id, quantity, amount_cents, currency, code, status, checked_in_at, created_at, posts(event_title, event_at, event_location)"
      )
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const post = (Array.isArray(r.posts) ? r.posts[0] : r.posts) as
        | {
            event_title?: string | null;
            event_at?: string | null;
            event_location?: string | null;
          }
        | null
        | undefined;
      return {
        id: String(r.id),
        event_id: String(r.event_id),
        quantity: Number(r.quantity),
        amount_cents: Number(r.amount_cents),
        currency: String(r.currency ?? "eur"),
        code: String(r.code),
        status: r.status as Ticket["status"],
        checked_in_at: (r.checked_in_at as string | null) ?? null,
        created_at: String(r.created_at),
        event_title: post?.event_title ?? null,
        event_at: post?.event_at ?? null,
        event_location: post?.event_location ?? null,
      };
    });
  } catch {
    return [];
  }
}

/** The events this member is selling for, with what has been sold. */
export async function getSellingEvents(
  userId: string
): Promise<SellingEvent[]> {
  if (!(await ticketsReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select(
        "id, event_title, event_at, ticket_price_cents, ticket_capacity, ticket_currency"
      )
      .eq("author_id", userId)
      .eq("type", "event")
      .not("ticket_price_cents", "is", null)
      .order("event_at", { ascending: false })
      .limit(30);

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) return [];

    const ids = rows.map((r) => String(r.id));
    const { data: sold } = await supabase
      .from("tickets")
      .select("event_id, quantity, amount_cents, checked_in_at, status")
      .in("event_id", ids);

    const tally = new Map<
      string,
      { sold: number; checked: number; gross: number }
    >();
    for (const t of (sold ?? []) as Array<{
      event_id: string;
      quantity: number;
      amount_cents: number;
      checked_in_at: string | null;
      status: string;
    }>) {
      if (t.status !== "paid") continue;
      const key = String(t.event_id);
      const acc = tally.get(key) ?? { sold: 0, checked: 0, gross: 0 };
      acc.sold += Number(t.quantity);
      acc.gross += Number(t.amount_cents);
      if (t.checked_in_at) acc.checked += Number(t.quantity);
      tally.set(key, acc);
    }

    return rows.map((r) => {
      const acc = tally.get(String(r.id)) ?? { sold: 0, checked: 0, gross: 0 };
      return {
        id: String(r.id),
        title: (r.event_title as string | null) ?? null,
        event_at: (r.event_at as string | null) ?? null,
        price_cents: Number(r.ticket_price_cents ?? 0),
        capacity: Number(r.ticket_capacity ?? 0),
        currency: String(r.ticket_currency ?? "eur"),
        sold: acc.sold,
        checked_in: acc.checked,
        gross_cents: acc.gross,
      };
    });
  } catch {
    return [];
  }
}

/** What an event asks for a ticket, and whether any are left. */
export async function getEventTicketing(eventId: string): Promise<{
  price_cents: number;
  capacity: number;
  currency: string;
  sold: number;
} | null> {
  if (!(await ticketsReady())) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("ticket_price_cents, ticket_capacity, ticket_currency")
      .eq("id", eventId)
      .maybeSingle();
    const row = data as {
      ticket_price_cents: number | null;
      ticket_capacity: number | null;
      ticket_currency: string | null;
    } | null;
    if (!row?.ticket_price_cents || !row.ticket_capacity) return null;
    const { data: sold } = await supabase.rpc("tickets_sold", {
      p_event: eventId,
    });
    return {
      price_cents: Number(row.ticket_price_cents),
      capacity: Number(row.ticket_capacity),
      currency: String(row.ticket_currency ?? "eur"),
      sold: Number(sold ?? 0),
    };
  } catch {
    return null;
  }
}

/** €10.00 — the currencies here have two decimals. */
export function money(cents: number, currency = "eur", locale = "en"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
