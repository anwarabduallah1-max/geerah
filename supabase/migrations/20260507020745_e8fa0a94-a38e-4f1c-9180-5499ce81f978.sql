
DROP FUNCTION IF EXISTS public.check_admin_status(uuid);

CREATE FUNCTION public.check_admin_status(p_candidate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
  _admin_exists boolean;
BEGIN
  SELECT COUNT(*) INTO _count FROM admin_approvals WHERE candidate_id = p_candidate_id;
  SELECT EXISTS(SELECT 1 FROM profiles WHERE is_admin = true) INTO _admin_exists;

  IF _count >= 5 AND NOT _admin_exists THEN
    UPDATE profiles SET is_admin = true WHERE user_id = p_candidate_id;
    RETURN jsonb_build_object('promoted', true, 'pending', false, 'count', _count);
  END IF;

  IF _count >= 5 AND _admin_exists THEN
    RETURN jsonb_build_object('promoted', false, 'pending', true, 'count', _count);
  END IF;

  RETURN jsonb_build_object('promoted', false, 'pending', false, 'count', _count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_candidate(p_candidate_id uuid, p_approve boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  SELECT is_admin INTO _is_admin FROM profiles WHERE user_id = auth.uid();
  IF NOT COALESCE(_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  IF p_approve THEN
    UPDATE profiles SET is_admin = true WHERE user_id = p_candidate_id;
    RETURN jsonb_build_object('success', true, 'action', 'approved');
  ELSE
    DELETE FROM admin_approvals WHERE candidate_id = p_candidate_id;
    RETURN jsonb_build_object('success', true, 'action', 'rejected');
  END IF;
END;
$$;
