-- seed_guides.sql — starter city guides: the questions a newcomer to Germany
-- hits first, each in English and German, authored by the administrator.
-- Run after 0032_city_guides.sql. Re-runnable (ON CONFLICT on id).
--
-- These are DRAFTS in substance even though they publish: they are written
-- conservatively and lean on official sources rather than inventing precise
-- step detail, and `reviewed_on` is left null on purpose — nobody has checked
-- them against the live procedure yet. An administrator should read each one,
-- correct anything local, and set a review date before these are leaned on.
-- The migration says it plainly: a wrong step costs someone an appointment or
-- a fine.
--
-- To remove later:  delete from public.guides where id like '9a1de032-%';

insert into public.guides
  (id, slug, locale, topic, country, city, title, summary, steps, links, status, reviewed_on, author_id)
values
  -- 1. Address registration (Anmeldung) ------------------------------------
  ('9a1de032-0000-4000-8000-000000000001', 'registering-your-address', 'en', 'registration', 'Germany', null,
   'Registering your address (Anmeldung)',
   'After you move into a home in Germany you must register your address with the local office. It unlocks almost everything else — a tax ID, a bank account, a residence permit appointment.',
   '[{"title":"Register within two weeks","body":"By law you register your new address within 14 days of moving in, at the Bürgeramt (also called Einwohnermeldeamt) for your district."},{"title":"Book an appointment","body":"Appointments (Termin) are usually booked online on your city''s Bürgeramt website. In large cities they can be weeks away, so book as soon as you have a home."},{"title":"Get the landlord confirmation","body":"Ask your landlord for a Wohnungsgeberbestätigung — a short form confirming you live there. You cannot register without it."},{"title":"Bring your documents","body":"Take your passport or ID, the completed registration form (Anmeldeformular), and the landlord confirmation. For family members, bring their documents too."},{"title":"Keep the Meldebescheinigung","body":"You leave with a registration certificate (Meldebescheinigung). Your tax ID (Steuer-Identifikationsnummer) arrives separately by post within a few weeks."}]'::jsonb,
   '[{"label":"Make it in Germany — official portal","url":"https://www.make-it-in-germany.com/en/living-in-germany/settling-in/registration"},{"label":"Federal government service portal","url":"https://www.bund.de"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  ('9a1de032-0000-4000-8000-000000000002', 'registering-your-address', 'de', 'registration', 'Germany', null,
   'Wohnsitz anmelden (Anmeldung)',
   'Nach dem Einzug in eine Wohnung in Deutschland müssen Sie Ihren Wohnsitz beim Amt anmelden. Fast alles andere hängt davon ab — Steuer-ID, Bankkonto, Termin bei der Ausländerbehörde.',
   '[{"title":"Innerhalb von zwei Wochen anmelden","body":"Gesetzlich melden Sie Ihren neuen Wohnsitz innerhalb von 14 Tagen nach dem Einzug beim Bürgeramt (auch Einwohnermeldeamt) Ihres Bezirks an."},{"title":"Termin buchen","body":"Termine werden meist online auf der Website des Bürgeramts gebucht. In großen Städten dauert es oft Wochen — buchen Sie, sobald Sie eine Wohnung haben."},{"title":"Wohnungsgeberbestätigung holen","body":"Bitten Sie Ihre Vermieterin oder Ihren Vermieter um die Wohnungsgeberbestätigung. Ohne sie ist keine Anmeldung möglich."},{"title":"Unterlagen mitbringen","body":"Nehmen Sie Pass oder Ausweis, das ausgefüllte Anmeldeformular und die Wohnungsgeberbestätigung mit. Für Familienangehörige deren Dokumente ebenfalls."},{"title":"Meldebescheinigung aufbewahren","body":"Sie erhalten eine Meldebescheinigung. Die Steuer-Identifikationsnummer kommt einige Wochen später per Post."}]'::jsonb,
   '[{"label":"Make it in Germany — offizielles Portal","url":"https://www.make-it-in-germany.com/de/leben-in-deutschland/ankommen/anmeldung"},{"label":"Verwaltungsportal des Bundes","url":"https://www.bund.de"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  -- 2. Health insurance ----------------------------------------------------
  ('9a1de032-0000-4000-8000-000000000003', 'health-insurance', 'en', 'health_insurance', 'Germany', null,
   'Health insurance (Krankenversicherung)',
   'Health insurance is mandatory in Germany for everyone who lives here. Most people are covered by a statutory fund (gesetzliche Krankenversicherung).',
   '[{"title":"It is compulsory","body":"Everyone resident in Germany must have health insurance. You cannot sign an employment contract or often even a residence permit without proof of cover."},{"title":"Choose a statutory fund","body":"Most employees join a statutory health insurer (Krankenkasse) such as TK, AOK or Barmer. You are free to choose between them; the core benefits are the same."},{"title":"Let your employer register you","body":"If you are employed, your employer registers you and the contribution is split between you and them, deducted from your salary."},{"title":"Arrange it yourself if you are not employed","body":"Students, self-employed people and others arrange cover themselves. Private insurance (PKV) is possible for some — compare carefully, as switching back is hard."},{"title":"Carry your card","body":"You receive an insurance card (Gesundheitskarte). Show it at any doctor or pharmacy."}]'::jsonb,
   '[{"label":"Make it in Germany — health insurance","url":"https://www.make-it-in-germany.com/en/living-in-germany/insurance/health-insurance"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  ('9a1de032-0000-4000-8000-000000000004', 'health-insurance', 'de', 'health_insurance', 'Germany', null,
   'Krankenversicherung',
   'In Deutschland ist eine Krankenversicherung für alle Pflicht, die hier leben. Die meisten sind gesetzlich krankenversichert.',
   '[{"title":"Sie ist Pflicht","body":"Wer in Deutschland lebt, muss krankenversichert sein. Ohne Nachweis gibt es oft weder Arbeitsvertrag noch Aufenthaltstitel."},{"title":"Krankenkasse wählen","body":"Die meisten Arbeitnehmer sind bei einer gesetzlichen Krankenkasse wie TK, AOK oder Barmer. Sie können frei wählen; die Grundleistungen sind gleich."},{"title":"Arbeitgeber meldet Sie an","body":"Als Angestellte oder Angestellter werden Sie vom Arbeitgeber angemeldet; der Beitrag wird geteilt und vom Lohn abgezogen."},{"title":"Selbst kümmern, wenn nicht angestellt","body":"Studierende, Selbstständige und andere versichern sich selbst. Eine private Versicherung (PKV) ist für manche möglich — gut vergleichen, der Rückweg ist schwer."},{"title":"Karte mitführen","body":"Sie erhalten eine Gesundheitskarte. Zeigen Sie sie bei jeder Ärztin, jedem Arzt und in der Apotheke."}]'::jsonb,
   '[{"label":"Make it in Germany — Krankenversicherung","url":"https://www.make-it-in-germany.com/de/leben-in-deutschland/versicherung/krankenversicherung"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  -- 3. Residence permit ----------------------------------------------------
  ('9a1de032-0000-4000-8000-000000000005', 'residence-permit-basics', 'en', 'residence', 'Germany', null,
   'Residence permit: the basics',
   'If you are not an EU citizen, you need a residence title to stay in Germany. The office that decides is the Ausländerbehörde. This is an overview — your own case depends on why you are here.',
   '[{"title":"Know which office is yours","body":"The local foreigners'' office (Ausländerbehörde) handles residence permits. Appointments are often slow, so request one early and keep the confirmation."},{"title":"Your permit follows your purpose","body":"The type of permit depends on why you are in Germany — work, study, family, or protection. Each has its own requirements."},{"title":"Register your address first","body":"You almost always need a completed Anmeldung before a residence-permit appointment. Do that step first (see the registration guide)."},{"title":"Gather proof","body":"Typically: passport, biometric photos, proof of your purpose (job contract, enrolment, family documents), proof of health insurance, and proof you can support yourself."},{"title":"Get advice for anything unclear","body":"Rules change and cases differ. For anything uncertain, ask the Ausländerbehörde directly or a qualified immigration adviser or lawyer. Do not rely on second-hand accounts."}]'::jsonb,
   '[{"label":"BAMF — Federal Office for Migration and Refugees","url":"https://www.bamf.de/EN"},{"label":"Make it in Germany — visa and residence","url":"https://www.make-it-in-germany.com/en/visa-residence"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  ('9a1de032-0000-4000-8000-000000000006', 'residence-permit-basics', 'de', 'residence', 'Germany', null,
   'Aufenthaltstitel: die Grundlagen',
   'Wer nicht EU-Bürgerin oder EU-Bürger ist, braucht einen Aufenthaltstitel, um in Deutschland zu bleiben. Zuständig ist die Ausländerbehörde. Dies ist ein Überblick — Ihr Fall hängt vom Grund Ihres Aufenthalts ab.',
   '[{"title":"Die zuständige Behörde kennen","body":"Die örtliche Ausländerbehörde entscheidet über Aufenthaltstitel. Termine dauern oft lange — früh anfragen und die Bestätigung aufbewahren."},{"title":"Der Titel richtet sich nach dem Zweck","body":"Die Art des Titels hängt vom Grund ab — Arbeit, Studium, Familie oder Schutz. Jeder hat eigene Voraussetzungen."},{"title":"Zuerst anmelden","body":"Fast immer brauchen Sie eine erledigte Anmeldung vor dem Termin. Erledigen Sie diesen Schritt zuerst (siehe Anmeldungs-Leitfaden)."},{"title":"Nachweise sammeln","body":"Meist: Pass, biometrische Fotos, Nachweis des Zwecks (Arbeitsvertrag, Immatrikulation, Familiendokumente), Krankenversicherung und Nachweis der Lebensunterhaltssicherung."},{"title":"Bei Unklarheiten beraten lassen","body":"Regeln ändern sich, Fälle unterscheiden sich. Fragen Sie im Zweifel direkt die Ausländerbehörde oder eine qualifizierte Beratungsstelle oder Anwältin. Verlassen Sie sich nicht auf Erzählungen Dritter."}]'::jsonb,
   '[{"label":"BAMF — Bundesamt für Migration und Flüchtlinge","url":"https://www.bamf.de"},{"label":"Make it in Germany — Visum und Aufenthalt","url":"https://www.make-it-in-germany.com/de/visum-aufenthalt"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  -- 4. School enrolment ----------------------------------------------------
  ('9a1de032-0000-4000-8000-000000000007', 'enrolling-your-child-in-school', 'en', 'schools', 'Germany', null,
   'Enrolling your child in school',
   'School is compulsory in Germany from around age six. Newly arrived children usually start in a preparatory class to learn German before joining a regular class.',
   '[{"title":"School is compulsory","body":"Children of school age (generally from six) must attend school. This applies regardless of residence status."},{"title":"Find the right school or office","body":"For primary school, contact the nearest Grundschule or your district''s school authority (Schulamt). They direct you to the right school."},{"title":"Preparatory language class","body":"Newly arrived children are often placed in a welcome or preparatory class (Willkommensklasse) to learn German, then move into a regular class."},{"title":"Bring the documents","body":"Usually: the child''s passport, your Anmeldung, the child''s vaccination record (proof of measles protection is required by law), and a birth certificate if you have one."},{"title":"Ask about support","body":"Schools can advise on after-school care (Hort), meals and learning support. Ask — much of it is free or subsidised."}]'::jsonb,
   '[{"label":"Make it in Germany — school system","url":"https://www.make-it-in-germany.com/en/living-in-germany/family-life/school"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  ('9a1de032-0000-4000-8000-000000000008', 'enrolling-your-child-in-school', 'de', 'schools', 'Germany', null,
   'Ihr Kind in der Schule anmelden',
   'In Deutschland besteht ab etwa sechs Jahren Schulpflicht. Neu zugewanderte Kinder beginnen meist in einer Vorbereitungsklasse, um Deutsch zu lernen, bevor sie in eine Regelklasse wechseln.',
   '[{"title":"Es besteht Schulpflicht","body":"Kinder im schulpflichtigen Alter (in der Regel ab sechs) müssen zur Schule gehen — unabhängig vom Aufenthaltsstatus."},{"title":"Die richtige Schule oder Stelle finden","body":"Für die Grundschule wenden Sie sich an die nächste Grundschule oder das Schulamt Ihres Bezirks. Dort erfahren Sie die zuständige Schule."},{"title":"Vorbereitungsklasse","body":"Neu zugewanderte Kinder kommen oft in eine Willkommens- oder Vorbereitungsklasse, um Deutsch zu lernen, und wechseln dann in eine Regelklasse."},{"title":"Unterlagen mitbringen","body":"Meist: Pass des Kindes, Ihre Anmeldung, der Impfausweis des Kindes (ein Masernschutz-Nachweis ist gesetzlich vorgeschrieben) und eine Geburtsurkunde, falls vorhanden."},{"title":"Nach Unterstützung fragen","body":"Schulen beraten zu Hort, Mittagessen und Lernförderung. Fragen Sie nach — vieles ist kostenlos oder bezuschusst."}]'::jsonb,
   '[{"label":"Make it in Germany — Schulsystem","url":"https://www.make-it-in-germany.com/de/leben-in-deutschland/familienleben/schule"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  -- 5. Bank account --------------------------------------------------------
  ('9a1de032-0000-4000-8000-000000000009', 'opening-a-bank-account', 'en', 'money', 'Germany', null,
   'Opening a bank account',
   'You need a German account for rent, wages and most bills. By law, anyone legally resident has the right to a basic account, whatever their situation.',
   '[{"title":"You have a right to a basic account","body":"Under German law any consumer legally in the country may open a basic account (Basiskonto). A bank may not simply refuse you — this right exists for people without a permanent status too."},{"title":"Choose a bank","body":"Branch banks (Sparkasse, Volksbank and others) and online banks both offer accounts. Online banks are often quicker to open; a branch may help if your German is limited."},{"title":"Bring your documents","body":"Usually your passport or ID and your Meldebescheinigung (registration). Some banks also ask for a residence permit — if refused a normal account, ask specifically for a Basiskonto."},{"title":"Verify your identity","body":"You confirm who you are, in a branch or by video call (VideoIdent). Then your card and IBAN arrive by post."},{"title":"Watch the fees","body":"Compare monthly fees before you choose. A Basiskonto must be offered at a reasonable price, but prices still differ between banks."}]'::jsonb,
   '[{"label":"BaFin — the right to a basic account","url":"https://www.bafin.de/EN/Verbraucher/Bank/Produkte/Basiskonto/basiskonto_node_en.html"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  ('9a1de032-0000-4000-8000-00000000000a', 'opening-a-bank-account', 'de', 'money', 'Germany', null,
   'Ein Bankkonto eröffnen',
   'Für Miete, Lohn und die meisten Rechnungen brauchen Sie ein deutsches Konto. Gesetzlich hat jede Person mit rechtmäßigem Aufenthalt das Recht auf ein Basiskonto — unabhängig von der Situation.',
   '[{"title":"Sie haben ein Recht auf ein Basiskonto","body":"Nach deutschem Recht darf jede Verbraucherin und jeder Verbraucher mit rechtmäßigem Aufenthalt ein Basiskonto eröffnen. Eine Bank darf Sie nicht einfach ablehnen — das gilt auch ohne festen Status."},{"title":"Bank wählen","body":"Filialbanken (Sparkasse, Volksbank u. a.) und Onlinebanken bieten Konten an. Onlinebanken gehen oft schneller; eine Filiale hilft, wenn Ihr Deutsch noch begrenzt ist."},{"title":"Unterlagen mitbringen","body":"Meist Pass oder Ausweis und die Meldebescheinigung. Manche Banken fragen nach einem Aufenthaltstitel — wird ein normales Konto verweigert, verlangen Sie ausdrücklich ein Basiskonto."},{"title":"Identität bestätigen","body":"Sie weisen sich aus, in der Filiale oder per Videoanruf (VideoIdent). Danach kommen Karte und IBAN per Post."},{"title":"Auf Gebühren achten","body":"Vergleichen Sie die monatlichen Gebühren. Ein Basiskonto muss zu angemessenem Preis angeboten werden, die Preise unterscheiden sich aber."}]'::jsonb,
   '[{"label":"BaFin — Recht auf ein Basiskonto","url":"https://www.bafin.de/DE/Verbraucher/Bank/Produkte/Basiskonto/basiskonto_node.html"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  -- 6. German courses ------------------------------------------------------
  ('9a1de032-0000-4000-8000-00000000000b', 'learning-german-integration-course', 'en', 'language', 'Germany', null,
   'Learning German: the integration course',
   'The state integration course (Integrationskurs) teaches German up to level B1 and ends with an orientation course on life in Germany. For many people it is free or subsidised.',
   '[{"title":"What the course is","body":"Run under the BAMF, the Integrationskurs combines a language course (up to B1) with a short orientation course on law, history and daily life."},{"title":"Check if you can join","body":"Eligibility and whether it is free depend on your status and situation. The BAMF or a course provider can tell you after a short check."},{"title":"Find a provider","body":"Courses are taught by approved providers — often the local adult education centre (Volkshochschule, VHS) and language schools. Ask for one near you."},{"title":"Apply","body":"Apply through the BAMF or directly with a provider. If you are eligible you receive an entitlement (Berechtigung) that the provider needs."},{"title":"Finish with the exam","body":"The course ends with a language test (DTZ) and the orientation test. Passing both gives you a certificate that helps with later residence steps."}]'::jsonb,
   '[{"label":"BAMF — integration courses","url":"https://www.bamf.de/EN/Themen/Integration/ZugewanderteTeilnehmende/Integrationskurse/integrationskurse_node.html"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94'),

  ('9a1de032-0000-4000-8000-00000000000c', 'learning-german-integration-course', 'de', 'language', 'Germany', null,
   'Deutsch lernen: der Integrationskurs',
   'Der staatliche Integrationskurs vermittelt Deutsch bis Niveau B1 und endet mit einem Orientierungskurs zum Leben in Deutschland. Für viele ist er kostenlos oder bezuschusst.',
   '[{"title":"Was der Kurs ist","body":"Unter dem BAMF verbindet der Integrationskurs einen Sprachkurs (bis B1) mit einem kurzen Orientierungskurs zu Recht, Geschichte und Alltag."},{"title":"Teilnahme prüfen","body":"Ob Sie teilnehmen können und ob es kostenlos ist, hängt von Status und Situation ab. Das BAMF oder ein Kursträger klärt das nach einer kurzen Prüfung."},{"title":"Kursträger finden","body":"Kurse geben zugelassene Träger — oft die Volkshochschule (VHS) und Sprachschulen. Fragen Sie nach einem Angebot in Ihrer Nähe."},{"title":"Antrag stellen","body":"Beantragen Sie den Kurs beim BAMF oder direkt beim Träger. Bei Berechtigung erhalten Sie eine Berechtigung, die der Träger braucht."},{"title":"Mit der Prüfung abschließen","body":"Der Kurs endet mit einem Sprachtest (DTZ) und dem Orientierungstest. Beide bestanden, erhalten Sie ein Zertifikat, das bei späteren Aufenthaltsschritten hilft."}]'::jsonb,
   '[{"label":"BAMF — Integrationskurse","url":"https://www.bamf.de/DE/Themen/Integration/ZugewanderteTeilnehmende/Integrationskurse/integrationskurse_node.html"}]'::jsonb,
   'published', null, '8970e05f-a138-493c-a622-a21111329a94')
on conflict (id) do nothing;
