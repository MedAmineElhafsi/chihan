-- ============================================================================
-- 0031 — Nobody promotes themselves.
--
-- Three columns on a profile are decisions other people make about you:
--   is_admin    — who may moderate,
--   is_verified — who proved who they are (0023), which from now on also
--                 decides who may post jobs and housing and who may be a
--                 buddy,
--   is_banned   — who was removed.
--
-- 0007 guarded only is_admin, and only on update. But a member may insert,
-- update and delete their own profile row, so any member could verify
-- themselves, lift their own ban, or delete their profile and insert it
-- again with is_admin = true.
--
-- This trigger now guards all three, on insert as well as update. An
-- administrator may still set them for anyone, and the SQL editor and the
-- service role (where auth.uid() is null) may too — that is how the first
-- administrator is made, and how decide_verification works.
-- ============================================================================

create or replace function public.protect_profile_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_admin := false;
    new.is_verified := false;
    new.is_banned := false;
  else
    new.is_admin := old.is_admin;
    new.is_verified := old.is_verified;
    new.is_banned := old.is_banned;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin on public.profiles;
create trigger profiles_protect_admin
  before insert or update on public.profiles
  for each row execute function public.protect_profile_admin();

-- Read the verified flag from policies and functions without tripping the
-- profile's own row-level security (a private profile is still verified).
create or replace function public.is_verified(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_verified and not is_banned from public.profiles where user_id = uid),
    false
  );
$$;

revoke all on function public.is_verified(uuid) from public;
grant execute on function public.is_verified(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Put the badge back where it belongs.
--
-- Until now the profile page wrote is_verified from the Premium entitlement,
-- and while billing is switched off everyone is "Premium" — so every member
-- who opened their own profile page was marked verified without a document
-- ever being checked. The app no longer does that (lib/view-actions.ts), and
-- the trigger above would stop it anyway. This takes the badge away from
-- anyone who has no approved verification request. Nothing else changes, and
-- an approved request still verifies as before.
-- ----------------------------------------------------------------------------
update public.profiles p
   set is_verified = false
 where p.is_verified
   and not exists (
     select 1
       from public.verification_requests v
      where v.user_id = p.user_id
        and v.status = 'approved'
   );
