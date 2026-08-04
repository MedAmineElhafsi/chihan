-- Profile gallery + ban flag.
alter table public.profiles
  add column if not exists photos text[] not null default '{}';

alter table public.profiles
  add column if not exists is_banned boolean not null default false;

create index if not exists profiles_is_banned_idx
  on public.profiles (is_banned)
  where is_banned = true;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

drop policy if exists "Profile photos are publicly readable" on storage.objects;
create policy "Profile photos are publicly readable" on storage.objects for select
  using (bucket_id = 'profile-photos');

drop policy if exists "Users upload profile photos to their folder" on storage.objects;
create policy "Users upload profile photos to their folder" on storage.objects for insert
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their profile photos" on storage.objects;
create policy "Users update their profile photos" on storage.objects for update
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their profile photos" on storage.objects;
create policy "Users delete their profile photos" on storage.objects for delete
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
