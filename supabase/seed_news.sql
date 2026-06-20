-- seed_news.sql — OPTIONAL demo content for the News page (~12 articles).
-- Run after 0006_news.sql. Re-runnable (ON CONFLICT). Remove with:
--   delete from public.news_articles where id like 'e0000000-%';

insert into public.news_articles
  (id, title, summary, source, url, image_url, country, category, published_at)
values
  ('e0000000-0000-4000-8000-000000000001', 'Newroz celebrations draw thousands in Berlin', 'Families gathered across the capital to mark the Kurdish new year with music, fire and dance.', 'DW Kurdî', 'https://example.com', null, 'Germany', 'culture', now() - interval '1 day'),
  ('e0000000-0000-4000-8000-000000000002', 'Paris opens a Kurdish-language library', 'A new cultural center in the 19th arrondissement will house thousands of titles in Kurmancî and Soranî.', 'France 24', 'https://example.com', null, 'France', 'culture', now() - interval '3 days'),
  ('e0000000-0000-4000-8000-000000000003', 'Erbil hosts international Kurdish film festival', 'Filmmakers from a dozen countries presented work exploring identity and diaspora.', 'Rûdaw', 'https://example.com', null, 'Iraq', 'culture', now() - interval '4 days'),
  ('e0000000-0000-4000-8000-000000000004', 'Diyarbakır artisans revive traditional weaving', 'A cooperative is training a new generation in centuries-old textile techniques.', 'Kurdistan 24', 'https://example.com', null, 'Turkey', 'community', now() - interval '6 days'),
  ('e0000000-0000-4000-8000-000000000005', 'London fund supports a new Kurdish community school', 'Weekend classes will offer language, history and arts for children across the city.', 'The Guardian', 'https://example.com', null, 'United Kingdom', 'community', now() - interval '7 days'),
  ('e0000000-0000-4000-8000-000000000006', 'Stockholm names a street after a Kurdish poet', 'The honour recognises decades of contribution to literature and exile writing.', 'SVT', 'https://example.com', null, 'Sweden', 'culture', now() - interval '9 days'),
  ('e0000000-0000-4000-8000-000000000007', 'Diaspora groups launch a global mentorship network', 'The initiative pairs students with professionals across Europe and the Middle East.', 'Cîhan', 'https://example.com', null, 'International', 'diaspora', now() - interval '10 days'),
  ('e0000000-0000-4000-8000-000000000008', 'Sulaymaniyah tech hub attracts young founders', 'A growing startup scene is drawing returnees and first-time entrepreneurs.', 'Rûdaw', 'https://example.com', null, 'Iraq', 'business', now() - interval '12 days'),
  ('e0000000-0000-4000-8000-000000000009', 'Cologne restaurant wins a regional culinary award', 'The family-run kitchen was praised for modern takes on classic dishes.', 'WDR', 'https://example.com', null, 'Germany', 'community', now() - interval '14 days'),
  ('e0000000-0000-4000-8000-00000000000a', 'Sanandaj musicians release a collaborative album', 'The record blends traditional instruments with contemporary production.', 'Kurdistan 24', 'https://example.com', null, 'Iran', 'culture', now() - interval '16 days'),
  ('e0000000-0000-4000-8000-00000000000b', 'Amsterdam hosts a Kurdish food and crafts market', 'Vendors from across the diaspora shared cuisine, textiles and music.', 'NOS', 'https://example.com', null, 'Netherlands', 'community', now() - interval '18 days'),
  ('e0000000-0000-4000-8000-00000000000c', 'Oral storytelling tradition gains international recognition', 'Cultural bodies are documenting dengbêj performance for future generations.', 'Cîhan', 'https://example.com', null, 'International', 'culture', now() - interval '21 days')
on conflict (id) do nothing;
