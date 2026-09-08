-- Migration 00011: Blocked Warning — warn users after admin unblock

-- 1. Add blocked_warning column to profiles
--    When an admin unblocks a user, this field is set to a warning message.
--    The user sees the warning on their dashboard and can dismiss it (clears the field).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS blocked_warning TEXT DEFAULT NULL;

-- 2. Allow users to clear their own blocked_warning (dismiss action)
--    The existing profiles_update policy already allows users to update their own profile,
--    so no new RLS policy is needed. Users can set blocked_warning = NULL to dismiss.
