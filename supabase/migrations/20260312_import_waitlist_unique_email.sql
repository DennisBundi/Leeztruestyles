-- Add UNIQUE constraint on email to prevent duplicate waitlist submissions.
-- The POST route handles error code 23505 (unique_violation) with a 409 response.
alter table public.import_waitlist
  add constraint import_waitlist_email_unique unique (email);

-- Note: RLS is enabled on import_waitlist with only an INSERT policy for anon/authenticated.
-- SELECT, UPDATE, and DELETE are intentionally blocked for anon/authenticated roles
-- (default deny when RLS is on with no matching policy).
-- All read/write access beyond INSERT is done exclusively via the service-role key in backend API routes.
