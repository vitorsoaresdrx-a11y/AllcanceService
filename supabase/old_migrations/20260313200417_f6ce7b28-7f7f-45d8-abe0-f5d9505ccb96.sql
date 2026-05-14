-- Allow any authenticated user to read profiles (only contains names/avatars, no sensitive data)
CREATE POLICY "Authenticated can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);