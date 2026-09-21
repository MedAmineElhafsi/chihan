-- ============================================================================
-- 0027 — What a customer needs before walking in, and a place for teachers.
--
-- Listings gain opening hours (with the listing's own time zone, so "open
-- now" is right for someone looking from another country), a WhatsApp
-- number — the way most of this community actually gets in touch — and a
-- short list of services.
--
-- And an eighth category, classes: Kurdish classes for children above all
-- (families look for them and the schools offer few), German courses,
-- tutoring, music lessons.
--
-- listings_with_stats is untouched: the app reads these columns straight
-- from listings, only where it shows them, so nothing that reads listings
-- today depends on this migration having run.
-- ============================================================================

alter table public.listings
  add column if not exists whatsapp text,
  add column if not exists opening_hours jsonb,
  add column if not exists timezone text,
  add column if not exists services text[] not null default '{}';

-- E.164: a plus, then up to fifteen digits, no spaces. The form normalises
-- what people type ("0049 151-234 5678" → "+491512345678").
alter table public.listings drop constraint if exists listings_whatsapp_check;
alter table public.listings
  add constraint listings_whatsapp_check
  check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{6,14}$');

-- { "mon": { "open": "09:00", "close": "18:00" }, "sun": null, … }
-- null for a day means closed; a missing day means not given.
alter table public.listings drop constraint if exists listings_opening_hours_check;
alter table public.listings
  add constraint listings_opening_hours_check
  check (opening_hours is null or jsonb_typeof(opening_hours) = 'object');

alter table public.listings drop constraint if exists listings_services_check;
alter table public.listings
  add constraint listings_services_check
  check (cardinality(services) <= 20);

alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings
  add constraint listings_category_check check (
    category in (
      'restaurant', 'doctor', 'grocery', 'lawyer', 'hairdresser',
      'community', 'classes', 'other'
    )
  );
