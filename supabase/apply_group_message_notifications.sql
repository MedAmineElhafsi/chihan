-- Allow group chat notifications (type = group_message).
-- Paste into Supabase SQL Editor and Run.

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('message', 'group_message', 'like', 'comment'));
