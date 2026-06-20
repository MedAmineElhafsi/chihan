-- seed_listings.sql — OPTIONAL demo data: ~20 Kurdish businesses across the
-- diaspora. Run after 0002_listings_reviews.sql. Re-runnable (ON CONFLICT).
-- Listings are left unowned (owner_user_id = null) so you can try "Claim".
--
-- To remove later:  delete from public.listings where id like 'd0000000-%';

insert into public.listings
  (id, owner_user_id, name, category, description, address, city, country, lat, lng, phone, email, website, is_verified, photos)
values
  ('d0000000-0000-4000-8000-000000000001', null, 'Mîr Kebab House',        'restaurant', 'Charcoal-grilled kebabs and fresh lavash, family-run since 2008.', 'Sonnenallee 44', 'Berlin', 'Germany', 52.4810, 13.4360, '+49 30 1234567', 'hello@mirkebab.de', 'mirkebab.de', true,  '{}'),
  ('d0000000-0000-4000-8000-000000000002', null, 'Newroz Restaurant',      'restaurant', 'Classic Kurdish home cooking in the heart of Paris.',            '12 Rue du Faubourg', 'Paris', 'France', 48.8700, 2.3540, '+33 1 23456789', null, 'newroz-paris.fr', false, '{}'),
  ('d0000000-0000-4000-8000-000000000003', null, 'Zagros Grill',           'restaurant', 'Mountain-style grills and dolma.',                               'Götgatan 20', 'Stockholm', 'Sweden', 59.3160, 18.0710, '+46 8 1234567', null, null, false, '{}'),
  ('d0000000-0000-4000-8000-000000000004', null, 'Hewler Kitchen',         'restaurant', 'Erbil street food and sweet tea.',                               '88 Green Lanes', 'London', 'United Kingdom', 51.5710, -0.0960, '+44 20 7123456', 'eat@hewlerkitchen.co.uk', 'hewlerkitchen.co.uk', true, '{}'),
  ('d0000000-0000-4000-8000-000000000005', null, 'Sulaymaniyah Bistro',    'restaurant', 'Slow-cooked stews and saffron rice.',                            'Calle Mayor 10', 'Madrid', 'Spain', 40.4150, -3.7070, null, null, null, false, '{}'),
  ('d0000000-0000-4000-8000-000000000006', null, 'Van Lokantası',          'restaurant', 'Breakfast spreads and herby gözleme.',                           'Gazi Caddesi 5', 'Diyarbakır', 'Turkey', 37.9160, 40.2350, null, null, null, false, '{}'),
  ('d0000000-0000-4000-8000-000000000007', null, 'Mezopotamya Market',     'grocery',    'Spices, bulgur, cheeses and fresh herbs.',                       'Keupstraße 8', 'Cologne', 'Germany', 50.9610, 6.9810, '+49 221 123456', null, null, false, '{}'),
  ('d0000000-0000-4000-8000-000000000008', null, 'Kurdistan Bazaar',       'grocery',    'Halal butcher and pantry staples.',                              'Javastraat 30', 'Amsterdam', 'Netherlands', 52.3640, 4.9290, null, null, null, false, '{}'),
  ('d0000000-0000-4000-8000-000000000009', null, 'Soran Supermarket',      'grocery',    'Everything for a Kurdish kitchen.',                              'Avenyn 12', 'Gothenburg', 'Sweden', 57.7010, 11.9740, null, null, null, false, '{}'),
  ('d0000000-0000-4000-8000-00000000000a', null, 'Dr. Rojîn Health Clinic','doctor',     'General practice, Kurdish/German/English spoken.',               'Steindamm 21', 'Hamburg', 'Germany', 53.5530, 10.0120, '+49 40 987654', 'praxis@rojin-clinic.de', null, true, '{}'),
  ('d0000000-0000-4000-8000-00000000000b', null, 'Clinique Dr. Aland',     'doctor',     'Family medicine and pediatrics.',                                '5 Rue de la République', 'Lyon', 'France', 45.7660, 4.8360, '+33 4 12345678', null, null, false, '{}'),
  ('d0000000-0000-4000-8000-00000000000c', null, 'Erbil Family Practice',  'doctor',     'Walk-in clinic near the high street.',                           '210 Stockport Rd', 'Manchester', 'United Kingdom', 53.4640, -2.2200, '+44 161 4960000', null, null, false, '{}'),
  ('d0000000-0000-4000-8000-00000000000d', null, 'Dr. Karwan Dental',      'doctor',     'Modern dental care.',                                            '100m Street', 'Erbil', 'Iraq', 36.1920, 44.0120, null, null, null, false, '{}'),
  ('d0000000-0000-4000-8000-00000000000e', null, 'Demir & Partners Law',   'lawyer',     'Immigration, asylum and family law.',                            'Friedrichstraße 90', 'Berlin', 'Germany', 52.5170, 13.3880, '+49 30 5550101', 'office@demirlaw.de', 'demirlaw.de', true, '{}'),
  ('d0000000-0000-4000-8000-00000000000f', null, 'Cabinet Juridique Aslan','lawyer',     'Droit des étrangers et du travail.',                             '3 Cours Belsunce', 'Marseille', 'France', 43.2980, 5.3760, null, null, null, false, '{}'),
  ('d0000000-0000-4000-8000-000000000010', null, 'Salon Berfîn',           'hairdresser','Cuts, color and bridal styling.',                                'Kungsgatan 18', 'Stockholm', 'Sweden', 59.3350, 18.0630, null, null, null, false, '{}'),
  ('d0000000-0000-4000-8000-000000000011', null, 'Diyar Barber',           'hairdresser','Classic barbering and hot-towel shaves.',                        '45 Wilmslow Rd', 'Manchester', 'United Kingdom', 53.4500, -2.2280, null, null, null, false, '{}'),
  ('d0000000-0000-4000-8000-000000000012', null, 'Kurdish Community Center','community',  'Events, language classes and support.',                          'Oranienstraße 25', 'Berlin', 'Germany', 52.5020, 13.4180, '+49 30 6660202', 'info@kkz-berlin.de', null, true, '{}'),
  ('d0000000-0000-4000-8000-000000000013', null, 'Centre Culturel Kurde',  'community',  'Cultural center and library.',                                   '16 Rue de Belleville', 'Paris', 'France', 48.8720, 2.3770, null, null, null, false, '{}'),
  ('d0000000-0000-4000-8000-000000000014', null, 'Civaka Duhokê',          'community',  'Community gathering and aid network.',                           'Barzan Street', 'Duhok', 'Iraq', 36.8680, 42.9520, null, null, null, false, '{}')
on conflict (id) do nothing;
