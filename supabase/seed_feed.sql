-- seed_feed.sql — OPTIONAL demo feed: posts, events, likes & comments authored
-- by the seed people. Run AFTER 0005_feed.sql AND seed.sql (needs the seed users).
-- Re-runnable (ON CONFLICT). Remove with:
--   delete from public.posts where id like 'f0000000-%';

-- Posts + events (author ids come from seed.sql).
insert into public.posts
  (id, author_id, type, body, event_title, event_at, event_location, event_lat, event_lng, created_at)
values
  ('f0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','post','Newroz pîroz be! 🔥 What a turnout at the park today.', null, null, null, null, null, now() - interval '3 hours'),
  ('f0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-00000000000a','post','Any recommendations for a good Kurdish barber in North London?', null, null, null, null, null, now() - interval '8 hours'),
  ('f0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000008','post','Been archiving old dengbêj recordings — the stories in these songs are everything.', null, null, null, null, null, now() - interval '1 day'),
  ('f0000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000012','post','Erbil''s startup scene is buzzing lately. Who''s building something cool?', null, null, null, null, null, now() - interval '2 days'),
  ('f0000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000003','post','First time making my grandmother''s dolma from memory. Wish me luck 😅', null, null, null, null, null, now() - interval '3 days'),
  ('f0000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000001','event','Music, food and fire — bring the whole family. 🔥','Newroz Community Gathering', now() + interval '5 days', 'Görlitzer Park, Berlin', 52.4986, 13.4386, now() - interval '1 day'),
  ('f0000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000005','event','Free weekly language classes for all ages.','Kurmancî Class (Beginners)', now() + interval '12 days', 'Centre Culturel Kurde, Paris', 48.8720, 2.3770, now() - interval '2 days'),
  ('f0000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-00000000000a','event','Screening followed by a Q&A with the director.','Kurdish Film Night', now() + interval '20 days', 'Rich Mix, London', 51.5237, -0.0745, now() - interval '2 days'),
  ('f0000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000008','event','Meet founders, artists and organisers from across Europe.','Diaspora Networking Mixer', now() + interval '45 days', 'Stockholm City Hall', 59.3275, 18.0540, now() - interval '4 days')
on conflict (id) do nothing;

-- Likes.
insert into public.post_likes (post_id, user_id) values
  ('f0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005'),
  ('f0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000008'),
  ('f0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-00000000000a'),
  ('f0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012'),
  ('f0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005'),
  ('f0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000012'),
  ('f0000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001'),
  ('f0000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000005'),
  ('f0000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-00000000000a'),
  ('f0000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000012')
on conflict (post_id, user_id) do nothing;

-- Comments.
insert into public.post_comments (id, post_id, author_id, body) values
  ('c0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Try the place near Green Lanes and ask for Aland 👌'),
  ('c0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-00000000000a','Looks incredible — save me some!'),
  ('c0000000-0000-4000-8000-000000000003','f0000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000012','Wish I could join from Erbil. Have an amazing time!'),
  ('c0000000-0000-4000-8000-000000000004','f0000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','The secret is a little more lemon than you think 🍋')
on conflict (id) do nothing;
