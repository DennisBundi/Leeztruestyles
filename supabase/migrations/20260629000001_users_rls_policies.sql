-- Allow authenticated users to upsert their own profile row.
-- The INSERT policy is required because upsert (INSERT ON CONFLICT DO UPDATE)
-- evaluates the INSERT WITH CHECK even when the operation results in an UPDATE.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND policyname = 'Users can insert own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can insert own profile"
      ON public.users FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id);
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can update own profile"
      ON public.users FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
    $policy$;
  END IF;
END $$;
