
CREATE OR REPLACE FUNCTION public.admin_list_profiles(_only_pending boolean DEFAULT false, _limit integer DEFAULT 200)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  IF _only_pending THEN
    RETURN QUERY SELECT * FROM public.profiles WHERE is_admin = false ORDER BY trust_score DESC LIMIT _limit;
  ELSE
    RETURN QUERY SELECT * FROM public.profiles ORDER BY trust_score DESC LIMIT _limit;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_profiles(boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles(boolean, integer) TO authenticated;
