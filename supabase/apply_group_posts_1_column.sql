-- STEP 1/2 — run this alone first

alter table public.posts
  add column if not exists group_id uuid references public.community_groups (id) on delete cascade;

create index if not exists posts_group_idx
  on public.posts (group_id, created_at desc)
  where group_id is not null;
