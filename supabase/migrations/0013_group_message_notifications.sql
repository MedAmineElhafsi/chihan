-- 0013_group_message_notifications.sql — notify members on group chat

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('message', 'group_message', 'like', 'comment'));
