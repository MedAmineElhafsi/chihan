-- 0014_group_posts.sql — group-scoped posts (no view rewrite)

alter table public.posts
  add column if not exists group_id uuid references public.community_groups (id) on delete cascade;

create index if not exists posts_group_idx
  on public.posts (group_id, created_at desc)
  where group_id is not null;

drop policy if exists "Posts are viewable by everyone" on public.posts;
drop policy if exists "Posts readable public or members" on public.posts;
create policy "Posts readable public or members" on public.posts for select
  using (
    group_id is null
    or public.is_group_member(group_id, auth.uid())
  );

drop policy if exists "Users can create their own posts" on public.posts;
drop policy if exists "Users create own posts or group posts" on public.posts;
create policy "Users create own posts or group posts" on public.posts for insert
  with check (
    auth.uid() = author_id
    and (
      group_id is null
      or public.is_group_member(group_id, auth.uid())
    )
  );

drop policy if exists "Users can delete their own posts" on public.posts;
drop policy if exists "Authors or group admins delete posts" on public.posts;
create policy "Authors or group admins delete posts" on public.posts for delete
  using (
    auth.uid() = author_id
    or (
      group_id is not null
      and exists (
        select 1 from public.group_members gm
        where gm.group_id = posts.group_id
          and gm.user_id = auth.uid()
          and gm.role in ('owner', 'admin')
      )
    )
  );
