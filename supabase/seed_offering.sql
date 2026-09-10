-- seed_offering.sql — give the demo people something to offer, and give the
-- launch city enough of them to be a community.
--
-- Two problems this fixes:
--
--  1. Every profile had `offering = '{}'`. Onboarding collects the field and
--     nothing had ever set it, so help-request matching had nobody to tap.
--
--  2. The demo data modelled 24 cities with roughly one person each. That is
--     reach, not density — and density is what a community needs. Berlin is
--     the launch city and had exactly one member while carrying all seven
--     help requests. Four people move there.
--
-- Demo data only: every id below is a seeded 00000000-… uuid, so real
-- accounts are untouched. Run after seed.sql.

-- ---------------------------------------------------------------------------
-- Density: the launch city gets a handful of people, not a token one.
-- ---------------------------------------------------------------------------
update public.profiles set city = 'Berlin', country = 'Germany'
where user_id in (
  '00000000-0000-4000-8000-000000000002'::uuid, -- Dîlan, student
  '00000000-0000-4000-8000-000000000003'::uuid, -- Rojda, doctor
  '00000000-0000-4000-8000-00000000000b'::uuid, -- Awaz, driver
  '00000000-0000-4000-8000-00000000000c'::uuid  -- Zozan, chef
);

-- ---------------------------------------------------------------------------
-- What each person can offer, chosen to fit the trade they already have.
-- ---------------------------------------------------------------------------
update public.profiles set offering = v.offers
from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, array['job_leads','local_tips']),
  ('00000000-0000-4000-8000-000000000002'::uuid, array['language_help','housing_help','friendship']),
  ('00000000-0000-4000-8000-000000000003'::uuid, array['local_tips','mentorship']),
  ('00000000-0000-4000-8000-000000000004'::uuid, array['job_leads','housing_help']),
  ('00000000-0000-4000-8000-000000000005'::uuid, array['language_help','mentorship']),
  ('00000000-0000-4000-8000-000000000006'::uuid, array['friendship','volunteering']),
  ('00000000-0000-4000-8000-000000000007'::uuid, array['language_help','friendship']),
  ('00000000-0000-4000-8000-000000000008'::uuid, array['business_help','job_leads']),
  ('00000000-0000-4000-8000-000000000009'::uuid, array['local_tips','volunteering']),
  ('00000000-0000-4000-8000-00000000000a'::uuid, array['local_tips','business_help']),
  ('00000000-0000-4000-8000-00000000000b'::uuid, array['volunteering','local_tips']),
  ('00000000-0000-4000-8000-00000000000c'::uuid, array['job_leads','friendship']),
  ('00000000-0000-4000-8000-00000000000d'::uuid, array['language_help']),
  ('00000000-0000-4000-8000-00000000000e'::uuid, array['job_leads','mentorship']),
  ('00000000-0000-4000-8000-00000000000f'::uuid, array['language_help']),
  ('00000000-0000-4000-8000-000000000010'::uuid, array['job_leads']),
  ('00000000-0000-4000-8000-000000000011'::uuid, array['local_tips']),
  ('00000000-0000-4000-8000-000000000012'::uuid, array['business_help']),
  ('00000000-0000-4000-8000-000000000013'::uuid, array['local_tips']),
  ('00000000-0000-4000-8000-000000000014'::uuid, array['volunteering']),
  ('00000000-0000-4000-8000-000000000015'::uuid, array['job_leads']),
  ('00000000-0000-4000-8000-000000000016'::uuid, array['friendship']),
  ('00000000-0000-4000-8000-000000000017'::uuid, array['language_help']),
  ('00000000-0000-4000-8000-000000000018'::uuid, array['housing_help','friendship'])
) as v(uid, offers)
where public.profiles.user_id = v.uid;
