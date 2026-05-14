
-- Allow anonymous users to SELECT parts and bike_models for public product page
CREATE POLICY "Anyone can read parts"
ON public.parts
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can read bike_models"
ON public.bike_models
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read bike_model_parts for public product page
CREATE POLICY "Anyone can read bike_model_parts"
ON public.bike_model_parts
FOR SELECT
TO anon
USING (true);
