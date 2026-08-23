-- seed_help.sql — OPTIONAL demo help requests for the Berlin launch community.
-- Run after 0021_help_requests.sql AND seed.sql (needs the seed users).
-- Remove with: delete from public.help_requests where id like 'a0000000-%';

insert into public.help_requests
  (id, author_id, title, body, category, urgency, city, country, status, created_at)
values
  ('a0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Need a room in Neukölln from March','Starting an apprenticeship near Hermannplatz. Quiet, non-smoker, can pay 500€ warm. Anmeldung possible would be ideal.','housing','urgent','Berlin','Germany','open', now() - interval '4 hours'),
  ('a0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','Someone to come with me to the Ausländerbehörde','My appointment is next Tuesday morning and my German is still weak. I mainly need help understanding the questions.','paperwork','soon','Berlin','Germany','open', now() - interval '1 day'),
  ('a0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','Looking for a Kurdish-speaking dentist','Been putting off a check-up because I struggle to explain the pain in German. Any recommendations in Berlin?','health','normal','Berlin','Germany','open', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','Work: any leads for a warehouse or delivery job?','I have a B licence and can start immediately. Happy to work weekends.','work','soon','Berlin','Germany','open', now() - interval '3 days'),
  ('a0000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000005','German conversation partner (A2 → B1)','I study grammar alone but never speak. Would love to meet weekly for coffee and talk — I can help with Kurmancî in return.','language','normal','Berlin','Germany','open', now() - interval '5 days'),
  ('a0000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000003','How do I enrol my daughter in Grundschule?','We moved in January. I do not understand which forms the Schulamt needs.','education','soon','Berlin','Germany','open', now() - interval '6 days'),
  ('a0000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000004','Van needed to move a sofa on Saturday','Small move within Kreuzberg. I can pay for fuel and lunch.','transport','normal','Berlin','Germany','resolved', now() - interval '9 days')
on conflict (id) do nothing;

insert into public.help_offers (id, request_id, author_id, body) values
  ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','I have done this appointment three times. Happy to come with you — message me and we can meet 30 minutes before.'),
  ('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005','Dr. Rojîn Health Clinic in Hamburg is Kurdish-speaking; for Berlin I will ask my cousin and get back to you.'),
  ('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000002','I would like this too — shall we make it a small group instead of a pair?')
on conflict (id) do nothing;
