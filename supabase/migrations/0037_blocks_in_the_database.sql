-- ============================================================================
-- 0037 — blocking somebody actually stops them.
--
-- Until this file, `user_blocks` was consulted in `lib/chat-actions.ts` and
-- nowhere else. PostgREST is a public endpoint and the anon key ships inside
-- every page, so a blocked member could POST straight to /rest/v1/messages
-- and the insert policy from 0004 would allow it: all that policy asks is
-- whether they are in the conversation. The block was a courtesy that a
-- browser's dev tools undid in a minute.
--
-- That is a worse failure here than it would be in most products. The people
-- most likely to block somebody on Cîhan are the ones being harassed, and
-- they were being told they were safe when they were not.
--
-- The rule, matching what the server actions already do: a block in either
-- direction closes the conversation for both of them. The person who blocked
-- does not get to keep talking at somebody who cannot answer.
--
-- Group messages are deliberately NOT included. A group is a room with other
-- people in it, and if one member's block stopped another member posting,
-- every member would hold a mute button over every other — one tap, and
-- somebody is silenced in a room neither of them owns. Blocking inside a
-- group is about what you are shown, not about what others may say, and it
-- belongs in the interface. That half landed just after this file: the group
-- chat loader, the group board loader and the Realtime handler all drop
-- hidden senders now, and notifications already did. No SQL changed for it,
-- which is the point — it is a question of what you are shown, not of what
-- the database permits.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The question a policy needs to ask.
--
-- It takes only the conversation, never a pair of user ids, and answers about
-- `auth.uid()` alone. A two-argument blocked_between(a, b) would have been
-- tidier to read and would also have let anybody holding the anon key ask
-- whether any two members of Cîhan have blocked each other — which is nobody
-- else's business, and precisely the kind of thing `user_blocks`'s own select
-- policy is careful about.
--
-- security definer because the caller can only see their own block rows, and
-- the question is about somebody else's.
-- ----------------------------------------------------------------------------
create or replace function public.blocked_in_conversation(conv uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1
      from conversation_participants cp
      join user_blocks b
        on (b.blocker_id = cp.user_id and b.blocked_id = auth.uid())
        or (b.blocker_id = auth.uid() and b.blocked_id = cp.user_id)
     where cp.conversation_id = conv
       and cp.user_id <> auth.uid()
  );
$fn$;

revoke all on function public.blocked_in_conversation(uuid) from public;
grant execute on function public.blocked_in_conversation(uuid)
  to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. The insert policy from 0004, with the block added.
--
-- Everything else about it is unchanged: you sign your own messages, and only
-- into a conversation you belong to.
-- ----------------------------------------------------------------------------
drop policy if exists "Send messages to my conversations" on public.messages;
create policy "Send messages to my conversations" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id, auth.uid())
    and not public.blocked_in_conversation(conversation_id)
  );

-- ----------------------------------------------------------------------------
-- 3. The door, as well as the room.
--
-- create_direct_conversation() is security definer, so it wrote its two
-- participant rows without any policy being consulted. Blocking the messages
-- but not the conversation would have left a blocked member able to open an
-- empty thread in somebody's inbox, over and over, which is a way of
-- contacting them.
--
-- `startConversation` in lib/chat-actions.ts already refuses on a block
-- before it ever gets here, for both sides, so this only closes the path
-- around it.
-- ----------------------------------------------------------------------------
create or replace function public.create_direct_conversation(other uuid)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  conv uuid;
  me uuid := auth.uid();
begin
  if me is null or other is null or me = other then
    raise exception 'invalid conversation';
  end if;

  if exists (
    select 1 from user_blocks
     where (blocker_id = me and blocked_id = other)
        or (blocker_id = other and blocked_id = me)
  ) then
    raise exception 'blocked';
  end if;

  select public.find_direct_conversation(other) into conv;
  if conv is not null then
    return conv;
  end if;

  insert into public.conversations default values returning id into conv;
  insert into public.conversation_participants (conversation_id, user_id)
    values (conv, me), (conv, other);
  return conv;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- 4. Reading is not sending.
--
-- No select policy changes here, on purpose. A block stops the conversation
-- going any further; it does not reach back and delete what was already
-- said. Somebody being harassed may well need that record.
-- ----------------------------------------------------------------------------
