-- seed.sql — OPTIONAL demo data: ~24 fake Kurdish people across the diaspora,
-- so the globe and (later) directory look alive in demos.
--
-- Safe to run after 0000_init.sql + 0001_profiles.sql. Re-runnable (ON CONFLICT).
-- Creates matching auth.users rows (login disabled — no identities) + public,
-- consented profiles with coordinates. Businesses are seeded in Phase 3.
--
-- To remove later:
--   delete from auth.users where email like '%@cihan.demo';
--   (profiles cascade via the user_id FK).

with seed (id, email, name, city, country, lat, lng, langs, dialect) as (
  values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'seed01@cihan.demo', 'Aram Khalil',    'Berlin',        'Germany',        52.5200, 13.4050, array['Kurmancî','German']::text[],            'Kurmancî'),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'seed02@cihan.demo', 'Dîlan Yıldız',   'Hamburg',       'Germany',        53.5511,  9.9937, array['Kurmancî','German','Turkish']::text[],  'Kurmancî'),
    ('00000000-0000-4000-8000-000000000003'::uuid, 'seed03@cihan.demo', 'Rojda Demir',    'Cologne',       'Germany',        50.9375,  6.9603, array['Soranî','German']::text[],              'Soranî'),
    ('00000000-0000-4000-8000-000000000004'::uuid, 'seed04@cihan.demo', 'Sîpan Aydın',    'Frankfurt',     'Germany',        50.1109,  8.6821, array['Kurmancî','German']::text[],            'Kurmancî'),
    ('00000000-0000-4000-8000-000000000005'::uuid, 'seed05@cihan.demo', 'Berfîn Aslan',   'Paris',         'France',         48.8566,  2.3522, array['Kurmancî','French']::text[],            'Kurmancî'),
    ('00000000-0000-4000-8000-000000000006'::uuid, 'seed06@cihan.demo', 'Hêvî Çelik',     'Marseille',     'France',         43.2965,  5.3698, array['Zazakî','French']::text[],              'Zazakî (Kirmanckî)'),
    ('00000000-0000-4000-8000-000000000007'::uuid, 'seed07@cihan.demo', 'Aland Rashid',   'Lyon',          'France',         45.7640,  4.8357, array['Soranî','French']::text[],              'Soranî'),
    ('00000000-0000-4000-8000-000000000008'::uuid, 'seed08@cihan.demo', 'Şervan Öztürk',  'Stockholm',     'Sweden',         59.3293, 18.0686, array['Kurmancî','Swedish']::text[],           'Kurmancî'),
    ('00000000-0000-4000-8000-000000000009'::uuid, 'seed09@cihan.demo', 'Newroz Karim',   'Gothenburg',    'Sweden',         57.7089, 11.9746, array['Soranî','Swedish']::text[],             'Soranî'),
    ('00000000-0000-4000-8000-00000000000a'::uuid, 'seed10@cihan.demo', 'Diyar Ahmad',    'London',        'United Kingdom', 51.5072, -0.1276, array['Soranî','English']::text[],             'Soranî'),
    ('00000000-0000-4000-8000-00000000000b'::uuid, 'seed11@cihan.demo', 'Awaz Hassan',    'Manchester',    'United Kingdom', 53.4808, -2.2426, array['Soranî','English']::text[],             'Soranî'),
    ('00000000-0000-4000-8000-00000000000c'::uuid, 'seed12@cihan.demo', 'Zozan Polat',    'Madrid',        'Spain',          40.4168, -3.7038, array['Kurmancî','Spanish']::text[],           'Kurmancî'),
    ('00000000-0000-4000-8000-00000000000d'::uuid, 'seed13@cihan.demo', 'Helî Mahmood',   'Barcelona',     'Spain',          41.3874,  2.1686, array['Soranî','Spanish']::text[],             'Soranî'),
    ('00000000-0000-4000-8000-00000000000e'::uuid, 'seed14@cihan.demo', 'Baran Şahin',    'Amsterdam',     'Netherlands',    52.3676,  4.9041, array['Kurmancî','Dutch']::text[],             'Kurmancî'),
    ('00000000-0000-4000-8000-00000000000f'::uuid, 'seed15@cihan.demo', 'Welat Kaya',     'Diyarbakır',    'Turkey',         37.9144, 40.2306, array['Kurmancî','Turkish']::text[],           'Kurmancî'),
    ('00000000-0000-4000-8000-000000000010'::uuid, 'seed16@cihan.demo', 'Mizgîn Arslan',  'Istanbul',      'Turkey',         41.0082, 28.9784, array['Kurmancî','Turkish']::text[],           'Kurmancî'),
    ('00000000-0000-4000-8000-000000000011'::uuid, 'seed17@cihan.demo', 'Rûken Doğan',    'Van',           'Turkey',         38.4891, 43.4089, array['Kurmancî','Turkish']::text[],           'Kurmancî'),
    ('00000000-0000-4000-8000-000000000012'::uuid, 'seed18@cihan.demo', 'Hawkar Salih',   'Erbil',         'Iraq',           36.1911, 44.0091, array['Soranî','Arabic']::text[],              'Soranî'),
    ('00000000-0000-4000-8000-000000000013'::uuid, 'seed19@cihan.demo', 'Lana Aziz',      'Sulaymaniyah',  'Iraq',           35.5611, 45.4408, array['Soranî','Arabic']::text[],              'Soranî'),
    ('00000000-0000-4000-8000-000000000014'::uuid, 'seed20@cihan.demo', 'Karwan Omar',    'Duhok',         'Iraq',           36.8669, 42.9503, array['Kurmancî','Arabic']::text[],            'Kurmancî'),
    ('00000000-0000-4000-8000-000000000015'::uuid, 'seed21@cihan.demo', 'Shilan Jamal',   'Kirkuk',        'Iraq',           35.4681, 44.3922, array['Soranî','Arabic']::text[],              'Soranî'),
    ('00000000-0000-4000-8000-000000000016'::uuid, 'seed22@cihan.demo', 'Soran Karimi',   'Sanandaj',      'Iran',           35.3119, 46.9923, array['Hewramî','Persian']::text[],            'Hewramî (Gorani)'),
    ('00000000-0000-4000-8000-000000000017'::uuid, 'seed23@cihan.demo', 'Avan Moradi',    'Kermanshah',    'Iran',           34.3142, 47.0650, array['Southern Kurdish','Persian']::text[],   'Southern Kurdish (Kelhurî/Feylî)'),
    ('00000000-0000-4000-8000-000000000018'::uuid, 'seed24@cihan.demo', 'Tara Ibrahim',   'Oslo',          'Norway',         59.9139, 10.7522, array['Soranî']::text[],                       'Soranî')
),
new_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000', s.id, 'authenticated', 'authenticated', s.email,
    crypt('cihan-demo-seed', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', ''
  from seed s
  on conflict (id) do nothing
  returning 1
)
insert into public.profiles (
  user_id, display_name, bio, city, country, lat, lng, languages, dialect, is_public, consent_at
)
select
  s.id, s.name,
  'Part of the Kurdish community in ' || s.city || '.',
  s.city, s.country, s.lat, s.lng, s.langs, s.dialect, true, now()
from seed s
on conflict (user_id) do nothing;
