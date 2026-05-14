
-- Fix security definer views by setting security_invoker
ALTER VIEW public.bike_models_public SET (security_invoker = true);
ALTER VIEW public.parts_public SET (security_invoker = true);
ALTER VIEW public.bike_model_parts_public SET (security_invoker = true);
